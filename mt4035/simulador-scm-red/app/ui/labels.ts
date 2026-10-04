/** Textos de la interfaz SCM: decisiones, opciones, KPIs y regiones (en español; KPIs con sigla en inglés). */
import type { KpiMeta, LabelMap } from "@mt4035/ui-kit";
import { params, type RegionId, type Strategy } from "../src/index.ts";

export const TABS = [
  { id: "Estrategia", label: "Estrategia" },
  { id: "Red", label: "Red" },
  { id: "Flujo", label: "Flujo" },
  { id: "Inventario", label: "Inventario" },
  { id: "Información", label: "Información" },
];

const CATS = { fresh: "Frescos", chilled: "Refrigerado", ambient: "Ambiente", frozen: "Congelado", chilled_: "Refrigerado" };

export const OPTIONS: Record<string, string> = {
  freshness: "Frescura y proximidad",
  lowcost: "Bajo costo",
  convenience: "Conveniencia y amplitud",
  dominance: "Dominancia (clusters)",
  dispersed: "Dispersa",
  mixed: "Mixta",
  dc: "Por CD",
  dsd: "Directo (DSD)",
  supplier: "Por proveedor",
  combined: "Combinada por temperatura",
  own: "Propia",
  dedicated: "3PL dedicado",
  spot: "3PL spot",
  mono: "Mono-temperatura",
  multi: "Multi-temperatura",
  peak: "Horas pico",
  offpeak: "Horas valle",
  corrective: "Correctivo",
  preventive: "Preventivo",
  predictive: "Predictivo",
  rop: "ROP / EOQ",
  periodic: "Revisión periódica",
  tanpin: "Tanpin kanri",
  manual: "Conteo manual",
  scan: "Escaneo contra pedido",
  fifo: "FIFO estricto",
  discount: "Descuento por caducidad",
  basic: "POS básico",
  pos_daily: "POS con análisis diario",
  pos_terminal: "POS + terminal gráfica",
  no: "No",
  weekly: "Semanal",
  daily: "Diario",
  moving_avg: "Promedio móvil",
  seasonal: "Estacional",
  causal: "Causal",
  arms: "Arm's-length",
  vmi: "VMI",
  cpfr: "CPFR",
  low: "Baja",
  mid: "Media",
  high: "Alta",
  stocking: "Con inventario",
  crossdock: "Cross-dock",
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
};

export const LABELS: LabelMap = {
  "D-00": { help: "Fija cómo se evalúa tu desempeño. Solo puedes cambiarla una vez, con penalización." },
  "D-01": { help: "Cada CD tarda 2–4 trimestres en construirse según su tamaño. No se puede mover de zona ni reducir." },
  "D-05": { help: "Decide dónde se ubican las tiendas nuevas: concentradas alrededor de tus CD o repartidas." },
  "D-06": { help: "Ritmo anual de aperturas (+) o cierres (−). Surte efecto el trimestre siguiente.", format: "pct", step: 0.01 },
  "D-07": { help: "Plantas de proveedores cerca de tus CD: acortan el lead time de frescos (3 trimestres).", fields: { fresh: "Frescos", chilled: "Refrigerado" } },
  "D-08": { help: "Abre un lote de tiendas el trimestre siguiente. Indispensable si empiezas desde cero.", unit: "tiendas" },
  "D-10": { help: "Por CD consolida entregas; directo (DSD) evita el CD pero llena la tienda de camiones.", fields: CATS },
  "D-11": { help: "Entregas por semana a cada tienda. Más frecuencia: más frescura y más costo de transporte.", fields: CATS, unit: "/sem" },
  "D-12": { help: "Combinada: un camión por temperatura con varios proveedores. Requiere un CD combinado." },
  "D-13": {},
  "D-14": { help: "Multi-temperatura y telemetría reducen las fallas de cadena de frío.", fields: { type: "Vehículo", telemetry: "Telemetría" } },
  "D-15": { help: "En horas valle hay menos tráfico, pero sin escaneo el chofer espera a que alguien reciba." },
  "D-16": {},
  "D-20": { help: "Tanpin kanri (pedido por hipótesis del encargado) requiere POS + terminal gráfica." },
  "D-21": { help: "Nivel de servicio objetivo por ciclo: define el stock de seguridad.", fields: CATS, format: "pct", step: 0.01 },
  "D-22": { help: "Más SKUs: más ventas potenciales, más stock de seguridad y más merma.", fields: { skus: "SKUs por tienda", local: "Surtido local" } },
  "D-23": { help: "El escaneo acelera la recepción y reduce errores." },
  "D-24": { help: "Días de stock de seguridad en el CD (solo CD con inventario). Amortigua fallas del proveedor.", unit: "días", step: 0.5 },
  "D-25": {},
  "D-30": { help: "Reduce el error de pronóstico. Tarda 2–3 trimestres en implantarse y 2 más en madurar." },
  "D-31": { help: "Los proveedores pronostican con tu demanda real: baja el efecto bullwhip." },
  "D-32": {},
  "D-33": { help: "VMI y CPFR requieren compartir POS (D-31)." },
  "D-34": { help: "Multiplica el beneficio de tanpin kanri." },
};

export const KPI_META: KpiMeta[] = [
  { id: "OSA", acronym: "OSA", name: "Disponibilidad en anaquel", formula: "Tiempo con stock / tiempo total", format: "pct", higherIsBetter: true },
  { id: "OTIF", acronym: "OTIF", name: "A tiempo y completo (CD→tienda)", formula: "Entregas a tiempo y completas / entregas", format: "pct", higherIsBetter: true },
  { id: "CTS_PCT", acronym: "CTS", name: "Costo logístico / ventas", formula: "Costo logístico total / ventas", format: "pct", higherIsBetter: false },
  { id: "WASTE", acronym: "Waste", name: "Merma", formula: "Unidades mermadas / recibidas", format: "pct", higherIsBetter: false },
  { id: "LOST_SALES", acronym: "Lost Sales", name: "Ventas perdidas", formula: "Demanda no atendida ni sustituida / demanda", format: "pct", higherIsBetter: false },
  { id: "ITR", acronym: "ITR", name: "Rotación de inventario", formula: "COGS anual / inventario promedio", format: "num1", higherIsBetter: true },
  { id: "EBITDA_PCT", acronym: "EBITDA", name: "EBITDA logístico / ventas", formula: "(Margen − merma − costos logísticos) / ventas", format: "pct", higherIsBetter: true },
  { id: "BWR", acronym: "BWR", name: "Efecto bullwhip", formula: "Var(órdenes al proveedor) / Var(demanda)", format: "num2", higherIsBetter: false },
  { id: "TRUCKS", acronym: "Trucks", name: "Camiones por tienda al día", formula: "Entregas / tiendas / día", format: "num1", higherIsBetter: false },
  { id: "OSA_FRESH", acronym: "OSA frescos", name: "Disponibilidad de frescos", formula: "Ventas / demanda de frescos", format: "pct", higherIsBetter: true },
  { id: "WASTE_FRESH", acronym: "Waste frescos", name: "Merma de frescos", formula: "Merma / recibido de frescos", format: "pct", higherIsBetter: false },
  { id: "LT", acronym: "LT", name: "Lead time proveedor→tienda", formula: "Promedio ponderado por demanda (días)", format: "days", higherIsBetter: false },
];

/** KPI con los guardrails de la región (§7.2 y normalización por región). */
export function kpiMetaFor(region: RegionId): KpiMeta[] {
  const gr = params.score.regions[region]?.guardrails ?? params.score.guardrails;
  return KPI_META.map((m) => {
    const g = gr.find((x) => x.kpi === m.id);
    return g ? { ...m, guardrail: { op: g.op as ">=" | "<=", value: g.value } } : m;
  });
}

export const KPI_NAMES: Record<string, string> = {
  ...Object.fromEntries(KPI_META.map((m) => [m.id, m.acronym])),
  CTS_STORE: "CTS/tienda",
  SALES: "Ventas",
  DEMAND: "Demanda",
  STORES: "Tiendas",
  LT_SD: "σ LT",
  OFR: "OFR",
  GMROI: "GMROI",
};

export const STRATEGY_TEXT: Record<Strategy, string> = {
  freshness: "Pesa más la disponibilidad, la merma y la rotación.",
  lowcost: "Pesa más el costo logístico y el EBITDA.",
  convenience: "Pesa más la disponibilidad y las ventas perdidas.",
};

export const REGION_TEXT: Record<RegionId, { title: string; tagline: string; facts: string[] }> = {
  kaigan: {
    title: "Kaigan",
    tagline: "Franja costera muy densa (tipo Japón). La red original de Hoshi Mart.",
    facts: ["1,800 tiendas en clusters", "12 CD combinados por temperatura", "Frescos 3 veces al día", "POS diario compartido con proveedores"],
  },
  redriver: {
    title: "Red River",
    tagline: "Corredor extenso y disperso (tipo EE.UU.). Prairie Stop, recién adquirida.",
    facts: ["1,200 tiendas dispersas", "Sin CD: 40+ proveedores entregan directo (DSD)", "Pocos frescos, muchos faltantes", "Pedido manual, POS básico"],
  },
  valle: {
    title: "Valle Metropolitano",
    tagline: "Núcleo urbano congestionado y periferia extendida (tipo México).",
    facts: ["600 tiendas: 70% en el núcleo", "2 CD con inventario", "Frescos por DSD", "Congestión alta y muy variable"],
  },
};

export const MARKET_FIELDS: { key: string; label: string; options: Record<string, string> }[] = [
  { key: "growth", label: "Crecimiento de la demanda", options: { stagnant: "Estancado (0%)", moderate: "Moderado (+3%/año)", boom: "Boom (+8%/año)" } },
  { key: "seasonality", label: "Estacionalidad", options: { soft: "Suave", marked: "Marcada" } },
  { key: "volatility", label: "Volatilidad de la demanda", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "fuel", label: "Combustible", options: { stable: "Estable", volatile: "Volátil", rising: "Al alza" } },
  { key: "competition", label: "Competencia", options: { passive: "Pasiva", aggressive: "Agresiva" } },
  { key: "labor", label: "Mercado de choferes", options: { loose: "Holgado", tight: "Escaso" } },
  { key: "demographics", label: "Demografía", options: { stable: "Estable", aging: "Envejecimiento" } },
  { key: "supplierReliability", label: "Confiabilidad de proveedores", options: { high: "Alta", mid: "Media", low: "Baja" } },
];

/** Texto breve de un valor de decisión (para el diálogo de confirmación). */
export function describeValue(id: string, v: unknown): string {
  const opt = (x: unknown) => OPTIONS[String(x)] ?? String(x);
  if (id === "D-01" && Array.isArray(v)) return v.length ? v.map((d) => `${d.id}: zona ${d.zone}, ${opt(d.type)}, ${opt(d.size)}`).join(" · ") : "sin CD";
  if (id === "D-06" && typeof v === "number") return `${(v * 100).toFixed(0)}% anual`;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === "string") return opt(v);
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v && typeof v === "object") {
    const f = LABELS[id]?.fields ?? {};
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${f[k] ?? k}: ${typeof x === "number" && !Number.isInteger(x) ? `${(x * 100).toFixed(0)}%` : opt(x)}`)
      .join(", ");
  }
  return String(v);
}
