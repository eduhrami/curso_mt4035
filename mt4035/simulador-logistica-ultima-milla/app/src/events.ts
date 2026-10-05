/**
 * Catálogo de eventos inesperados (especificación §8). pBase es probabilidad por época (mes);
 * los efectos se fijan en state.shocks durante perTick y el tick los consume y limpia.
 * Los picos de demanda (Hot Sale, Buen Fin, …) no son eventos: están en el calendario.
 */
import type { EventDef, TickContext } from "@mt4035/sim-core";
import { isPeakMonth, monthOf } from "./network.ts";
import type { LmState, Params } from "./types.ts";

type Ev = EventDef<LmState, Params>;
type Ctx = TickContext<LmState, Params>;

const ev = (p: Params) => p.events;
const inTerritory = (ctx: Ctx, list: readonly string[]) => list.includes(ctx.state.territory);
const inMonths = (ctx: Ctx, months: readonly number[]) => months.includes(monthOf(ctx.epoch));
const zones = (ctx: Ctx) => ctx.params.territories[ctx.state.territory].zones;
const crowdShare = (ctx: Ctx) => ctx.params.fleet.mixes[ctx.state.dec.fleetMix].crowd;
const pickZones = (ctx: Ctx, key: string, share: number) => {
  const st = ctx.stream(key, ctx.tick);
  const ids = zones(ctx).filter(() => st.next() < share).map((z) => z.id);
  return ids.length ? ids : [zones(ctx)[st.int(0, zones(ctx).length - 1)]!.id];
};
const largestZone = (ctx: Ctx) => zones(ctx).reduce((a, b) => (b.share > a.share ? b : a)).id;
const days = (min: number, max: number) => (sev: number) => Math.round(min + (max - min) * sev);

export const events: Ev[] = [
  {
    id: "X-01",
    kpis: ["SPOIL_RATE", "EXCEPTION_RATE", "CSAT", "CPD"],
    pBase: (ctx) => ev(ctx.params)["X-01"].pBase,
    modifiers: [
      { label: "rutas largas con frescos sin frío (R-01)", ref: "R-01", factor: 1.5, when: (ctx) => ctx.state.flags.r01 },
      { label: "sin equipo de frío", ref: "D-32", factor: 1.3, when: (ctx) => ctx.state.dec.cold === "none" && ctx.state.dec.vehicle !== "reefer" },
      { label: "mantenimiento correctivo", ref: "D-63", factor: 1.3, when: (ctx) => ctx.state.dec.maintenance === "corrective" },
      { label: "vehículo refrigerado o multi-temperatura", ref: "D-32", factor: 0.5, when: (ctx) => ctx.state.dec.cold === "reefer" || ctx.state.dec.cold === "multi" || ctx.state.dec.vehicle === "reefer" },
      { label: "frescos primero en la ruta", ref: "D-45", factor: 0.8, when: (ctx) => ctx.state.dec.loadSeq === "fresh_first" },
    ],
    onStart: (ctx) => {
      ctx.state.memo["X-01.zone"] = largestZone(ctx);
    },
    perTick: (ctx, e) => {
      ctx.state.shocks.coldBatch = ev(ctx.params)["X-01"].loss * e.severity;
    },
    message: (ctx, e) => ({ title: "Falla de cadena de frío", body: `Un lote de pedidos frescos de ${zones(ctx)[Number(ctx.state.memo["X-01.zone"])]?.name} llegó tibio (~${Math.round(ev(ctx.params)["X-01"].loss * e.severity * 100)}% del lote): reembolsos.`, severity: "critico" }),
  },
  {
    id: "X-02",
    kpis: ["OTD", "OTD_P95", "BACKLOG", "CSAT"],
    pBase: (ctx) => (inTerritory(ctx, ev(ctx.params)["X-02"].territories) && inMonths(ctx, ev(ctx.params)["X-02"].months) ? ev(ctx.params)["X-02"].pBase : 0),
    duration: days(1, 2),
    onStart: (ctx) => {
      ctx.state.memo["X-02.zones"] = pickZones(ctx, "X-02", ev(ctx.params)["X-02"].closedShare).join(",");
    },
    perTick: (ctx, e) => {
      ctx.state.shocks.closedZones = String(ctx.state.memo["X-02.zones"]).split(",").map(Number);
      ctx.state.shocks.closedShare = 0.5 * e.severity * (ctx.state.dec.hubs > 0 ? 0.8 : 1);
    },
    message: () => ({ title: "Inundación", body: "Zonas intransitables por lluvia torrencial: entregas que pasan al día siguiente.", severity: "critico" }),
  },
  {
    id: "X-03",
    kpis: ["OTD", "OTD_P95", "CPD", "ETA_ACC"],
    pBase: (ctx) => (inTerritory(ctx, ev(ctx.params)["X-03"].territories) ? ev(ctx.params)["X-03"].pBase : 0),
    perTick: (ctx) => {
      const dynamic = ctx.state.dec.routing === "ai" || ctx.state.dec.routing === "vrptw";
      ctx.state.shocks.timeZones = pickZones(ctx, "X-03", 0.25);
      ctx.state.shocks.timeMult = dynamic ? 1 + (ev(ctx.params)["X-03"].timeMult - 1) / 2 : ev(ctx.params)["X-03"].timeMult;
    },
    message: (ctx) => ({ title: "Bloqueo o manifestación", body: ctx.state.dec.routing === "manual" ? "Rutas fijas atrapadas en el bloqueo: +40% de tiempo en las zonas afectadas." : "El ruteo dinámico esquivó parte del bloqueo.", severity: "alerta" }),
  },
  {
    id: "X-04",
    kpis: ["BACKLOG", "OTD", "OTD_P95"],
    pBase: (ctx) => (inTerritory(ctx, ev(ctx.params)["X-04"].territories) && inMonths(ctx, ev(ctx.params)["X-04"].months) ? ev(ctx.params)["X-04"].pBase : 0),
    duration: days(1, 3),
    perTick: (ctx) => {
      ctx.state.shocks.capacityCut = ev(ctx.params)["X-04"].capacityCut;
    },
    message: (ctx) => ({
      title: "Contingencia ambiental",
      body: ctx.params.vehicles[ctx.state.dec.vehicle].restricted ? "Doble no circula: 20% de la flota de combustión se queda parada." : "Contingencia ambiental: tu flota eléctrica o de motos sigue circulando.",
      severity: ctx.params.vehicles[ctx.state.dec.vehicle].restricted ? "alerta" : "info",
    }),
  },
  {
    id: "X-05",
    kpis: ["ORDERS", "BACKLOG", "OTD", "OTD_P95", "CSAT"],
    pBase: (ctx) => ev(ctx.params)["X-05"].pBase,
    modifiers: [{ label: "corte tardío sin tope de capacidad", ref: "D-26", factor: 1.5, when: (ctx) => ctx.state.dec.cutoff === "16" && ctx.state.dec.slotting === "none" }],
    duration: days(3, 5),
    perTick: (ctx) => {
      ctx.state.shocks.demandMult *= ev(ctx.params)["X-05"].demandMult;
    },
    message: () => ({ title: "Pico viral", body: "Una campaña en redes dispara la demanda ×1.5 durante varios días.", severity: "alerta" }),
  },
  {
    id: "X-06",
    kpis: ["BACKLOG", "OTD", "OTD_P95", "CPD"],
    // Solo afecta a los choferes propios: con 3PL o crowdsourced el problema es del proveedor.
    pBase: (ctx) => (ctx.params.fleet.mixes[ctx.state.dec.fleetMix].own > 0 ? ev(ctx.params)["X-06"].pBase[ctx.state.market.labor] : 0),
    modifiers: [
      { label: "pago por parada", ref: "D-35", factor: 1.3, when: (ctx) => ctx.state.dec.pay === "per_stop" },
      { label: "bono por calidad (pago mixto)", ref: "D-35", factor: 0.7, when: (ctx) => ctx.state.dec.pay === "mixed" },
    ],
    duration: days(3, 7),
    perTick: (ctx) => {
      ctx.state.shocks.ownCut = ev(ctx.params)["X-06"].capacityCut;
    },
    message: () => ({ title: "Ausentismo de choferes", body: "Renuncias y faltas: la flota propia pierde 15% de capacidad unos días.", severity: "alerta" }),
  },
  {
    id: "X-07",
    kpis: ["BACKLOG", "OTD_P95", "CPD"],
    pBase: (ctx) => (crowdShare(ctx) === 0 ? 0 : isPeakMonth(ctx.params, ctx.epoch) ? ev(ctx.params)["X-07"].pBase.peak : ctx.state.territory === "norte" ? ev(ctx.params)["X-07"].pBase.norte : ev(ctx.params)["X-07"].pBase.other),
    modifiers: [{ label: "más de 50% de la flota crowdsourced", ref: "D-30", factor: 1.5, when: (ctx) => crowdShare(ctx) > 0.5 }],
    duration: days(2, 4),
    perTick: (ctx) => {
      ctx.state.shocks.crowdCut = ev(ctx.params)["X-07"].crowdCut;
    },
    message: () => ({ title: "Plataforma sin repartidores", body: "La plataforma crowdsourced no cubre las rutas: la mitad de su capacidad desaparece.", severity: "critico" }),
  },
  {
    id: "X-08",
    kpis: ["EXCEPTION_RATE", "CPD", "CSAT"],
    pBase: (ctx) => ctx.params.territories[ctx.state.territory].security * ctx.params.security[ctx.state.dec.security],
    modifiers: [{ label: "pago contra entrega en efectivo", ref: "D-53", factor: 1.4, when: (ctx) => ctx.state.dec.cod === "allow" }],
    perTick: (ctx, e) => {
      ctx.state.shocks.lostOrders = ev(ctx.params)["X-08"].lossOrders * e.severity;
    },
    message: () => ({ title: "Robo en ruta", body: "Asaltaron una unidad: pedidos perdidos que se reponen y costo de seguro.", severity: "critico" }),
  },
  {
    id: "X-09",
    kpis: ["BACKLOG", "OTD", "CPD"],
    pBase: (ctx) => ev(ctx.params)["X-09"].pBase,
    modifiers: [
      { label: "pago por parada", ref: "D-35", factor: 1.6, when: (ctx) => ctx.state.dec.pay === "per_stop" },
      { label: "flota sin mantenimiento preventivo", ref: "D-63", factor: 1.4, when: (ctx) => ctx.state.dec.maintenance === "corrective" },
      { label: "choferes con sobrecarga por ausentismo (X-06)", ref: "X-06", factor: 1.5, when: (ctx) => !!ctx.isActive("X-06") },
    ],
    perTick: (ctx) => {
      ctx.state.shocks.lostRoutes = ev(ctx.params)["X-09"].lossRoutes;
    },
    message: () => ({ title: "Accidente vial", body: "Un vehículo fuera de servicio: sus pedidos se retrasan.", severity: "alerta" }),
  },
  {
    id: "X-10",
    kpis: ["ROUTE_EFF", "OTD", "CPD"],
    pBase: (ctx) => (ctx.state.dec.routing === "manual" ? 0 : ev(ctx.params)["X-10"].pBase),
    modifiers: [{ label: "herramienta nueva con datos inmaduros", ref: "D-60", factor: 2, when: (ctx) => ctx.params.data.maturity[ctx.state.dec.data] < 0.5 }],
    perTick: (ctx) => {
      ctx.state.shocks.routingDown = true;
    },
    message: () => ({ title: "Caída del sistema de ruteo", body: "Un día con rutas manuales: más km y menos puntualidad.", severity: "alerta" }),
  },
  {
    id: "X-11",
    kpis: ["ORDERS", "MARGIN_PCT"],
    pBase: (ctx) => (inTerritory(ctx, ev(ctx.params)["X-11"].territories) ? ev(ctx.params)["X-11"].pBase : 0),
    onStart: (ctx) => {
      const respond = ctx.state.dec.levels.express && ctx.state.lastCsat >= 4;
      // La pérdida es sostenida pero no se acumula: un competidor más no vuelve a quitar el 10%.
      const floor = respond ? 0.97 : ev(ctx.params)["X-11"].demandMult;
      for (const z of zones(ctx)) if (z.kind === "urban") ctx.state.zones[z.id]!.competition = Math.min(ctx.state.zones[z.id]!.competition, floor);
      ctx.state.memo["X-11.respond"] = respond ? 1 : 0;
    },
    message: (ctx) => ({ title: "Competidor con entrega en 30 min", body: Number(ctx.state.memo["X-11.respond"]) ? "Tu express y tu CSAT alta contienen la fuga: −3% en zonas densas." : "Sin respuesta express, pierdes 10% de la demanda en zonas densas.", severity: "alerta" }),
  },
  {
    id: "X-12",
    kpis: ["SPOIL_RATE", "EXCEPTION_RATE", "CSAT"],
    pBase: (ctx) => (inTerritory(ctx, ev(ctx.params)["X-12"].territories) && inMonths(ctx, ev(ctx.params)["X-12"].months) ? ev(ctx.params)["X-12"].pBase : 0),
    modifiers: [{ label: "sin equipo de frío", ref: "D-32", factor: 1.0, when: (ctx) => ctx.state.dec.cold === "none" }],
    duration: days(3, 7),
    perTick: (ctx) => {
      ctx.state.shocks.heat = true;
    },
    message: (ctx) => ({ title: "Ola de calor", body: ctx.state.dec.cold === "none" && ctx.state.dec.vehicle !== "reefer" ? "Calor extremo y frescos sin frío: el spoilage se duplica." : "Calor extremo; tu equipo de frío amortigua el golpe.", severity: "alerta" }),
  },
  {
    id: "X-13",
    kpis: ["FADS", "FADS_P95", "CPD"],
    pBase: (ctx) => (inTerritory(ctx, ev(ctx.params)["X-13"].territories) ? ev(ctx.params)["X-13"].pBase : 0),
    modifiers: [
      { label: "sin validación de dirección", ref: "D-51", factor: 1.3, when: (ctx) => ctx.state.dec.address === "none" },
      { label: "geocodificación con referencias", ref: "D-51", factor: 0.4, when: (ctx) => ctx.state.dec.address === "geocode" },
    ],
    duration: () => 7,
    onStart: (ctx) => {
      ctx.state.memo["X-13.zone"] = pickZones(ctx, "X-13", 0)[0]!;
    },
    perTick: (ctx) => {
      ctx.state.shocks.fadsHitZone = Number(ctx.state.memo["X-13.zone"]);
    },
    message: (ctx) => ({ title: "Direcciones nuevas sin geocodificar", body: `Un fraccionamiento nuevo en ${zones(ctx)[Number(ctx.state.memo["X-13.zone"])]?.name}: −5 pp de entrega al primer intento esa semana.`, severity: "info" }),
  },
  {
    id: "X-14",
    kpis: ["NODE_UTIL", "OTD", "BACKLOG"],
    pBase: (ctx) => (ctx.state.dec.sfs.share > 0 ? ev(ctx.params)["X-14"].pBase : 0),
    modifiers: [{ label: "alta dependencia del surtido desde tienda", ref: "D-02", factor: 1.5, when: (ctx) => ctx.state.dec.sfs.share > 0.5 }],
    duration: days(1, 2),
    onStart: (ctx) => {
      ctx.state.memo["X-14.zone"] = largestZone(ctx);
    },
    perTick: (ctx) => {
      ctx.state.shocks.storeDownZone = Number(ctx.state.memo["X-14.zone"]);
    },
    message: (ctx) => ({ title: "Tienda-nodo cerrada", body: ctx.state.dec.assignment === "threshold" || ctx.state.dec.assignment === "ai" ? "La regla dinámica reasigna sus pedidos a otros nodos." : "Una tienda que surte pedidos cerró por una falla: sus pedidos se atoran.", severity: "alerta" }),
  },
  {
    id: "X-15",
    kpis: ["CPD", "CPD_P95", "MARGIN_PCT"],
    pBase: (ctx) => ev(ctx.params)["X-15"].pBase[ctx.state.market.fuel],
    duration: (_sev, ctx) => ctx.ticks - ctx.tick,
    perTick: (ctx) => {
      ctx.state.shocks.fuelMult = ctx.state.dec.vehicle === "ev" || ctx.state.dec.vehicle === "bike" ? 1 : ev(ctx.params)["X-15"].fuelMult;
    },
    message: (ctx) => ({ title: "Alza de gasolina", body: ctx.state.dec.vehicle === "ev" || ctx.state.dec.vehicle === "bike" ? "Sube la gasolina, pero tu flota no la usa." : "La gasolina sube 20% el resto del mes.", severity: "alerta" }),
  },
];
