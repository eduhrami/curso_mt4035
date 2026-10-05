/**
 * Reglas de causa–efecto (especificación §6.4). Las banderas que el tick lee al día siguiente
 * (R-01, R-02) las fija el propio tick; aquí se registran para el log causal y los mensajes.
 */
import type { RuleDef, TickContext } from "@mt4035/sim-core";
import type { LmState, Params } from "./types.ts";

type Rule = RuleDef<LmState, Params>;
type Ctx = TickContext<LmState, Params>;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const r1 = (x: number) => Math.round(x * 10) / 10;
const crowdShare = (ctx: Ctx) => ctx.params.fleet.mixes[ctx.state.dec.fleetMix].crowd;

export const rules: Rule[] = [
  {
    id: "R-01",
    kpis: ["SPOIL_RATE", "EXCEPTION_RATE", "CSAT"],
    when: (ctx) => ctx.state.flags.r01,
    explain: (ctx) => [{ label: "horas promedio de ruta con frescos sin equipo de frío", value: r1(ctx.metrics.freshRouteHours ?? 0), ref: "R-01" }],
    apply: () => {},
    message: (ctx) => ({ title: "Frescos más de 3 h sin frío", body: `Las rutas con frescos duran ~${r1(ctx.metrics.freshRouteHours ?? 0)} h sin equipo de frío: el spoilage crece exponencialmente.`, severity: "alerta" }),
  },
  {
    id: "R-02",
    kpis: ["CSAT", "STORE_OSA", "EXCEPTION_RATE", "ORDERS"],
    when: (ctx) => ctx.state.flags.r02,
    explain: () => [{ label: "spoilage semanal de frescos > 3%", ref: "R-02" }],
    apply: () => {},
    message: () => ({ title: "Spoilage alto en la semana", body: "Más de 3% de los pedidos frescos llegaron dañados: reembolsos, reposición desde tienda y clientes molestos.", severity: "critico" }),
  },
  {
    id: "R-03",
    kpis: ["FADS", "FADS_P95", "CPD", "CSAT"],
    when: (ctx) => ctx.state.dec.window === "day" && (ctx.metrics.dayFads ?? 1) < 0.8,
    explain: (ctx) => [{ label: "ventana de todo el día con clientes fuera de casa; entrega a 1er intento", value: pct(ctx.metrics.dayFads ?? 0), ref: "R-03" }],
    apply: () => {},
    message: () => ({ title: "Muchos clientes no están", body: "Con ventana de todo el día, 1 de cada 5 entregas falla al primer intento: reintentos y costo.", severity: "alerta" }),
  },
  {
    id: "R-04",
    kpis: ["VEHICLE_UTIL", "CPD", "CPD_P95"],
    when: (ctx) => ctx.state.dec.levels.express && (ctx.metrics.expressRoutes ?? 0) > 0 && (ctx.metrics.expressUtil ?? 1) < 0.5,
    explain: (ctx) => [{ label: "utilización de las rutas express", value: pct(ctx.metrics.expressUtil ?? 0), ref: "R-04" }],
    apply: () => {},
    message: () => ({ title: "Promesa no alineada con la densidad", body: "El express sale con vehículos casi vacíos: el costo por pedido se dispara.", severity: "alerta" }),
  },
  {
    id: "R-05",
    kpis: ["STORE_OSA", "PERFECT", "OTIF"],
    when: (ctx) => ctx.state.flags.r05,
    explain: (ctx) => [{ label: "horas de picking en tienda vs. tope", value: `${r1(ctx.metrics.storeHours ?? 0)} / ${r1(ctx.metrics.storeCapHours ?? 0)} h`, ref: "R-05" }],
    apply: () => {},
    message: () => ({ title: "Tiendas saturadas de pedidos en línea", body: "El picking supera el tope de horas de piso: cae la disponibilidad en anaquel y suben los errores.", severity: "alerta" }),
  },
  {
    id: "R-06",
    kpis: ["OTD", "OTD_P95", "CSAT", "BACKLOG", "ORDERS"],
    when: (ctx) => ctx.state.flags.r06,
    explain: (ctx) => [
      { label: "holgura de la promesa", value: `${Math.round(ctx.state.dec.buffer * 100)}%`, ref: "D-23" },
      { label: "pedidos que pasan al día siguiente", value: Math.round(ctx.metrics.backlogOut ?? 0), ref: "R-06" },
    ],
    apply: (ctx) => {
      for (const z of ctx.state.zones) z.trust = Math.max(ctx.params.trust.min, z.trust - ctx.params.trust.r06Drop);
    },
    message: () => ({ title: "Backlog en día pico", body: "Sin holgura en la promesa, el pico deja pedidos para mañana: el OTD se desploma y los clientes lo resienten.", severity: "critico" }),
  },
  {
    id: "R-07",
    kpis: ["STOPS_HOUR", "CPD"],
    when: (ctx) => ctx.state.dec.rezoning === "daily" && ctx.state.dec.data !== "full",
    explain: () => [{ label: "re-zonificación diaria sin datos maduros: −10% paradas por hora", ref: "R-07" }],
    apply: () => {},
  },
  {
    id: "R-08",
    kpis: ["ROUTE_EFF", "OTD", "ETA_ACC"],
    when: (ctx) => (ctx.state.dec.routing === "ai" || ctx.state.dec.assignment === "ai") && ctx.state.dec.data === "basic",
    explain: () => [{ label: "IA con datos básicos: ~30% del beneficio", ref: "R-08" }],
    apply: () => {},
    message: () => ({ title: "IA sin datos", body: "Sin telemetría ni tráfico histórico, la IA de ruteo y asignación rinde una fracción de su potencial.", severity: "info" }),
  },
  {
    id: "R-09",
    kpis: ["STOPS_HOUR", "FADS", "EXCEPTION_RATE"],
    when: (ctx) => ctx.state.dec.pay === "per_stop",
    explain: () => [{ label: "pago por parada: más paradas por hora, intentos en falso y accidentes", ref: "R-09" }],
    apply: () => {},
  },
  {
    id: "R-10",
    kpis: ["BACKLOG", "OTD_P95", "CPD"],
    when: (ctx) => crowdShare(ctx) > 0.5 && (ctx.metrics.peak ?? 0) > 0 && ctx.params.territories[ctx.state.territory].crowdAvailability < 1,
    explain: () => [{ label: "dependencia de repartidores crowdsourced en pico con mercado escaso", ref: "R-10" }],
    apply: () => {},
    message: () => ({ title: "Rutas sin cubrir", body: "En el pico no hay suficientes repartidores independientes: pedidos que se quedan.", severity: "alerta" }),
  },
  {
    id: "R-11",
    kpis: ["EMPTY_MILES", "RETURN_COST", "STOPS_ROUTE"],
    when: (ctx) => ctx.state.dec.returnsConsolidation === "backhaul",
    explain: () => [{ label: "devoluciones recogidas en la ruta de salida", ref: "R-11" }],
    apply: () => {},
  },
  {
    id: "R-12",
    kpis: [],
    when: (ctx) => ctx.state.dec.report === "mean",
    explain: () => [{ label: "el reporte con promedio oculta los días críticos", ref: "R-12" }],
    apply: () => {},
  },
  {
    id: "R-13",
    kpis: ["BACKLOG", "OTD", "OTD_P95"],
    when: (ctx) => (ctx.metrics.restrictedCut ?? 0) > 0,
    explain: (ctx) => [{ label: "flota de combustión que no circula por contingencia", value: pct(ctx.metrics.restrictedCut ?? 0), ref: "R-13" }],
    apply: () => {},
  },
  {
    id: "R-14",
    kpis: ["FADS", "CPD", "STOPS_ROUTE"],
    when: (ctx) => ctx.state.dec.lockers > 0,
    explain: (ctx) => [{ label: "lockers en operación", value: ctx.state.dec.lockers, ref: "R-14" }],
    apply: () => {},
  },
];
