/**
 * Tick diario del modelo de última milla (especificación §6.3). Tres pasadas:
 *   1. Por zona: demanda, reparto (recoger en tienda / lockers / domicilio), asignación de nodo
 *      según D-10 con capacidades, y rutas (aproximación continua).
 *   2. Flota: capacidad por mezcla (propia, 3PL, crowdsourced), contratos de pico, faltantes.
 *   3. Por zona: puntualidad, primer intento, cadena de frío, excepciones, costos, CSAT y confianza.
 */
import { clamp, normalCdf, type TickContext } from "@mt4035/sim-core";
import { levelShares, monthOf, peakOn, placeNodes, route, speedScore, weekdayOf, type RouteResult } from "./network.ts";
import { emptyShocks } from "./scenario.ts";
import { LEVELS, type LmState, type NodeKind, type Params } from "./types.ts";

type Ctx = TickContext<LmState, Params>;

export const dataMaturity = (s: LmState, p: Params) => p.data.maturity[s.dec.data];

/**
 * Eficiencia del ruteo: con IA y datos básicos solo se obtiene una parte (~30%) del beneficio que la
 * IA logra sobre el ruteo manual (R-08); con telemetría sin tráfico, 70%.
 */
export function routingFactors(s: LmState, p: Params): { kmMult: number; sigmaMult: number; etaGain: number } {
  const r = p.routing[s.dec.routing];
  if (s.dec.routing !== "ai" || s.dec.data === "full") return r;
  const share = s.dec.data === "basic" ? p.routing.aiBasicDataShare : 0.7;
  const base = p.routing.manual;
  return {
    kmMult: base.kmMult + (r.kmMult - base.kmMult) * share,
    sigmaMult: base.sigmaMult + (r.sigmaMult - base.sigmaMult) * share,
    etaGain: base.etaGain + (r.etaGain - base.etaGain) * share,
  };
}

/** Familiaridad del chofer con su zona según la frecuencia de re-zonificación (R-07). */
export function familiarity(s: LmState, p: Params): number {
  const d = s.dec;
  if (d.rezoning === "daily") return dataMaturity(s, p) >= 1 ? p.rezoning.dailyMature : p.rezoning.daily;
  return p.rezoning[d.rezoning];
}

/** Multiplicador de km por diseño de zonas: forma de U alrededor del número óptimo de zonas (D-40, D-41). */
export function zoningKmMult(s: LmState, p: Params, dailyOrders: number): number {
  const z = p.zoning;
  const kStar = Math.max(3, Math.sqrt(dailyOrders / z.kOptimumPerOrders));
  const curve = 1 + z.kCurve * Math.log(s.dec.zones / kStar) ** 2;
  const method = s.dec.zoning === "dynamic" && dataMaturity(s, p) < 1 ? z.dynamicNoData : z[s.dec.zoning];
  return curve * method;
}

/** Ganancia de presencia en casa para una ventana de h horas (interpolación logarítmica entre las ventanas ofrecidas). */
export function windowPresenceGain(p: Params, hours: number): number {
  const pts = Object.values(p.windows)
    .map((w) => [w.hours, w.presenceGain] as const)
    .sort((a, b) => a[0] - b[0]);
  if (hours <= pts[0]![0]) return pts[0]![1];
  for (let i = 1; i < pts.length; i++) {
    const [h0, g0] = pts[i - 1]!;
    const [h1, g1] = pts[i]!;
    if (hours <= h1) return g0 + ((g1 - g0) * Math.log(hours / h0)) / Math.log(h1 / h0);
  }
  return pts[pts.length - 1]![1];
}

const NODE_ORDER: NodeKind[] = ["mfc", "dark", "store", "hub", "cd"];

interface Candidate {
  kind: NodeKind;
  /** Índice del nodo (MFC o dark store); −1 para tienda, hub y CD. */
  node: number;
  /** Costo de capital del inventario por pedido (duplicar inventario en tienda cuesta más). */
  capital?: number;
  cap: number;
  /** Capacidad que respeta el tope de horas de piso (solo tiendas). */
  softCap: number;
  cost: number;
  distKm: number;
  pick: number;
  inFull: number;
}

interface ZoneWork {
  zi: number;
  orders: number;
  carried: number;
  cancelled: number;
  rejected: number;
  bopis: number;
  lockerOrders: number;
  home: number;
  alloc: { kind: NodeKind; q: number; distKm: number; pick: number; inFull: number; capital: number; node: number }[];
  overflow: number;
  storeHours: number;
  storeCapHours: number;
  /** Pedidos surtidos en tienda / capacidad de picking de sus surtidores. */
  storeUtil: number;
  homeRoute: RouteResult;
  expressRoute: RouteResult;
  expressShare: number;
  lockerStops: number;
  localSpeed: number;
  vehicleKind: keyof Params["vehicles"];
  routes: number;
}

export function lmTick(ctx: Ctx): void {
  const s = ctx.state;
  const p = ctx.params;
  const d = s.dec;
  const t = p.territories[s.territory];
  const m = ctx.metrics;
  const sh = s.shocks;
  const dayOfMonth = ctx.tick;
  const month = monthOf(ctx.epoch);
  const weekday = weekdayOf(s.day);
  const prevFlags = s.flags;
  s.flags = { r01: false, r02: prevFlags.r02, r05: false, r06: false };

  // ---------- Demanda ----------
  const years = s.day / 365;
  const growth = (1 + p.markets.growth[s.market.growth]) ** years;
  const peak = peakOn(s, p, ctx.epoch, dayOfMonth);
  const quincena = p.quincena.days.includes(dayOfMonth + 1) ? p.quincena.mult : 1;
  const weekdayMult = p.weekdayMult[weekday]!;
  const spd = speedScore(d, p);
  // La holgura alarga la promesa que ve el cliente: se percibe más lenta (E-23).
  const spdPromised = spd * (1 - d.buffer);
  const shares = levelShares(d, p);
  const fastOffered = d.levels.express || d.levels.sameday;
  const demandService =
    (1 + p.markets.speedElasticity[s.market.speedSensitivity] * (spdPromised - 0.4)) *
    (1 + (fastOffered ? p.cutoff[d.cutoff].demand : 0)) *
    (1 - p.markets.bufferDemandLoss[s.market.speedSensitivity] * d.buffer) *
    Math.max(0.3, 1 - (p.markets.feeElasticity[s.market.feeSensitivity] * (d.fee.fee - p.feeBase)) / p.feeBase / 2) *
    (1 - 0.0015 * d.fee.freeThreshold);
  const codShare = t.cod * p.cod[d.cod];
  const codDemand = d.cod === "remove" ? 1 - t.cod * p.cod.demandLossShare : d.cod === "limit" ? 1 - t.cod * p.cod.demandLossShare * 0.3 : 1;
  const basket = t.basket * (1 + p.freeThresholdBasketGain * d.fee.freeThreshold);
  const freshShare = p.markets.freshShare[s.market.freshMix];
  const daysInMonth = ctx.ticks;

  const place = placeNodes(s, p, d);
  const vehicleKind = d.vehicle;
  const veh = p.vehicles[vehicleKind];
  const rf = routingFactors(s, p);
  const fam = familiarity(s, p);
  const pay = p.fleet.pay[d.pay];
  const win = p.windows[d.window];
  // Con holgura, la ventana que el cliente realmente debe esperar es más ancha: menos ganancia de presencia.
  const effHours = win.hours * (1 + 2 * d.buffer);
  const presenceGain = windowPresenceGain(p, effHours);
  const nLevels = LEVELS.filter((l) => d.levels[l]).length;
  const fragmentation = win.count ** p.windowFragmentationExp * (1 + 0.35 * Math.max(0, nLevels - 1)) * p.segmentation[d.segmentation];
  const batch = { "5": { cost: 1.04, cycle: -0.5 }, "15": { cost: 1.02, cycle: -0.3 }, "60": { cost: 1, cycle: 0 }, "240": { cost: 0.98, cycle: 1.5 } }[d.batching];
  const aiMature = d.assignment === "ai" && d.data !== "basic";
  const capUtil = d.assignment === "ai" ? 0.95 : p.highUtil;
  let cdLeft = d.sfd.active ? p.nodes.cd.capacity[d.sfd.capacity] * (1 - sh.capacityCut * 0) : 0;
  const cdCap = cdLeft;
  const typicalOrders = t.ordersPerDay * growth;
  // Capacidad restante de cada MFC y dark store (un nodo surte su zona y las vecinas).
  const mfcLeft = place.mfc.map(() => p.nodes.mfc.capacity);
  const darkLeft = place.dark.map(() => p.nodes.dark.capacity);
  const kmZoning = zoningKmMult(s, p, typicalOrders);

  // ---------- Pasada 1: zonas ----------
  const work: ZoneWork[] = [];
  for (const zp of t.zones) {
    const z = s.zones[zp.id]!;
    const noise = ctx.stream("demand", ctx.tick, zp.id).normal() * ctx.noise;
    let orders = t.ordersPerDay * zp.share * growth * (peak?.mult ?? 1) * quincena * weekdayMult * demandService * codDemand * z.trust * z.competition * sh.demandMult * Math.max(0, 1 + 0.08 * noise);
    let rejected = 0;
    if (d.slotting !== "none") {
      const cap = t.ordersPerDay * zp.share * growth * p.slotting[d.slotting] * 1.15;
      if (orders > cap) {
        rejected = orders - cap;
        orders = cap;
      }
    }
    // Parte de los pedidos atrasados se cancela cada día (el cliente se cansa de esperar).
    const cancelled = z.backlog * p.backlogCancel;
    const carried = z.backlog - cancelled;
    z.backlog = 0;
    const total = orders + carried;
    const storesHere = zp.stores;
    const bopis = d.bopis && storesHere > 0 ? total * p.bopisShare[zp.kind as keyof typeof p.bopisShare] : 0;
    const lockerCap = place.lockersByZone[zp.id]! * p.nodes.locker.ordersPerDay;
    const presenceBase = t.presence[zp.kind as keyof typeof t.presence];
    const lockerOrders = Math.min(lockerCap, (total - bopis) * p.lockerPref * Math.max(0, 1.2 - presenceBase));
    const home = Math.max(0, total - bopis - lockerOrders);
    const toDeliver = home + lockerOrders;

    // Candidatos de surtido para esta zona
    // Con cualquier porcentaje > 0 surte al menos una tienda de la zona.
    const sfsStores = storesHere > 0 && sh.storeDownZone !== zp.id ? Math.ceil(storesHere * d.sfs.share - 1e-9) : 0;
    const pickers = p.nodes.store.pickers[d.sfs.pickers];
    const storeFull = sfsStores * pickers * p.nodes.store.ordersPerPickerHour * p.operatingHours;
    const storeTope = sfsStores * d.sfsCap * p.nodes.store.staffHours * p.nodes.store.ordersPerPickerHour;
    const cands: Candidate[] = [];
    const mc = place.mfcCover.get(zp.id);
    if (mc) cands.push({ kind: "mfc", node: mc.node, cap: p.nodes.mfc.capacity, softCap: p.nodes.mfc.capacity * capUtil, cost: p.nodes.mfc.pickCost + 0.08 * mc.distKm, distKm: mc.distKm, pick: p.nodes.mfc.pickCost, inFull: p.nodes.mfc.inFull });
    const dc = place.darkCover.get(zp.id);
    if (dc) cands.push({ kind: "dark", node: dc.node, cap: p.nodes.dark.capacity, softCap: p.nodes.dark.capacity * capUtil, cost: p.nodes.dark.pickCost + 0.08 * dc.distKm, distKm: dc.distKm, pick: p.nodes.dark.pickCost, inFull: p.nodes.dark.inFull });
    if (sfsStores > 0) {
      const inFull = Math.min(0.99, p.nodes.store.inFull + (aiMature ? 0.03 : 0));
      cands.push({ kind: "store", node: -1, cap: storeFull, softCap: Math.min(storeTope, storeFull * capUtil), cost: p.nodes.store.pickCost + 0.08 * 3, distKm: 3, pick: p.nodes.store.pickCost, inFull });
    }
    if (d.sfd.active && place.hubs.has(zp.id)) cands.push({ kind: "hub", node: -1, cap: Infinity, softCap: Infinity, cost: p.nodes.cd.pickCost + p.nodes.hub.linehaulPerOrder + 0.08 * p.nodes.hub.localKm, distKm: p.nodes.hub.localKm, pick: p.nodes.cd.pickCost + p.nodes.hub.linehaulPerOrder, inFull: p.nodes.cd.inFull });
    if (d.sfd.active) cands.push({ kind: "cd", node: -1, cap: Infinity, softCap: Infinity, cost: p.nodes.cd.pickCost + 0.08 * zp.distCd, distKm: zp.distCd, pick: p.nodes.cd.pickCost, inFull: p.nodes.cd.inFull });

    // Asignación (D-10). Hub y CD comparten la capacidad de picking del CD.
    const alloc: ZoneWork["alloc"] = [];
    let remaining = toDeliver;
    let overflow = 0;
    let storeOrders = bopis; // el picking de recoger en tienda también usa a la tienda
    const take = (c: Candidate, q: number) => {
      if (q <= 0) return;
      alloc.push({ kind: c.kind, q, distKm: c.distKm, pick: c.pick, inFull: c.inFull, capital: p.nodes[c.kind === "hub" ? "cd" : c.kind].capitalPerOrder, node: c.node });
      if (c.kind === "store") storeOrders += q;
      if (c.kind === "cd" || c.kind === "hub") cdLeft -= q;
      if (c.kind === "mfc") mfcLeft[c.node]! -= q;
      if (c.kind === "dark") darkLeft[c.node]! -= q;
      remaining -= q;
    };
    const capOf = (c: Candidate, soft: boolean) => {
      const used = c.kind === "store" ? storeOrders : 0;
      if (c.kind === "cd" || c.kind === "hub") return Math.max(0, soft ? cdLeft - cdCap * (1 - capUtil) : cdLeft);
      if (c.kind === "mfc" || c.kind === "dark") {
        const left = (c.kind === "mfc" ? mfcLeft : darkLeft)[c.node]!;
        return Math.max(0, soft ? left - c.cap * (1 - capUtil) : left);
      }
      return Math.max(0, (soft ? c.softCap : c.cap) - used);
    };
    if (cands.length === 0) {
      overflow = remaining;
      remaining = 0;
    } else if (d.assignment === "nearest" || d.assignment === "lowest") {
      const c = d.assignment === "nearest" ? [...cands].sort((a, b) => NODE_ORDER.indexOf(a.kind) - NODE_ORDER.indexOf(b.kind))[0]! : [...cands].sort((a, b) => a.cost - b.cost)[0]!;
      const q = Math.min(remaining, capOf(c, false));
      take(c, q);
      overflow = remaining;
      remaining = 0;
    } else {
      const sorted = [...cands].sort((a, b) => a.cost - b.cost);
      for (const c of sorted) take(c, Math.min(remaining, capOf(c, true)));
      // Si todos los nodos están en su límite blando, se usa la capacidad dura del más barato.
      for (const c of sorted) if (remaining > 0) take(c, Math.min(remaining, capOf(c, false)));
      overflow = remaining;
      remaining = 0;
    }

    const storeHours = storeOrders / p.nodes.store.ordersPerPickerHour;
    const storeCapHours = sfsStores * d.sfsCap * p.nodes.store.staffHours;

    // Rutas: domicilio (sin express) y express por separado; lockers como paradas consolidadas.
    const delivered = alloc.reduce((a, x) => a + x.q, 0);
    const homeShare = toDeliver > 0 ? home / toDeliver : 0;
    const homeStops = delivered * homeShare;
    const lockerStops = lockerOrders > 0 ? place.lockersByZone[zp.id]! : 0;
    const distKm = delivered > 0 ? alloc.reduce((a, x) => a + x.distKm * x.q, 0) / delivered : zp.distCd;
    const inZoneNode = distKm <= 10;
    const vk: keyof Params["vehicles"] = (vehicleKind === "bike" || vehicleKind === "moto") && !inZoneNode ? "van" : vehicleKind;
    const vv = p.vehicles[vk];
    const closed = sh.closedZones.includes(zp.id) ? sh.closedShare : 0;
    const timeMult = sh.timeZones.includes(zp.id) ? sh.timeMult : 1;
    const traffic = ctx.stream("traffic", ctx.tick, zp.id).normal() * ctx.noise;
    const localSpeed = (t.speed[zp.kind as keyof typeof t.speed] * vv.speedMult * clamp(1 + t.congestionSd * traffic, 0.4, 1.6)) / timeMult;
    const stopHours = (t.stopMinutes / 60) * p.stopMultByKind[zp.kind as keyof typeof p.stopMultByKind] * (1 - p.familiarityStopGain * fam) * (1 + 0.3 * codShare) * pay.stopMult;
    const common = {
      areaKm2: zp.area,
      linehaulKm: distKm,
      linehaulSpeed: inZoneNode ? localSpeed : t.linehaulSpeed / timeMult,
      localSpeed,
      capacity: vv.capacity,
      shiftHours: p.shiftHours,
      kmMult: rf.kmMult * kmZoning,
      kTsp: p.kTsp,
    };
    const expressShare = shares.express;
    const regular = route({ ...common, stops: homeStops * (1 - expressShare) + lockerStops, stopHours, fragmentation });
    const expressAvail = p.levels.express.promiseHours - 0.3 - common.linehaulKm / common.linehaulSpeed;
    const express = route({
      ...common,
      stops: homeStops * expressShare,
      stopHours,
      fragmentation: p.operatingHours / p.levels.express.promiseHours,
      maxStops: Math.max(1, Math.floor(expressAvail / (stopHours + 1 / Math.max(localSpeed, 1)))),
    });
    // Autonomía de vehículos eléctricos: rutas más largas que el rango se parten.
    const rangeSplit = (r: RouteResult) => (r.kmPerRoute > vv.rangeKm ? r.kmPerRoute / vv.rangeKm : 1);
    const routes = (regular.routes * rangeSplit(regular) + express.routes * rangeSplit(express)) * (1 - closed);

    work.push({ zi: zp.id, orders, carried, cancelled, rejected, bopis, lockerOrders, home, alloc, overflow, storeHours, storeCapHours, storeUtil: storeFull > 0 ? Math.min(1, storeOrders / storeFull) : 0, homeRoute: regular, expressRoute: express, expressShare, lockerStops, localSpeed, vehicleKind: vk, routes });
  }

  // ---------- Pasada 2: flota ----------
  const routesPerVehicle = d.shifts.two ? 2 : 1;
  const need = work.reduce((a, w) => a + w.routes, 0) / routesPerVehicle;
  const mix = p.fleet.mixes[d.fleetMix];
  if (s.ownFleet === 0 && mix.own > 0) s.ownFleet = Math.ceil(need * mix.own * p.fleet.ownBuffer[d.fleetBuffer]);
  s.needAccum += need;
  s.needDays += 1;
  const restricted = p.vehicles[vehicleKind].restricted ? sh.capacityCut : 0;
  const ownAvail = (mix.own > 0 ? s.ownFleet : 0) * (1 - sh.ownCut) * (1 - restricted);
  // El 3PL y los contratos de pico se dimensionan con la necesidad típica (promedio del mes anterior),
  // no con la del día: en un pico la flota contratada se queda corta.
  // Primer día del juego: se descuenta el efecto del día (fin de semana, quincena) para estimar el típico.
  if (s.baseNeed === 0) s.baseNeed = need / (quincena * weekdayMult * (peak?.mult ?? 1));
  const plAvail = s.baseNeed * mix["3pl"] * p.fleet.threePlElastic * (1 - restricted);
  const crowdAvail = need * mix.crowd * t.crowdAvailability * (peak ? 0.75 : 1) * (1 - sh.crowdCut);
  const contract = p.fleet.peak[d.peakContract];
  const peakExtra = peak ? s.baseNeed * contract.extra * contract.reliability : 0;
  const available = ownAvail + plAvail + crowdAvail + peakExtra;
  const fleetShort = need > 0 ? clamp(1 - available / need, 0, 1) : 0;
  const lostRoutesShare = need > 0 ? Math.min(1, sh.lostRoutes / Math.max(need, 1)) : 0;
  const served = 1 - Math.min(1, fleetShort + lostRoutesShare);
  // Reparto de las rutas atendidas entre tipos de flota (primero propia, luego 3PL, crowd, extra de pico).
  const servedVehicles = need * served;
  const useOwn = Math.min(servedVehicles, ownAvail);
  const usePl = Math.min(servedVehicles - useOwn, plAvail);
  const useCrowd = Math.min(servedVehicles - useOwn - usePl, crowdAvail);
  const useExtra = Math.max(0, servedVehicles - useOwn - usePl - useCrowd);

  // ---------- Pasada 3: resultados por zona ----------
  const wage = t.driverWage * (s.market.labor === "tight" ? 1.15 : 1);
  const fuel = (s.market.fuel === "volatile" ? 1 : 1) * sh.fuelMult;
  const coldCfg = p.cold[d.cold];
  const coldThr = Math.max(coldCfg.threshold, veh.coldThreshold);
  const lambdaCold = vehicleKind === "reefer" ? Math.min(coldCfg.lambdaMult, p.cold.reefer.lambdaMult) : coldCfg.lambdaMult;
  const heatSeason = t.climate === "heat" && month >= 4 && month <= 7;
  const lambda = p.spoilLambda * lambdaCold * (heatSeason ? 1.3 : 1) * (sh.heat ? p.heatMult : 1) * (prevFlags.r01 ? 1.3 : 1) * p.maintenance[d.maintenance].cold;
  const absent = p.absent[d.absent];
  const eta = p.eta[d.eta];
  const addrGain = p.address[d.address];
  const ret = p.markets.returnRate[s.market.returns];
  const retCost = d.returnsConsolidation === "backhaul" ? p.returns.costBackhaul : d.returnsChannel === "store" ? p.returns.costStore : d.returnsChannel === "locker" ? p.returns.costLocker : p.returns.costDedicated;
  const sigmaBase = p.late.sigmaPerHour * rf.sigmaMult * (sh.routingDown ? 1.4 : 1);
  const bias = p.costFunction[d.costFn];
  const coldExtraPerRoute = d.cold === "reefer" && vehicleKind !== "reefer" ? 25 : 0;

  let routesTotal = 0;
  let stopsTotal = 0;
  let capTotal = 0;
  let hoursTotal = 0;
  let kmTotal = 0;
  let emptyKm = 0;
  let delivTotal = 0;
  let onTime = 0;
  let firstOk = 0;
  let attempts = 0;
  let exceptions = 0;
  let freshTotal = 0;
  let spoiled = 0;
  let inFullW = 0;
  let perfectW = 0;
  let cycleW = 0;
  let etaW = 0;
  let csatW = 0;
  let routeCost = 0;
  let pickCost = 0;
  let reattemptCost = 0;
  let returnsCost = 0;
  let techCost = 0;
  let refunds = 0;
  let revenue = 0;
  let fees = 0;
  let ordersTotal = 0;
  let carriedTotal = 0;
  let rejectedTotal = 0;
  let backlogOut = 0;
  let storeHoursTotal = 0;
  let storeCapTotal = 0;
  let storeOver = false;
  let maxNodeUtil = 0;
  let expressUtilW = 0;
  let expressRoutes = 0;
  let routeHoursFreshW = 0;
  let freshDelivW = 0;
  let co2 = 0;
  let costUrban = 0;
  let delivUrban = 0;
  let costRemote = 0;
  let delivRemote = 0;
  let cancelledTotal = 0;
  let backlogIni = 0;
  let costRural = 0;
  let delivRural = 0;
  let stopsRural = 0;
  let routesRural = 0;
  let linehaulW = 0;
  let failedFirstTotal = 0;
  let capitalCost = 0;

  const csatOf = (otd: number, fads: number, exc: number, spoil: number, etaAcc: number) =>
    clamp(p.csat.base - p.csat.otd * (1 - otd) - p.csat.fads * (1 - fads) - p.csat.exception * exc - p.csat.spoil * spoil + p.csat.eta * (etaAcc - 0.8) + p.csat.speed * (spdPromised - 0.4) - p.csat.fee * (d.fee.fee - p.feeBase), 1, 5);

  for (const w of work) {
    const zp = t.zones[w.zi]!;
    const z = s.zones[w.zi]!;
    const vv = p.vehicles[w.vehicleKind];
    const closed = sh.closedZones.includes(zp.id) ? sh.closedShare : 0;
    const delivered0 = w.alloc.reduce((a, x) => a + x.q, 0) * served * (1 - closed);
    const notDelivered = w.alloc.reduce((a, x) => a + x.q, 0) - delivered0 + w.overflow;
    const robbed = sh.lostOrders * (delivered0 / Math.max(1, work.reduce((a, x) => a + x.alloc.reduce((b, y) => b + y.q, 0), 0)));
    const delivered = Math.max(0, delivered0 - robbed);
    z.backlog += notDelivered + robbed; // se reintentan mañana (tarde)
    const bopisServed = w.bopis;
    const handled = delivered + bopisServed;
    backlogOut += notDelivered + robbed;
    backlogIni += w.carried + w.cancelled;

    // Rutas
    const regular = w.homeRoute;
    const express = w.expressRoute;
    const rRoutes = (regular.routes + express.routes) * served * (1 - closed);
    const backhaulMult = d.returnsConsolidation === "backhaul" ? 1 + p.returns.backhaulRouteTime : 1;
    const rh = (regular.routes * regular.routeHours + express.routes * express.routeHours) * served * (1 - closed) * backhaulMult;
    const km = (regular.routes * regular.kmPerRoute + express.routes * express.kmPerRoute) * served * (1 - closed);
    const stops = (regular.routes * regular.stopsPerRoute + express.routes * express.stopsPerRoute) * served * (1 - closed);
    routesTotal += rRoutes;
    hoursTotal += rh;
    kmTotal += km;
    stopsTotal += stops;
    capTotal += rRoutes * vv.capacity;
    emptyKm += (regular.routes * regular.oneWayHours * (regular.kmPerRoute / Math.max(regular.routeHours, 1e-9)) + express.routes * express.oneWayHours * (express.kmPerRoute / Math.max(express.routeHours, 1e-9))) * served * (1 - closed) * (d.returnsConsolidation === "backhaul" ? 0.5 : 1);
    co2 += km * vv.emission;
    if (express.routes > 0) {
      expressRoutes += express.routes;
      expressUtilW += express.routes * (express.stopsPerRoute / vv.capacity);
    }

    // Puntualidad (OTD) con holgura, sesgo del plan y espera de picking por saturación de nodo
    let nodeUtil = 0;
    for (const a of w.alloc) {
      if (a.kind === "cd" || a.kind === "hub") nodeUtil = Math.max(nodeUtil, cdCap > 0 ? (cdCap - cdLeft) / cdCap : 0);
      if (a.kind === "mfc") nodeUtil = Math.max(nodeUtil, 1 - mfcLeft[a.node]! / p.nodes.mfc.capacity);
      if (a.kind === "dark") nodeUtil = Math.max(nodeUtil, 1 - darkLeft[a.node]! / p.nodes.dark.capacity);
    }
    nodeUtil = Math.max(nodeUtil, w.storeUtil);
    maxNodeUtil = Math.max(maxNodeUtil, nodeUtil);
    // Espera de picking: crece por encima de la utilización alta (85%); el exceso de capacidad ya pasó a backlog.
    const pickWait = p.pickWaitBase * (1 + (2 * Math.max(0, Math.min(nodeUtil, 1) - p.highUtil)) / (1 - p.highUtil));
    const avgRouteHours = rRoutes > 0 ? rh / rRoutes : regular.routeHours;
    // El desvío de llegada se acumula hasta la parada: en promedio, a la mitad de la ruta.
    const midRoute = Math.max(avgRouteHours / 2, 0.25);
    const sigma = sigmaBase * Math.sqrt(midRoute) * (1 + t.congestionSd);
    const planBias = bias * midRoute * p.late.planBiasScale + Math.max(0, pickWait - p.pickWaitBase);
    const margin = 0.5 * win.hours * (1 + 2 * d.buffer);
    const otdScheduled = normalCdf((margin - planBias) / sigma);
    const expressMargin = p.levels.express.promiseHours * (1 + d.buffer) - (pickWait + express.avgInVehicleHours + 0.3);
    const otdExpress = normalCdf(expressMargin / (sigmaBase * Math.sqrt(Math.max(express.routeHours, 0.25))));
    const pmPenalty = d.levels.sameday ? 1 - p.cutoff[d.cutoff].pmLoad * 0.5 * w.expressShare : 1;
    const otdRoute = (otdScheduled * (1 - w.expressShare) + otdExpress * w.expressShare) * pmPenalty;
    // Pedidos que vienen de ayer: tarde, salvo en pico con promesa realista (holgura ≥ 10% ⇒ se promete un día más).
    const carriedLate = peak && d.buffer >= 0.1 ? 0 : w.carried / Math.max(w.orders + w.carried, 1);
    const onTimeHere = delivered * otdRoute * Math.max(0, 1 - carriedLate) + bopisServed * 0.98;
    onTime += onTimeHere;

    // Primer intento
    const presence = Math.min(0.99, t.presence[zp.kind as keyof typeof t.presence] + presenceGain + eta.presence);
    const addrBase = t.address[zp.kind as keyof typeof t.address];
    const addressOk = addrBase + (1 - addrBase) * addrGain - (sh.fadsHitZone === zp.id ? p.events["X-13"].fadsHit : 0);
    const fads = presence * addressOk * t.access * (1 - codShare * p.cod.rejectRate) * (1 - pay.fakeAttempt);
    const homeDelivered = delivered * (w.home / Math.max(w.home + w.lockerOrders, 1e-9));
    const lockerDelivered = delivered - homeDelivered;
    const firstOkHere = homeDelivered * fads + lockerDelivered;
    const failedFirst = homeDelivered - homeDelivered * fads;
    failedFirstTotal += failedFirst;
    const finalFail = failedFirst * (1 - absent.success);
    firstOk += firstOkHere + bopisServed;
    attempts += homeDelivered + lockerDelivered + bopisServed;

    // Cadena de frío
    const fresh = delivered * freshShare;
    const tCold = pickWait * 0.5 + (d.loadSeq === "fresh_first" ? p.freshFirstRouteFactor : 1) * (regular.avgInVehicleHours * (1 - w.expressShare) + express.avgInVehicleHours * w.expressShare);
    let pSpoil = 1 - Math.exp(-lambda * Math.max(0, tCold - coldThr));
    if (sh.coldBatch > 0 && Number(s.memo["X-01.zone"] ?? -1) === zp.id) pSpoil = Math.min(1, pSpoil + sh.coldBatch);
    const spoiledHere = fresh * pSpoil;
    freshTotal += fresh;
    spoiled += spoiledHere;
    routeHoursFreshW += avgRouteHours * fresh;
    freshDelivW += fresh;
    if (avgRouteHours > 3 && fresh > 0 && d.cold === "none" && vehicleKind !== "reefer") s.flags.r01 = true;

    // In-full, excepciones y orden perfecta
    const inFullNode = delivered > 0 ? w.alloc.reduce((a, x) => a + x.inFull * x.q, 0) / Math.max(w.alloc.reduce((a, x) => a + x.q, 0), 1e-9) : 1;
    const overTope = w.storeCapHours > 0 && w.storeHours > w.storeCapHours;
    if (overTope) storeOver = true;
    const pickErr = p.nodes.store.pickErrorBase + (overTope ? p.nodes.store.pickErrorOverload : 0);
    const storeShare = delivered > 0 ? w.alloc.filter((a) => a.kind === "store").reduce((a, x) => a + x.q, 0) / Math.max(w.alloc.reduce((a, x) => a + x.q, 0), 1e-9) : 0;
    const inFull = inFullNode * (1 - pickErr * storeShare);
    const excHere = spoiledHere + delivered * p.damageRate + finalFail + homeDelivered * (1 - fads) * absent.exception + robbed;
    exceptions += excHere;
    inFullW += inFull * delivered;
    // Orden perfecta: a tiempo (incluye los atrasados de ayer), completa, sin daño y con documentos.
    perfectW += onTimeHere * inFull * (1 - p.damageRate - pSpoil * freshShare) * p.docOk;
    delivTotal += delivered + bopisServed;

    // Tiempo de ciclo y precisión del ETA
    const levelHours = LEVELS.reduce((a, l) => a + shares[l] * p.levels[l].promiseHours, 0);
    const lateDays = (w.carried / Math.max(w.orders + w.carried, 1)) + (failedFirst / Math.max(homeDelivered, 1)) * absent.delayDays;
    cycleW += (levelHours * (1 + (1 - otdRoute) * 0.2) + lateDays * 24 + batch.cycle) * (delivered + bopisServed);
    const etaAcc = clamp(1 - sigma / (win.hours + 0.5) + eta.accuracy + rf.etaGain, 0, 0.99);
    etaW += etaAcc * delivered;

    // CSAT y confianza de la zona
    const excRate = delivered > 0 ? excHere / delivered : 0;
    const spoilRate = fresh > 0 ? spoiledHere / fresh : 0;
    const otdZone = handled > 0 ? onTimeHere / handled : 1;
    const csat = clamp(csatOf(otdZone, fads, excRate, spoilRate, etaAcc) - (prevFlags.r02 ? 0.1 : 0), 1, 5);
    csatW += csat * Math.max(handled, 1e-9);
    const target = clamp(1 + p.trust.sensitivity * (csat - p.trust.csatRef), p.trust.min, p.trust.max);
    z.trust += (target - z.trust) * (p.trust.speed / 30);

    // Costos y dinero
    const ownShareRoutes = servedVehicles > 0 ? useOwn / servedVehicles : 0;
    const plShare = servedVehicles > 0 ? usePl / servedVehicles : 0;
    const crowdShare = servedVehicles > 0 ? useCrowd / servedVehicles : 0;
    const extraShare = servedVehicles > 0 ? useExtra / servedVehicles : 0;
    const energy = km * (vv.costPerKm + (coldExtraPerRoute ? 0.08 : 0)) * fuel;
    const driver = rh * wage * pay.costMult * (d.shifts.two ? (1 + p.fleet.shiftOvertimeMult) / 2 : 1) * (weekday >= 5 && d.shifts.weekends ? p.fleet.weekendCostMult : 1);
    const vehicleVar = rRoutes * (coldExtraPerRoute + (vv.dayCost * Math.min(1, avgRouteHours / p.shiftHours)));
    const routeBase = energy + driver + vehicleVar;
    // Propia: energía y chofer (el vehículo es costo fijo diario aparte). 3PL: todo con margen.
    // Crowdsourced: pago por entrega. Extra de pico: todo con el multiplicador del contrato.
    const routeCostHere =
      (energy + driver) * ownShareRoutes +
      routeBase * plShare * p.fleet.threePlMarkup +
      stops * crowdShare * p.fleet.crowdPerDrop * fuel +
      routeBase * extraShare * contract.costMult;
    routeCost += routeCostHere;
    const zoneCost = routeCostHere + w.alloc.reduce((a, x) => a + (x.pick + x.capital) * x.q, 0) * served + delivered * ret * retCost + failedFirst * absent.costShare * (stops > 0 ? routeCostHere / stops : 0);
    if (zp.kind === "urban") {
      costUrban += zoneCost;
      delivUrban += delivered;
    } else if (zp.kind === "rural" || zp.kind === "city2") {
      costRemote += zoneCost;
      delivRemote += delivered;
    }
    if (zp.kind === "rural") {
      costRural += zoneCost;
      delivRural += delivered;
      stopsRural += stops;
      routesRural += rRoutes;
    }
    linehaulW += w.alloc.reduce((a, x) => a + x.distKm * x.q, 0) * served;
    const perStopCost = stops > 0 ? routeCostHere / stops : 0;
    reattemptCost += failedFirst * absent.costShare * perStopCost;
    pickCost += (w.alloc.reduce((a, x) => a + x.pick * x.q, 0) * served + bopisServed * p.nodes.store.pickCost) * batch.cost;
    capitalCost += w.alloc.reduce((a, x) => a + x.capital * x.q, 0) * served + bopisServed * p.nodes.store.capitalPerOrder;
    returnsCost += handled * ret * retCost;
    techCost += handled * (eta.costPerOrder + p.address.costPerOrder[d.address] + (d.cold === "coolers" ? coldCfg.costPerOrder : 0));
    refunds += spoiledHere * basket * 0.35;
    const payingFee = d.fee.freeThreshold === 0 ? 1 : Math.max(0.2, 1 - d.fee.freeThreshold / (basket * 1.5));
    revenue += handled * basket;
    fees += (delivered * payingFee * d.fee.fee);
    ordersTotal += w.orders;
    carriedTotal += w.carried;
    rejectedTotal += w.rejected;
    cancelledTotal += w.cancelled;
    storeHoursTotal += w.storeHours;
    storeCapTotal += w.storeCapHours;
  }

  // Flota propia: costo fijo diario de los vehículos (se use o no) y sus choferes base.
  const ownFixed = (mix.own > 0 ? s.ownFleet : 0) * (p.vehicles[vehicleKind].dayCost + coldExtraPerRoute);
  // Costos fijos de nodos y servicios (mensuales prorrateados por día).
  const fixedMonthly =
    p.nodes.cd.fixedMonthly[d.sfd.capacity] +
    d.darkStores * p.nodes.dark.fixedMonthly +
    d.mfc * p.nodes.mfc.fixedMonthly +
    d.lockers * p.nodes.locker.fixedMonthly +
    d.hubs * p.nodes.hub.fixedMonthly +
    p.security.monthlyCost[d.security] +
    p.maintenance[d.maintenance].cost;
  // Telemetría y tráfico se pagan por vehículo en operación.
  const fixedDaily = (fixedMonthly + need * p.data.costPerVehicleMonth[d.data]) / daysInMonth;
  const robberyCost = sh.lostOrders > 0 ? p.events["X-08"].cost : 0;
  const lastMile = routeCost + ownFixed + pickCost + capitalCost + reattemptCost + returnsCost + techCost + fixedDaily + robberyCost;
  const successful = firstOk + (attempts - firstOk) * absent.success;

  // R-02: spoilage semanal de frescos
  s.weekFresh += freshTotal;
  s.weekSpoiled += spoiled;
  if ((s.day + 1) % 7 === 0) {
    s.flags.r02 = s.weekFresh > 0 && s.weekSpoiled / s.weekFresh > 0.03;
    s.weekFresh = 0;
    s.weekSpoiled = 0;
  }
  // R-05: tiendas sobre el tope de picking
  s.flags.r05 = storeOver;
  // R-06: promesa sin holgura en día pico (calendario o pico viral X-05) con faltantes
  s.flags.r06 = (!!peak || sh.demandMult > 1) && d.buffer < 0.1 && backlogOut > 0.05 * Math.max(ordersTotal, 1);

  // OSA de la tienda física: baja si el picking en línea excede el tope (R-05) o si se reponen pedidos dañados (R-02).
  const storeOsa = clamp((storeCapTotal > 0 ? p.nodes.store.osaBase - p.nodes.store.osaTheta * Math.max(0, storeHoursTotal / (storeCapTotal / Math.max(d.sfsCap, 1e-9)) - d.sfsCap) : p.nodes.store.osaBase) - (prevFlags.r02 ? 0.02 : 0), 0, 1);

  Object.assign(m, {
    orders: ordersTotal,
    carried: carriedTotal,
    rejected: rejectedTotal,
    cancelled: cancelledTotal,
    costUrban,
    delivUrban,
    costRural,
    delivRural,
    stopsRural,
    routesRural,
    linehaulW,
    costRemote,
    delivRemote,
    backlogOut,
    handled: delivTotal,
    onTime,
    attempts,
    firstOk,
    successful,
    exceptions,
    freshTotal,
    spoiled,
    inFullW,
    perfectW,
    cycleW,
    etaW,
    csatW,
    routes: routesTotal,
    stops: stopsTotal,
    capStops: capTotal,
    routeHours: hoursTotal,
    km: kmTotal,
    emptyKm,
    co2,
    lastMile,
    routeCost: routeCost + ownFixed,
    pickCost,
    capitalCost,
    robberyCost,
    backlogIni,
    failedFirst: failedFirstTotal,
    reattemptCost,
    returnsCost,
    techCost,
    fixedDaily,
    refunds,
    revenue,
    fees,
    margin: revenue * p.basketMargin + fees - lastMile - refunds,
    need,
    available,
    fleetShort,
    ownFleet: mix.own > 0 ? s.ownFleet : 0,
    ownUsed: useOwn,
    idleCapStops: Math.max(0, (mix.own > 0 ? s.ownFleet : 0) - useOwn) * routesPerVehicle * p.vehicles[vehicleKind].capacity,
    restrictedCut: restricted,
    maxNodeUtil,
    storeOsa,
    storeHours: storeHoursTotal,
    storeCapHours: storeCapTotal,
    expressUtil: expressRoutes > 0 ? expressUtilW / expressRoutes : 1,
    expressRoutes,
    freshRouteHours: freshDelivW > 0 ? routeHoursFreshW / freshDelivW : 0,
    peak: peak ? peak.mult : 0,
    // KPI diarios (para percentiles: p95 en el puntaje, D-61 en la vista)
    dayOtd: delivTotal > 0 ? onTime / delivTotal : 1,
    dayFads: attempts > 0 ? firstOk / attempts : 1,
    dayCpd: lastMile / Math.max(successful, 1),
    dayCsat: delivTotal > 0 ? csatW / delivTotal : 4,
  });
  s.lastCsat = delivTotal > 0 ? csatW / delivTotal : s.lastCsat;
  s.day += 1;
  s.shocks = emptyShocks();
}
