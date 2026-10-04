/**
 * Tick semanal del modelo SCM (especificación §6.3). Por zona y categoría calcula demanda, ruta,
 * lead time, frescura y merma, fill rate, disponibilidad (OSA), ventas, inventario y costos.
 * Los totales del tick quedan en ctx.metrics y kpis.ts los agrega por época.
 */
import { normalInv, normalLoss, clamp, type TickContext } from "@mt4035/sim-core";
import { activeDcs, assignDc, densityDemandMult, route, zoneGeometry, type ActiveDc } from "./network.ts";
import { emptyShocks } from "./scenario.ts";
import { CATEGORIES, perCat, type Category, type Params, type ScmState } from "./types.ts";

type Ctx = TickContext<ScmState, Params>;

/** Multiplicador de CV por sistema de información, pronóstico, política y surtido. */
export function effectiveCv(s: ScmState, p: Params): number {
  const d = s.dec;
  const info = 1 + (p.info.cvMult[d.info] - 1) * s.infoMaturity;
  const fc = p.info.forecast;
  const pol = p.info.policy[d.policy];
  const tanpinShare = d.policy === "tanpin" ? p.info.training.tanpinBenefitShare[d.training] : 1;
  const policyMult = 1 - (1 - pol.cvMult) * tanpinShare;
  const amp = p.markets.seasonality[s.market.seasonality];
  const seasonPenalty = 1 + amp * (fc.seasonPenalty[d.forecast] + pol.seasonPenalty);
  const skuRatio = d.assortment.skus / p.assortment.refSkus;
  const assort = Math.sqrt(skuRatio) * (d.assortment.local ? p.assortment.localCvMult : 1);
  return p.markets.volatility[s.market.volatility] * info * fc.cvMult[d.forecast] * policyMult * seasonPenalty * assort * s.shocks.cvMult;
}

/** Bullwhip (Chen et al., 2000) atenuado por POS compartido. */
export function bullwhip(ltDays: number, s: ScmState, p: Params): number {
  const w = p.info.forecast.window[s.dec.forecast];
  const raw = 1 + (2 * ltDays) / w + (2 * ltDays * ltDays) / (w * w);
  return 1 + (raw - 1) * p.info.sharing.bwrMult[s.dec.sharing];
}

export function supplierLt(c: Category, s: ScmState, p: Params): number {
  const r = p.regions[s.region];
  const dedicated = (c === "fresh" || c === "chilled") && s.dec.dedicated[c] ? p.supplier.dedicatedLtMult : 1;
  return r.supplierLtDays[c] * p.supplier.collabLtMult[s.dec.collaboration] * dedicated;
}

export function demandMix(s: ScmState, p: Params): Record<Category, number> {
  const mix = { ...p.regions[s.region].mix };
  const shift = Math.min(s.mixShift, mix.ambient * 0.5);
  mix.fresh += shift;
  mix.ambient -= shift;
  return mix;
}

const KEYS = [
  "stores", "demand", "sold", "lost", "subst", "waste", "excursion", "received", "invIni", "invFin",
  "revenue", "cogs", "gm", "wasteCost", "transport", "handling", "dcFixed", "receivingCost", "carrying", "itOpex",
  "deliveries", "otifDeliveries", "invValue", "dcInvValue", "ltWeighted", "ltSdWeighted", "bwrWeighted", "ofrProduct",
  "freshRouteHoursW", "freshDeliveries", "freshRouteHours", "trucksPerStoreDay", "dcDistKmW", "dcDeliveries", "dcRoutes", "trustW", "dcUtilMax", "deltaDcMeanFresh", "ebitda",
] as const;

export function scmTick(ctx: Ctx): void {
  const s = ctx.state;
  const p = ctx.params;
  const r = p.regions[s.region];
  const d = s.dec;
  const m = ctx.metrics;
  for (const k of KEYS) m[k] = 0;
  for (const c of CATEGORIES) {
    m[`demand_${c}`] = 0;
    m[`sold_${c}`] = 0;
    m[`waste_${c}`] = 0;
    m[`received_${c}`] = 0;
  }
  m.ofrProduct = 1;

  const prev = s.flags;
  s.flags = { r01: false, r02: perCat(() => s.zones.map(() => false)), r04: false, r07: false };
  const sh = s.shocks;

  // Mercado
  const years = s.week / 52;
  const growth = (1 + p.markets.growth[s.market.growth]) ** years;
  const amp = p.markets.seasonality[s.market.seasonality];
  const season = Math.sin((2 * Math.PI * ((s.week % 52) - 13)) / 52); // máximo en T3
  const fuel = (1 + p.markets.fuelTrendPerYear[s.market.fuel]) ** years * sh.fuelMult;
  const mix = demandMix(s, p);
  const cv = effectiveCv(s, p);
  const cvWeek = cv / Math.sqrt(7);

  // Proveedores
  const rel = s.market.supplierReliability;
  const ltSup = perCat((c) => supplierLt(c, s, p));
  const bwr = perCat((c) => bullwhip(ltSup[c], s, p));
  const frProv = perCat((c) =>
    clamp(p.supplier.frBase[rel] + r.supplierFrAdj - p.supplier.bwrBeta * (bwr[c] - 1) + p.supplier.collabFrGain[d.collaboration], p.supplier.frFloor, 0.999) * sh.supplierFrMult[c],
  );
  const ltCv = p.supplier.ltCv[rel] * p.supplier.collabLtCvMult[d.collaboration];

  // Paradas y vehículos
  const stopH = p.stop.baseHours * p.stop.factor[`${d.window}_${d.receiving}` as keyof typeof p.stop.factor] * sh.stopMult;
  const offpeak = d.window === "offpeak";
  const capCases = p.vehicle.capacityCases[d.vehicle.type];
  const ownKm = r.kmCost * p.vehicle.kmCostMult[d.vehicle.type] + (d.vehicle.telemetry ? p.vehicle.telemetryKmCost : 0);
  const ownHour = r.hourCost * p.fleet.costMult[d.fleet];
  const cancel = sh.capacityCut * p.fleet.shortageHit[d.fleet];

  // Red: CD activos, asignación por zona y utilización (primera pasada)
  const dcs = activeDcs(s, s.epoch);
  const assign = s.zones.map((z) => (z.stores > 0 ? assignDc(z, dcs, s.zones, p, r.sideKm) : null));
  const geo = s.zones.map((z) => zoneGeometry(z, p, r.sideKm));
  const demandRate = s.zones.map((z, zi) =>
    perCat((c) => {
      if (z.stores <= 0) return 0;
      const assortMult = (d.assortment.skus / p.assortment.refSkus) ** p.assortment.demandElasticity * (d.assortment.local && d.info !== "basic" ? 1 + p.assortment.localDemandGain : 1);
      return (
        r.visitsPerDay * r.unitsPerVisit * mix[c] * growth * (1 + amp * p.categories[c].seasonMult * season) * z.trust * z.competition *
        densityDemandMult(geo[zi]!.rho, p) * assortMult * sh.demandMult[c]
      );
    }),
  );
  const usesDc = (zi: number, c: Category) => d.flows[c] === "dc" && assign[zi] !== null;
  const dcCases = new Map<string, number>();
  s.zones.forEach((z, zi) => {
    for (const c of CATEGORIES) {
      if (!usesDc(zi, c)) continue;
      const id = assign[zi]!.dc.dc.id;
      dcCases.set(id, (dcCases.get(id) ?? 0) + (demandRate[zi]![c] * z.stores) / p.categories[c].unitsPerCase);
    }
  });
  const dcUtil = new Map<string, number>();
  for (const a of dcs) dcUtil.set(a.dc.id, (dcCases.get(a.dc.id) ?? 0) / p.dc.capacityCasesDay[a.size]);
  m.dcUtilMax = Math.max(0, ...dcUtil.values());

  // Costos fijos de CD
  for (const a of dcs) m.dcFixed! += p.dc.fixedWeekly[a.size] * p.dc.typeMult[a.type] * r.realEstate;

  const freshDelta: number[] = [];
  const catInFull = perCat(() => ({ num: 0, den: 0 }));
  let maxDeliveriesPerStoreDay = 0;

  // Segunda pasada: zona × categoría
  s.zones.forEach((z, zi) => {
    if (z.stores <= 0) return;
    const n = z.stores;
    const g = geo[zi]!;
    const a = assign[zi];
    const closed = sh.closedZones.includes(zi) ? sh.closedShare : 0;
    const traffic = ctx.stream("traffic", ctx.tick, zi);
    const congMean = r.congestionMean * (offpeak ? p.stop.offpeakCongestionMult : 1) * sh.congestionMult;
    const congSd = r.congestionSd * (offpeak ? p.stop.offpeakCongestionMult : 1) * sh.congestionMult;
    const congestion = clamp(congMean + congSd * traffic.normal() * ctx.noise, 0, 0.85);
    const speed = r.speedKmh * (1 - congestion);
    let zoneDemand = 0;
    let zoneSold = 0;
    let zoneDeliveriesPerStoreWeek = 0;

    for (const c of CATEGORIES) {
      const cat = p.categories[c];
      const mu = demandRate[zi]![c];
      if (mu <= 0) continue;
      const viaDc = usesDc(zi, c);
      const dcA: ActiveDc | null = viaDc ? a!.dc : null;
      const type = dcA?.type;
      const nSup = r.suppliers[c];
      const consolidated = viaDc && (type === "stocking" || (type === "combined" && d.consolidation === "combined"));
      const dsdFreq = p.supplier.dsdFreqPerWeek[c];
      const perStoreWeek = viaDc ? d.freq[c] * (consolidated ? 1 : nSup) : dsdFreq * nSup;
      const reviewDays = viaDc ? 7 / d.freq[c] : 7 / dsdFreq;
      const dropCases = (mu * reviewDays) / cat.unitsPerCase / (consolidated ? 1 : nSup);
      const util = viaDc ? dcUtil.get(dcA!.dc.id) ?? 0 : 0;
      const capFactor = viaDc ? Math.min(1, 1 / Math.max(util, 1e-9)) : 1;
      const highUtil = viaDc && util > p.dc.highUtil;
      if (highUtil) s.flags.r07 = true;

      const rt = route({
        maxStops: cat.maxStopsPerRoute,
        distKm: viaDc ? a!.distKm : r.supplierDistKm * p.circuity,
        deltaKm: viaDc ? g.deltaKm : 0.7 / Math.sqrt(g.rho * r.dsdSharedDensity),
        dropCases,
        capacityCases: viaDc ? capCases : p.vehicle.capacityCases.mono,
        speedKmh: speed,
        stopHours: stopH,
        shiftHours: p.shiftHours,
      });
      const deliveriesWeek = n * perStoreWeek;
      const routesWeek = deliveriesWeek / rt.stops;
      const kmCost = viaDc ? ownKm : r.kmCost;
      const hourCost = viaDc ? ownHour : r.hourCost;
      const linehaulPremium = rt.relay ? p.vehicle.relayTeamPremium * 2 * rt.oneWayHours * hourCost : 0;
      const costPerRoute = kmCost * rt.km * fuel + hourCost * rt.routeHours + linehaulPremium;
      // DSD: el proveedor cobra una tarifa por entrega incluida en el precio (rutas compartidas con otros clientes).
      m.transport! += viaDc ? routesWeek * costPerRoute : deliveriesWeek * r.dsdFeePerDelivery * fuel;
      m.deliveries! += deliveriesWeek;
      zoneDeliveriesPerStoreWeek += perStoreWeek;
      if (viaDc) {
        m.dcDistKmW! += a!.distKm * deliveriesWeek;
        m.dcDeliveries! += deliveriesWeek;
        m.dcRoutes! += routesWeek;
      }
      if (c === "fresh") {
        m.freshRouteHoursW! += (rt.oneWayHours + rt.localHours) * deliveriesWeek;
        m.freshDeliveries! += deliveriesWeek;
        if (viaDc) freshDelta.push(g.deltaKm);
      }

      // Lead time y edad del producto
      const dwell = viaDc ? p.dc.dwellDays[type!] * (highUtil ? 1 + 2 * (util - p.dc.highUtil) : 1) : 0;
      const transitDays = rt.avgInVehicleHours / 24;
      const leadDays = viaDc && type === "stocking" ? dwell + transitDays : ltSup[c] + dwell + transitDays;
      const ageDays = viaDc && type === "stocking" ? ltSup[c] + p.dc.stockingCycleDays / 2 + d.dcSafetyDays + dwell + transitDays : ltSup[c] + dwell + transitDays;

      // Inventario de seguridad y fill rate
      const z95 = normalInv(d.csl[c]);
      const sigma = cv * mu * Math.sqrt(leadDays + reviewDays);
      const ss = z95 * sigma;
      const fr = clamp(1 - (sigma * normalLoss(z95)) / (mu * reviewDays), 0, 1);

      // Frescura y merma
      const shelfLife = c === "fresh" ? r.freshShelfLifeDays : (cat.shelfLifeDays as number);
      const remaining = shelfLife - ageDays;
      const presentation = cat.presentationDays * r.presentationMult;
      const coverage = reviewDays + ss / mu + presentation;
      let waste = cat.wasteBase;
      if (cat.perishable) {
        waste = remaining <= 0.05 ? p.freshness.wasteCap : cat.wasteBase + p.freshness.wasteSlope * Math.max(0, coverage - remaining) / coverage;
      }
      if (d.retirement === "discount") waste *= p.freshness.discountWasteMult;
      waste = Math.min(waste, p.freshness.wasteCap);

      // Excursión de temperatura (pérdida en ruta)
      let exc = 0;
      if (c !== "ambient") {
        const ex = p.excursion;
        const veh = viaDc ? ex.vehicle[d.vehicle.type] * (d.vehicle.telemetry ? ex.telemetry : 1) * ex.maintenance[d.maintenance] : ex.vehicle.mono * ex.maintenance.corrective;
        exc = ex.p0 * (rt.avgInVehicleHours / ex.refHours) ** ex.alpha * veh * (prev.r01 ? ex.longRouteMult : 1);
        if (c === "fresh" && sh.excursionZone === zi) exc += sh.excursionLoss;
        exc = Math.min(exc, 0.9);
      }

      // Abasto del proveedor y amortiguador del CD
      // El CD con inventario amortigua con su stock de ciclo más los días de seguridad (R-06, R-11).
      const buffer = viaDc && type === "stocking" ? Math.min(1, (p.dc.stockingCycleDays / 2 + d.dcSafetyDays) / Math.max(ltSup[c], 0.5)) : 0;
      const shortfall = (1 - frProv[c]) * (1 - buffer);
      const inFull = (1 - shortfall) * capFactor * (viaDc ? 1 - p.dc.pickErrorRate : 1) * (1 - cancel);
      const supplyFactor = 1 - shortfall * p.supplier.shortfallToOos - (1 - capFactor) * 0.5 - cancel * 0.5;
      const recvErr = p.receiving.errRate[d.receiving] + (prev.r04 ? p.receiving.overloadErrAdd : 0);
      const r02 = prev.r02[c][zi] ? p.inventory.r02OsaMult : 1;
      const osa = clamp(fr * supplyFactor * (1 - p.inventory.wasteOsaImpact * waste) * (1 - recvErr) * (1 - exc) * (1 - closed) * r02, 0, 1);

      // Puntualidad
      const late = clamp(
        p.late.base + p.late.congestionK * congSd * Math.sqrt(rt.routeHours) + (viaDc ? p.fleet.lateAdd[d.fleet] : 0.01) + (highUtil ? p.late.utilPenalty : 0),
        0,
        0.5,
      );
      m.otifDeliveries! += deliveriesWeek * (1 - late) * inFull;
      catInFull[c].num += inFull * deliveriesWeek;
      catInFull[c].den += deliveriesWeek;

      // Ventas
      const noise = ctx.stream("demand", ctx.tick, zi * 10 + CATEGORIES.indexOf(c)).normal() * ctx.noise;
      const demand = mu * 7 * n * Math.max(0, 1 + cvWeek * noise);
      const sold = demand * osa;
      const unmet = demand - sold;
      const lost = unmet * p.inventory.unmetLostShare;
      const subst = unmet - lost;
      const wasteUnits = waste * demand;
      const excUnits = exc * demand;

      // Inventario de tienda (conservación por construcción)
      const target = n * (ss + (mu * reviewDays) / 2 + mu * presentation);
      const stored = s.inventory[c][zi]!;
      const invIni = stored < 0 ? target : stored;
      const received = Math.max(0, sold + wasteUnits + excUnits + target - invIni);
      const invFin = invIni + received - sold - wasteUnits - excUnits;
      s.inventory[c][zi] = invFin;
      s.lastWaste[c][zi] = received > 0 ? (wasteUnits + excUnits) / received : 0;

      // Dinero
      const unitCost = cat.price * (1 - cat.margin);
      const margin = cat.margin - (d.retirement === "discount" && c === "fresh" ? p.freshness.discountMarginCut : 0);
      m.revenue! += (sold + subst) * cat.price;
      m.cogs! += (sold + subst) * unitCost;
      m.gm! += sold * cat.price * margin + subst * cat.price * cat.margin * p.inventory.substituteMarginMult;
      m.wasteCost! += (wasteUnits + excUnits) * unitCost;
      if (viaDc) {
        m.handling! += (received / cat.unitsPerCase) * p.dc.handlingPerCase[type!] * (r.wage / 16);
        if (type === "stocking") {
          const dcUnits = (p.dc.stockingCycleDays / 2 + d.dcSafetyDays) * mu * n;
          m.dcInvValue! += dcUnits * unitCost;
        }
      }
      m.invValue! += invFin * unitCost;
      m.ltWeighted! += leadDays * demand;
      m.ltSdWeighted! += leadDays * ltCv * demand;
      m.bwrWeighted! += bwr[c] * demand;

      m.demand! += demand;
      m.sold! += sold;
      m.lost! += lost;
      m.subst! += subst;
      m.waste! += wasteUnits;
      m.excursion! += excUnits;
      m.received! += received;
      m.invIni! += invIni;
      m.invFin! += invFin;
      m[`demand_${c}`]! += demand;
      m[`sold_${c}`]! += sold;
      m[`waste_${c}`]! += wasteUnits + excUnits;
      m[`received_${c}`]! += received;
      zoneDemand += demand;
      zoneSold += sold;

      ctx.trace(`fr_${c}`, fr);
      ctx.trace(`waste_${c}`, waste);
      ctx.trace(`osa_${c}`, osa);
      ctx.trace(`stops_${c}`, rt.stops);
      ctx.trace(`routeHours_${c}`, rt.routeHours);
      ctx.trace(`remainingLife_${c}`, remaining);
    }

    // Entregas directas no consolidables (revistas, tabaco)
    const other = r.otherDirectPerDay * 7 * n;
    m.deliveries! += other;
    m.otifDeliveries! += other * 0.97;
    m.transport! += other * 20 * (r.kmCost / 1.2) * fuel;
    zoneDeliveriesPerStoreWeek += r.otherDirectPerDay * 7;

    // Recepción en tienda
    const perStoreDay = zoneDeliveriesPerStoreWeek / 7;
    maxDeliveriesPerStoreDay = Math.max(maxDeliveriesPerStoreDay, perStoreDay);
    m.receivingCost! += n * zoneDeliveriesPerStoreWeek * p.receiving.hoursPerDelivery * r.wage * (d.receiving === "scan" ? p.receiving.scanMult : 1) * (prev.r04 ? p.receiving.overloadCostMult : 1);
    m.stores! += n;
    m.trustW! += z.trust * n;

    // Confianza de la zona (R-03 la reduce; aquí solo el conteo y la recuperación lenta)
    const zoneOsa = zoneDemand > 0 ? zoneSold / zoneDemand : 1;
    z.lowOsaWeeks = zoneOsa < p.trust.lowOsa ? z.lowOsaWeeks + 1 : 0;
    if (zoneOsa >= p.trust.recoverOsa) z.trust = Math.min(1, z.trust + p.trust.recover);
  });

  // Costos de TI y capacitación
  const it = p.info;
  m.itOpex = m.stores! * (it.opexPerStoreWeek[d.info] + it.sharing.opexPerStoreWeek[d.sharing] + it.forecast.opexPerStoreWeek[d.forecast] + it.training.opexPerStoreWeek[d.training]);
  m.carrying = (m.invValue! + m.dcInvValue!) * (p.inventory.carryRateYear / 52);
  m.freshRouteHours = m.freshDeliveries! > 0 ? m.freshRouteHoursW! / m.freshDeliveries! : 0;
  m.trucksPerStoreDay = m.stores! > 0 ? m.deliveries! / 7 / m.stores! : 0;
  m.maxDeliveriesPerStoreDay = maxDeliveriesPerStoreDay;
  m.deltaDcMeanFresh = freshDelta.length ? freshDelta.reduce((x, y) => x + y, 0) / freshDelta.length : 0;
  m.ofrProduct = CATEGORIES.reduce((acc, c) => acc * (catInFull[c].den > 0 ? catInFull[c].num / catInFull[c].den : 1), 1);
  m.ebitda = m.gm! - m.wasteCost! - m.transport! - m.handling! - m.dcFixed! - m.receivingCost! - m.carrying! - m.itOpex!;

  s.week += 1;
  s.shocks = emptyShocks();
}
