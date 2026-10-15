/**
 * Reglas de causa–efecto (especificación §6.4). Las reglas que modifican el estado lo hacen con
 * banderas que el tick siguiente lee (R-01, R-02, R-04) o directamente (R-03). Las demás
 * describen efectos que ya están en las fórmulas del tick; se registran para que el log causal
 * y los mensajes expliquen al alumno por qué se mueven los KPIs.
 */
import type { RuleDef, TickContext } from "@mt4035/sim-core";
import { activeDcs } from "./network.ts";
import { CATEGORIES, type Params, type ScmState } from "./types.ts";

type Rule = RuleDef<ScmState, Params>;
type Ctx = TickContext<ScmState, Params>;

const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const dcTypes = (ctx: Ctx) => activeDcs(ctx.state, ctx.state.epoch).map((d) => d.type);
const highWasteZones = (ctx: Ctx, c: (typeof CATEGORIES)[number]) => ctx.state.highWaste?.[c] ?? [];

export const rules: Rule[] = [
  {
    id: "R-01",
    kpis: ["WASTE", "WASTE_FRESH", "OSA_FRESH", "EBITDA_PCT"],
    when: (ctx) => (ctx.metrics.freshRouteHours ?? 0) > ctx.params.excursion.longRouteHours,
    explain: (ctx) => [{ label: "tiempo medio hasta la última entrega de frescos (h)", value: r1(ctx.metrics.freshRouteHours ?? 0), ref: "R-01" }],
    apply: (ctx) => {
      ctx.state.flags.r01 = true;
    },
    message: (ctx) => ({
      title: "Rutas largas con frescos",
      body: `Las rutas de frescos tardan en promedio ${r1(ctx.metrics.freshRouteHours ?? 0)} h (> ${ctx.params.excursion.longRouteHours} h): sube la probabilidad de spoilage y la merma.`,
      severity: "alerta",
    }),
  },
  {
    id: "R-02",
    kpis: ["OSA", "OSA_FRESH", "LOST_SALES", "EBITDA_PCT", "SALES"],
    when: (ctx) => CATEGORIES.some((c) => highWasteZones(ctx, c).length > 0),
    explain: (ctx) =>
      CATEGORIES.filter((c) => highWasteZones(ctx, c).length > 0).map((c) => ({
        label: `zonas con merma semanal de ${ctx.params.categories[c].label.toLowerCase()} > 6% (máx. ${pct(Math.max(...ctx.state.lastWaste[c]))})`,
        value: highWasteZones(ctx, c).length,
        ref: "R-02",
      })),
    apply: (ctx) => {
      for (const c of CATEGORIES) for (const zi of highWasteZones(ctx, c)) ctx.state.flags.r02[c][zi] = true;
    },
    message: () => ({ title: "Merma alta", body: "La merma superó 6% en la semana en algunas zonas: la próxima semana habrá más faltantes ahí.", severity: "alerta" }),
  },
  {
    id: "R-03",
    kpis: ["OSA", "SALES", "DEMAND", "LOST_SALES", "EBITDA_PCT"],
    when: (ctx) => ctx.state.zones.some((z) => z.stores > 0 && z.lowOsaWeeks >= 2),
    explain: (ctx) => {
      const zs = ctx.state.zones.filter((z) => z.stores > 0 && z.lowOsaWeeks >= 2);
      return [{ label: "zonas con OSA < 90% dos semanas o más", value: zs.length, ref: "R-03" }];
    },
    apply: (ctx) => {
      const t = ctx.params.trust;
      for (const z of ctx.state.zones) if (z.stores > 0 && z.lowOsaWeeks >= 2) z.trust = Math.max(t.min, z.trust - t.drop);
    },
    message: () => ({ title: "Clientes que dejan de volver", body: "Faltantes repetidos durante dos semanas: baja la demanda base de las zonas afectadas.", severity: "critico" }),
  },
  {
    id: "R-04",
    kpis: ["CTS_PCT", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
    when: (ctx) => (ctx.metrics.maxDeliveriesPerStoreDay ?? 0) > ctx.params.receiving.overloadDeliveries,
    explain: (ctx) => [{ label: "entregas por tienda al día (máx.)", value: r1(ctx.metrics.maxDeliveriesPerStoreDay ?? 0), ref: "R-04" }],
    apply: (ctx) => {
      ctx.state.flags.r04 = true;
    },
    message: () => ({ title: "Tiendas saturadas de camiones", body: "Más de 15 entregas por tienda al día: cada proveedor llega en su propio camión. Sube el costo de recepción y los errores; consolidar en un CEDIS combinado reduce los camiones.", severity: "alerta" }),
  },
  {
    id: "R-05",
    kpis: ["CTS_PCT", "CTS_STORE", "EBITDA_PCT"],
    when: (ctx) => ctx.state.dec.freq.fresh >= 14 && (ctx.metrics.deltaDcMeanFresh ?? 0) > 10,
    explain: (ctx) => [
      { label: "frecuencia de frescos (entregas/semana)", value: ctx.state.dec.freq.fresh, ref: "D-11" },
      { label: "distancia media entre tiendas (km)", value: r1(ctx.metrics.deltaDcMeanFresh ?? 0), ref: "E-04" },
    ],
    apply: () => {},
    message: (ctx) => ({
      title: "Modelo no alineado con la geografía",
      body: `Reponer frescos 2 veces al día con tiendas a ${r1(ctx.metrics.deltaDcMeanFresh ?? 0)} km entre sí dispara el costo de transporte.`,
      severity: "alerta",
    }),
  },
  {
    id: "R-06",
    kpis: ["OSA", "OTIF", "EBITDA_PCT", "LOST_SALES", "SALES"],
    when: (ctx) => ctx.state.market.supplierReliability === "low" && dcTypes(ctx).some((t) => t !== "stocking"),
    explain: () => [{ label: "cross-dock sin inventario con proveedores poco confiables", ref: "R-06" }],
    apply: () => {},
    message: () => ({ title: "Sin amortiguador", body: "Con cross-dock sin inventario, cualquier falla del proveedor llega completa al anaquel.", severity: "info" }),
  },
  {
    id: "R-07",
    kpis: ["OTIF", "WASTE", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
    when: (ctx) => (ctx.metrics.dcUtilMax ?? 0) > ctx.params.dc.highUtil,
    explain: (ctx) => [{ label: "utilización máxima de CEDIS", value: pct(ctx.metrics.dcUtilMax ?? 0), ref: "R-07" }],
    apply: (ctx) => {
      ctx.state.flags.r07 = true;
    },
    message: (ctx) => ({ title: "CEDIS saturado", body: `Un CEDIS opera al ${pct(ctx.metrics.dcUtilMax ?? 0)}: se alarga la estancia, cae la frescura y hay retrasos.`, severity: "alerta" }),
  },
  {
    id: "R-08",
    kpis: ["LT", "LT_SD", "OTIF", "EBITDA_PCT"],
    when: (ctx) => ctx.state.dec.collaboration === "cpfr" && ctx.state.dec.sharing === "yes" && ctx.state.cpfrMaturity >= 1,
    explain: () => [{ label: "POS diario + CPFR: lead time −20%, variabilidad −30%", ref: "R-08" }],
    apply: () => {},
  },
  {
    id: "R-09",
    kpis: ["OSA", "WASTE", "EBITDA_PCT", "LOST_SALES", "SALES"],
    when: (ctx) => ctx.state.dec.policy === "tanpin" && ctx.state.dec.training === "low",
    explain: () => [{ label: "tanpin kanri con capacitación baja: la mitad del beneficio", ref: "R-09" }],
    apply: () => {},
    message: () => ({ title: "Tanpin kanri sin capacitación", body: "Sin capacitar a las tiendas, el pedido por hipótesis rinde la mitad.", severity: "info" }),
  },
  {
    id: "R-10",
    kpis: ["CTS_STORE", "SALES", "EBITDA_PCT"],
    when: (ctx) => ctx.state.dec.openingStrategy === "dominance",
    explain: () => [{ label: "clusters densos: más paradas por ruta y más canibalización", ref: "R-10" }],
    apply: () => {},
  },
  {
    id: "R-11",
    kpis: ["ITR", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
    when: (ctx) => ctx.state.dec.dcSafetyDays > 0 && dcTypes(ctx).includes("stocking"),
    explain: (ctx) => [{ label: "pooling de inventario en CEDIS (días)", value: ctx.state.dec.dcSafetyDays, ref: "R-11" }],
    apply: () => {},
  },
  {
    id: "R-12",
    kpis: ["CTS_PCT", "OTIF", "EBITDA_PCT"],
    when: (ctx) => ctx.state.dec.window === "offpeak",
    explain: (ctx) => [{ label: ctx.state.dec.receiving === "scan" ? "horas valle + escaneo: parada −30%" : "horas valle sin escaneo: el chofer espera", ref: "R-12" }],
    apply: () => {},
    message: (ctx) =>
      ctx.state.dec.receiving === "scan"
        ? { title: "Entrega en horas valle", body: "Con escaneo, las entregas nocturnas son más rápidas y evitan el tráfico.", severity: "info" }
        : { title: "Horas valle sin escaneo", body: "Sin escaneo contra pedido, el chofer espera a que alguien reciba: se pierde el beneficio.", severity: "alerta" },
  },
  {
    id: "R-13",
    kpis: ["OSA", "WASTE", "LOST_SALES", "SALES", "EBITDA_PCT"],
    when: (ctx) => ctx.state.flags.freqCapped.length > 0,
    explain: (ctx) => [{ label: "zonas donde la distancia al CEDIS limita la frecuencia de entrega", value: ctx.state.flags.freqCapped.length, ref: "R-13" }],
    apply: () => {},
    message: (ctx) => ({
      title: "Tiendas lejos del CEDIS",
      body: `En ${ctx.state.flags.freqCapped.length} zona(s) el viaje de ida y vuelta desde el CEDIS no permite la frecuencia que pediste: esas tiendas reciben menos visitas (hasta 2 al día si están cerca, 1 por semana si están muy lejos). Un CEDIS más cercano resuelve el límite.`,
      severity: "info",
    }),
  },
  {
    id: "R-14",
    kpis: ["SALES", "LOST_SALES", "OSA", "EBITDA_PCT"],
    when: (ctx) => ctx.state.flags.unserved.length > 0,
    explain: (ctx) => [{ label: "zonas con tiendas y sin CEDIS que las surta", value: ctx.state.flags.unserved.length, ref: "R-14" }],
    apply: () => {},
    message: (ctx) => ({
      title: "Tiendas sin CEDIS",
      body: `En ${ctx.state.flags.unserved.length} zona(s) hay tiendas y ningún CEDIS en operación que las surta: no reciben mercancía y pierden toda su venta. Cada CEDIS tarda varios trimestres en construirse.`,
      severity: "critico",
    }),
  },
];
