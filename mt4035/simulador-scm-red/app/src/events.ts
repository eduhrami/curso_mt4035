/**
 * Catálogo de eventos inesperados (especificación §8). pBase es probabilidad por época; los
 * efectos se fijan en state.shocks durante perTick y el tick los consume y limpia.
 */
import type { EventDef, TickContext } from "@mt4035/sim-core";
import { activeDcs } from "./network.ts";
import { CATEGORIES, type Params, type ScmState } from "./types.ts";

type Ev = EventDef<ScmState, Params>;
type Ctx = TickContext<ScmState, Params>;

const quarter = (ctx: Ctx) => ctx.state.epoch % 4;
const ev = (p: Params) => p.events;
const storeZones = (ctx: Ctx) => ctx.state.zones.filter((z) => z.stores > 0).map((z) => z.id);
const pick = <T>(xs: readonly T[], u: number): T | undefined => xs[Math.min(xs.length - 1, Math.floor(u * xs.length))];
const usesDc = (ctx: Ctx) => Object.values(ctx.state.dec.flows).includes("dc") && activeDcs(ctx.state, ctx.state.epoch).length > 0;
const catLabel = (ctx: Ctx, c: unknown) => ctx.params.categories[c as (typeof CATEGORIES)[number]]?.label.toLowerCase() ?? String(c);
const totalSuppliers = (ctx: Ctx) => CATEGORIES.reduce((a, c) => a + ctx.params.regions[ctx.state.region].suppliers[c], 0);

export const events: Ev[] = [
  {
    id: "X-01",
    kpis: ["WASTE", "WASTE_FRESH", "OSA_FRESH", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
    pBase: (ctx) => ev(ctx.params)["X-01"].pBase,
    modifiers: [
      { label: "rutas largas con frescos (R-01)", ref: "R-01", factor: (ctx) => ev(ctx.params)["X-01"].longRouteMult, when: (ctx) => ctx.state.flags.r01 },
      { label: "flota con mantenimiento correctivo", ref: "D-16", factor: 1.3, when: (ctx) => ctx.state.dec.maintenance === "corrective" },
      { label: "vehículos multi-temperatura", ref: "D-14", factor: 0.7, when: (ctx) => ctx.state.dec.vehicle.type === "multi" },
      { label: "telemetría de temperatura", ref: "D-14", factor: 0.5, when: (ctx) => ctx.state.dec.vehicle.telemetry },
      { label: "mantenimiento predictivo", ref: "D-16", factor: 0.7, when: (ctx) => ctx.state.dec.maintenance === "predictive" },
    ],
    // La falla golpea la zona de mayor exposición: la que tiene más tiendas recibiendo frescos.
    onStart: (ctx) => {
      const zs = ctx.state.zones.filter((z) => z.stores > 0);
      ctx.state.memo["X-01.zone"] = zs.length ? zs.reduce((a, b) => (b.stores > a.stores ? b : a)).id : -1;
    },
    perTick: (ctx, e) => {
      ctx.state.shocks.excursionZone = Number(ctx.state.memo["X-01.zone"] ?? -1);
      ctx.state.shocks.excursionLoss = ev(ctx.params)["X-01"].lossShare * e.severity;
    },
    message: (ctx, e) => ({
      title: "Falla de refrigeración en ruta",
      body: `Se perdió ~${Math.round(ev(ctx.params)["X-01"].lossShare * e.severity * 100)}% del lote de frescos de la zona ${ctx.state.memo["X-01.zone"]}.`,
      severity: "critico",
    }),
  },
  {
    id: "X-02",
    kpis: ["OSA", "OTIF", "LOST_SALES", "EBITDA_PCT", "SALES"],
    pBase: (ctx) => {
      const x = ev(ctx.params)["X-02"];
      const climate = ctx.params.regions[ctx.state.region].climate as keyof typeof x.season;
      return x.season[climate].includes(quarter(ctx)) ? x.pBase[climate] : x.offSeason;
    },
    duration: (sev) => 1 + Math.round(sev),
    onStart: (ctx) => {
      const zones = storeZones(ctx);
      const s = ctx.stream("X-02", ctx.tick);
      const k = Math.max(1, Math.round(zones.length * ev(ctx.params)["X-02"].closedShare));
      ctx.state.memo["X-02.zones"] = zones.filter(() => s.next() < k / zones.length).join(",");
    },
    perTick: (ctx, e) => {
      const z = String(ctx.state.memo["X-02.zones"] ?? "");
      ctx.state.shocks.closedZones = z ? z.split(",").map(Number) : [];
      ctx.state.shocks.closedShare = 0.5 * e.severity;
    },
    message: (ctx) => {
      const name = { typhoon: "Tifón", snow: "Tormenta de nieve", rain: "Lluvia torrencial" }[ctx.params.regions[ctx.state.region].climate] ?? "Clima severo";
      return { title: name, body: "Rutas cerradas en varias zonas: entregas canceladas y faltantes.", severity: "critico" };
    },
  },
  {
    id: "X-03",
    kpis: ["OSA", "OTIF", "CTS_PCT", "EBITDA_PCT", "LOST_SALES", "SALES"],
    pBase: (ctx) => (ev(ctx.params)["X-03"].regions.includes(ctx.state.region) ? ev(ctx.params)["X-03"].pBase : 0),
    onStart: (ctx, e) => {
      const dcs = activeDcs(ctx.state, ctx.state.epoch);
      const target = pick(dcs, ctx.stream("X-03", ctx.tick).next());
      if (!target) return;
      const x = ev(ctx.params)["X-03"];
      const weeks = Math.round(x.minWeeks + (x.maxWeeks - x.minWeeks) * e.severity);
      const dc = ctx.state.dcs.find((d) => d.id === target.dc.id)!;
      dc.downUntil = ctx.state.week + weeks;
      ctx.state.memo["X-03.dc"] = dc.id;
      ctx.state.memo["X-03.weeks"] = weeks;
    },
    message: (ctx) => ({
      title: "Sismo severo",
      body: ctx.state.memo["X-03.dc"] ? `El ${ctx.state.memo["X-03.dc"]} queda fuera de servicio ${ctx.state.memo["X-03.weeks"]} semanas; sus zonas se atienden desde otro CD.` : "Sismo sin daños a la red.",
      severity: "critico",
    }),
  },
  {
    id: "X-04",
    kpis: ["OSA", "OTIF", "LOST_SALES", "EBITDA_PCT", "SALES"],
    pBase: (ctx) => ev(ctx.params)["X-04"].pBase[ctx.state.market.supplierReliability],
    modifiers: [
      { label: "cross-dock sin amortiguador (R-06)", ref: "R-06", factor: (ctx) => ev(ctx.params)["X-04"].crossdockMult, when: (ctx) => usesDc(ctx) && activeDcs(ctx.state, ctx.state.epoch).every((d) => d.type !== "stocking") },
      { label: "proveedores dedicados", ref: "D-07", factor: (ctx) => ev(ctx.params)["X-04"].dedicatedMult, when: (ctx) => ctx.state.dec.dedicated.fresh || ctx.state.dec.dedicated.chilled },
      { label: "CPFR", ref: "D-33", factor: (ctx) => ev(ctx.params)["X-04"].cpfrMult, when: (ctx) => ctx.state.dec.collaboration === "cpfr" },
    ],
    duration: (sev) => 2 + Math.round(2 * sev),
    onStart: (ctx) => {
      ctx.state.memo["X-04.cat"] = pick(CATEGORIES, ctx.stream("X-04", ctx.tick).next())!;
    },
    perTick: (ctx) => {
      const c = ctx.state.memo["X-04.cat"] as (typeof CATEGORIES)[number];
      ctx.state.shocks.supplierFrMult[c] = ev(ctx.params)["X-04"].frMult;
    },
    message: (ctx) => ({ title: "Proveedor clave no entrega", body: `El fill rate de proveedores de ${catLabel(ctx, ctx.state.memo["X-04.cat"])} cae 40% durante algunas semanas.`, severity: "critico" }),
  },
  {
    id: "X-05",
    kpis: ["OSA", "LOST_SALES", "SALES", "EBITDA_PCT"],
    pBase: (ctx) => (ev(ctx.params)["X-05"].season.includes(quarter(ctx)) ? ev(ctx.params)["X-05"].pBase : 0),
    duration: () => 2,
    perTick: (ctx) => {
      const x = ev(ctx.params)["X-05"];
      ctx.state.shocks.demandMult.ambient *= x.demandMult;
      if (ctx.state.dec.forecast !== "causal") ctx.state.shocks.cvMult *= x.cvMultNoCausal;
    },
    message: (ctx) => ({
      title: "Ola de calor",
      body: ctx.state.dec.forecast === "causal" ? "Bebidas y helados +40%; el pronóstico causal lo anticipó." : "Bebidas y helados +40% y el pronóstico no lo anticipó: más faltantes.",
      severity: "alerta",
    }),
  },
  {
    id: "X-06",
    kpis: ["SALES", "DEMAND", "EBITDA_PCT"],
    pBase: (ctx) => ev(ctx.params)["X-06"].pBase[ctx.state.market.competition],
    modifiers: [
      { label: "baja densidad propia (sin dominancia)", ref: "D-05", factor: (ctx) => ev(ctx.params)["X-06"].lowDensityMult, when: (ctx) => ctx.state.dec.openingStrategy !== "dominance" },
      { label: "OSA baja la época anterior", ref: "R-03", factor: (ctx) => ev(ctx.params)["X-06"].lowOsaMult, when: (ctx) => ctx.state.lastEpochOsa < 0.9 },
    ],
    onStart: (ctx) => {
      const z = pick(storeZones(ctx), ctx.stream("X-06", ctx.tick).next());
      if (z === undefined) return;
      ctx.state.zones[z]!.competition *= ev(ctx.params)["X-06"].demandMult;
      ctx.state.memo["X-06.zone"] = z;
    },
    message: (ctx) => ({ title: "Competidor abre tiendas", body: `Un competidor abrió en la zona ${ctx.state.memo["X-06.zone"]}: −8% de demanda permanente ahí.`, severity: "alerta" }),
  },
  {
    id: "X-07",
    kpis: ["OTIF", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
    pBase: (ctx) => ev(ctx.params)["X-07"].pBase[ctx.state.market.labor],
    modifiers: [{ label: "3PL dedicado", ref: "D-13", factor: 0.6, when: (ctx) => ctx.state.dec.fleet === "dedicated" }],
    duration: (sev) => 2 + Math.round(2 * sev),
    perTick: (ctx) => {
      ctx.state.shocks.capacityCut = ev(ctx.params)["X-07"].capacityCut;
    },
    message: () => ({ title: "Escasez de choferes", body: "La capacidad de flota cae 15%: algunas entregas se cancelan.", severity: "alerta" }),
  },
  {
    id: "X-08",
    kpis: ["OSA", "LOST_SALES", "EBITDA_PCT", "SALES"],
    pBase: (ctx) => ev(ctx.params)["X-08"].pBase,
    modifiers: [
      { label: "sistema nuevo (madurez < 50%)", ref: "D-30", factor: (ctx) => ev(ctx.params)["X-08"].immatureMult, when: (ctx) => ctx.state.dec.info !== "basic" && ctx.state.infoMaturity < 0.5 },
      { label: "sistema maduro", ref: "D-30", factor: (ctx) => ev(ctx.params)["X-08"].matureMult, when: (ctx) => ctx.state.dec.info !== "basic" && ctx.state.infoMaturity >= 1 },
    ],
    perTick: (ctx, e) => {
      const days = 1 + Math.round(2 * e.severity);
      ctx.state.shocks.cvMult *= 1 + days / 7;
    },
    message: (_ctx, e) => ({ title: "Caída del sistema de pedidos", body: `${1 + Math.round(2 * e.severity)} días de pedidos a ciegas (se repite el último pedido).`, severity: "alerta" }),
  },
  {
    id: "X-09",
    kpis: ["OSA", "SALES", "EBITDA_PCT", "LOST_SALES"],
    pBase: (ctx) => ev(ctx.params)["X-09"].pBase,
    modifiers: [
      { label: "muchos proveedores pequeños", ref: "E-08", factor: (ctx) => ev(ctx.params)["X-09"].manySuppliersMult, when: (ctx) => totalSuppliers(ctx) > 40 },
      { label: "proveedores dedicados con control", ref: "D-07", factor: (ctx) => ev(ctx.params)["X-09"].dedicatedMult, when: (ctx) => ctx.state.dec.dedicated.fresh },
    ],
    onStart: (ctx) => {
      ctx.state.memo["X-09.cat"] = ctx.stream("X-09", ctx.tick).next() < 0.5 ? "fresh" : "chilled";
      for (const z of ctx.state.zones) z.trust = Math.max(ctx.params.trust.min, z.trust - ev(ctx.params)["X-09"].trustHit);
    },
    perTick: (ctx) => {
      ctx.state.shocks.supplierFrMult[ctx.state.memo["X-09.cat"] as "fresh" | "chilled"] = 0.3;
    },
    message: (ctx) => ({ title: "Retiro sanitario", body: `Se retira una línea de ${catLabel(ctx, ctx.state.memo["X-09.cat"])} durante una semana; la confianza baja.`, severity: "critico" }),
  },
  {
    id: "X-10",
    kpis: ["CTS_PCT", "CTS_STORE", "EBITDA_PCT"],
    pBase: (ctx) => ev(ctx.params)["X-10"].pBase[ctx.state.market.fuel],
    duration: (_sev, ctx) => ctx.ticks - ctx.tick,
    perTick: (ctx) => {
      ctx.state.shocks.fuelMult = ev(ctx.params)["X-10"].fuelMult;
    },
    message: () => ({ title: "Choque en el precio del combustible", body: "El combustible sube 25% el resto del trimestre.", severity: "alerta" }),
  },
  {
    id: "X-11",
    kpis: ["OTIF", "WASTE", "CTS_PCT", "EBITDA_PCT"],
    pBase: (ctx) => (ev(ctx.params)["X-11"].regions.includes(ctx.state.region) ? ev(ctx.params)["X-11"].pBase : 0),
    modifiers: [{ label: "entregas en horas valle", ref: "D-15", factor: 0.6, when: (ctx) => ctx.state.dec.window === "offpeak" }],
    duration: (sev) => 2 + Math.round(2 * sev),
    perTick: (ctx) => {
      ctx.state.shocks.congestionMult *= ev(ctx.params)["X-11"].congestionMult;
    },
    message: () => ({ title: "Congestión extraordinaria", body: "Obras y eventos alargan las rutas un 30%.", severity: "alerta" }),
  },
  {
    id: "X-12",
    kpis: ["CTS_PCT", "OTIF", "EBITDA_PCT"],
    pBase: (ctx) => (ctx.params.regions[ctx.state.region].regulatedLoading ? ev(ctx.params)["X-12"].pBase : 0),
    modifiers: [{ label: "entregas en horas valle", ref: "D-15", factor: 0.6, when: (ctx) => ctx.state.dec.window === "offpeak" }],
    duration: () => 4,
    perTick: (ctx) => {
      ctx.state.shocks.stopMult *= ev(ctx.params)["X-12"].stopMult;
    },
    message: () => ({ title: "Restricción de carga urbana", body: "Ventanas de carga más estrechas durante un mes: cada parada tarda más.", severity: "info" }),
  },
];
