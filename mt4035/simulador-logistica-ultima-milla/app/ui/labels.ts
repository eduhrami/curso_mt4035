/** Textos de la interfaz de última milla: decisiones, opciones, KPIs y territorios (en español; KPIs con sigla en inglés). */
import type { KpiMeta, LabelMap } from "@mt4035/ui-kit";
import { params, type Strategy, type TerritoryId } from "../src/index.ts";

type PlayableTerritory = Exclude<TerritoryId, "minicaso">;

export const TABS = [
  { id: "Estrategia", label: "Estrategia" },
  { id: "Red", label: "Red" },
  { id: "Asignación", label: "Asignación" },
  { id: "Promesa", label: "Promesa" },
  { id: "Flota", label: "Flota" },
  { id: "Zonas y ruteo", label: "Zonas y ruteo" },
  { id: "Cliente", label: "Cliente" },
  { id: "Devoluciones", label: "Devoluciones" },
  { id: "Datos y seguridad", label: "Datos y seguridad" },
];

/** Opciones sin ambigüedad entre decisiones; las que cambian de sentido van en LABELS[id].options. */
export const OPTIONS: Record<string, string> = {
  speed: "Velocidad",
  reliability: "Confiabilidad",
  efficiency: "Eficiencia",
  nearest: "Nodo más cercano",
  lowest: "Menor costo",
  threshold: "Umbral de costo dinámico",
  ai: "IA",
  "1h": "1 h",
  "2h": "2 h",
  "4h": "4 h",
  day: "Todo el día",
  customer: "Por cliente",
  category: "Por categoría",
  zone: "Por zona",
  none: "Ninguno",
  "3pl": "3PL",
  own: "Propia",
  own_3pl: "Propia 60% + 3PL",
  own_crowd: "Propia 60% + crowdsourced",
  crowd: "Crowdsourced",
  van: "Camioneta de combustión",
  ev: "Camioneta eléctrica",
  moto: "Moto",
  bike: "Bici de carga",
  reefer: "Refrigerada",
  coolers: "Hieleras",
  multi: "Multi-temperatura",
  lean: "Justa (−10%)",
  standard: "Estándar",
  ample: "Holgada (+25%)",
  fixed: "Fija",
  per_stop: "Por parada",
  mixed: "Mixta",
  advance: "Contrato anticipado",
  spot: "Spot (de último momento)",
  kmeans: "k-means",
  balanced: "Balanceada",
  capacitated: "Con capacidad",
  dynamic: "Dinámica",
  never: "Nunca",
  quarterly: "Trimestral",
  monthly: "Mensual",
  daily: "Diaria",
  manual: "Manual",
  heuristic: "Heurística",
  vrptw: "VRPTW (optimizador)",
  euclid: "Distancia euclidiana",
  avgtime: "Tiempo promedio",
  timedep: "Tiempo según la hora",
  fresh_first: "Frescos primero",
  sms: "SMS con ETA",
  live: "Seguimiento en vivo",
  capture: "Captura con referencias",
  geocode: "Geocodificación",
  retry_same: "Reintentar el mismo día",
  retry_next: "Reintentar al día siguiente",
  divert: "Desviar a locker o tienda",
  neighbor: "Dejar con vecino",
  allow: "Permitido",
  limit: "Limitado",
  remove: "Eliminado",
  pickup: "Recolección a domicilio",
  locker: "Locker",
  dedicated: "Rutas dedicadas",
  backhaul: "En la ruta de salida (backhaul)",
  corrective: "Correctivo",
  preventive: "Preventivo",
  low: "Baja",
  mid: "Media",
  high: "Alta",
};

export const LABELS: LabelMap = {
  "D-00": { help: "Fija cómo se evalúa tu desempeño. Solo puedes cambiarla una vez, con penalización." },
  "D-01": {
    help: "Surtido desde el CD. Para apagarlo necesitas otro nodo que ya esté operando.",
    fields: { active: "Activo", capacity: "Capacidad de picking" },
    options: { low: "2,000 pedidos/día", mid: "3,500 pedidos/día", high: "5,000 pedidos/día" },
  },
  "D-02": { help: "Las tiendas surten pedidos de su zona: menos troncal, más costo de picking y riesgo para el anaquel. Opera el mes siguiente.", fields: { share: "Tiendas que surten", pickers: "Surtidores por tienda" }, format: "pct", step: 0.05 },
  "D-03": { help: "El cliente recoge en tienda: sin ruta ni primer intento fallido. Opera el mes siguiente." },
  "D-04": { help: "Cada dark store surte su zona y una vecina. Tarda 3 meses; capex de US$ 600 mil.", unit: "dark stores" },
  "D-05": { help: "Cada MFC automatizado surte su zona y tres vecinas. Tarda 6 meses; capex de US$ 4 M.", unit: "MFC" },
  "D-06": { help: "Puntos de entrega desatendidos: una parada recibe muchos pedidos. Opera el mes siguiente.", unit: "lockers" },
  "D-07": { help: "Cross-dock cerca de las zonas lejanas: consolida la troncal. Tarda 2 meses.", unit: "hubs" },
  "D-10": { help: "«Más cercano» ignora la capacidad: si el nodo se llena, el resto se atrasa. El umbral dinámico reparte." },
  "D-11": { options: { "5": "5 min", "15": "15 min", "60": "60 min", "240": "240 min" }, help: "Lotes más cortos: ciclo más rápido, asignación un poco más cara." },
  "D-12": { help: "Tope de horas de piso para picking en línea. Si se excede, cae la disponibilidad en anaquel (R-05).", format: "pct", step: 0.05 },
  "D-20": { help: "Más niveles fragmentan las rutas. El express exige un nodo en la zona.", fields: { express: "Express (< 2 h)", sameday: "Mismo día", nextday: "Día siguiente", standard: "Estándar (2–4 días)" } },
  "D-21": { help: "Ventanas más angostas: más clientes en casa, menos paradas por ruta y menos puntualidad." },
  "D-22": { options: { "12": "12:00", "14": "14:00", "16": "16:00" }, help: "Un corte tardío capta más pedidos del mismo día y carga la tarde." },
  "D-23": { help: "Prometer con holgura: más puntualidad y algo menos de demanda. En picos, promete un día más.", format: "pct", step: 0.05 },
  "D-24": { help: "Segmentar por zona agrupa niveles y reduce la fragmentación de rutas." },
  "D-25": { help: "Tarifa más alta: menos pedidos; umbral de envío gratis: canastas más grandes.", fields: { fee: "Tarifa (US$)", freeThreshold: "Envío gratis desde (US$)" }, step: 0.5 },
  "D-26": { options: { none: "Sin tope", "100": "Tope = capacidad", "110": "Tope = capacidad + 10%" }, help: "Publicar capacidad por ventana: rechazas pedidos en picos en lugar de atrasarlos." },
  "D-30": { help: "La propia es costo fijo; el 3PL cobra margen; crowdsourced cobra por entrega y puede no llegar." },
  "D-31": { help: "Eléctricas: energía barata y sin restricción ambiental, con autonomía limitada. Motos y bicis solo desde nodos en la zona." },
  "D-32": { help: "El frío reduce el spoilage de frescos." },
  "D-33": { help: "Tamaño de la flota propia frente a la necesidad del mes anterior." },
  "D-34": { fields: { two: "Dos turnos", weekends: "Fines de semana" } },
  "D-35": { help: "Pago por parada: más paradas por hora y más intentos en falso y accidentes (R-09)." },
  "D-36": { help: "Flota extra en meses pico. El contrato anticipado se firma un mes antes; el spot es caro y poco confiable." },
  "D-40": { help: "Hay un número óptimo de zonas: pocas son enormes, muchas fragmentan.", unit: "zonas" },
  "D-41": { help: "Cómo se trazan las zonas: las balanceadas y con capacidad reparten mejor la carga; la dinámica necesita datos maduros." },
  "D-42": { help: "Re-zonificar seguido sin datos maduros quita familiaridad a los choferes (R-07)." },
  "D-43": { help: "La IA con datos básicos rinde ~30% de su potencial (R-08)." },
  "D-44": { help: "El tiempo según la hora requiere telemetría + tráfico (D-60)." },
  "D-45": { help: "Cargar los frescos al final para entregarlos primero: menos tiempo fuera del frío." },
  "D-50": {},
  "D-51": {},
  "D-52": { help: "Desviar requiere lockers o recoger en tienda." },
  "D-53": { help: "Quitar el pago contra entrega reduce rechazos, pero pierdes pedidos (más en Norte)." },
  "D-55": { options: { store: "En tienda" }, help: "Devolver en locker requiere lockers." },
  "D-56": {},
  "D-60": { options: { basic: "Básicos", gps: "Telemetría GPS", full: "Telemetría + tráfico" }, help: "Cuesta por vehículo y tarda en implantarse (1–2 meses)." },
  "D-61": { options: { mean: "Promedio del mes", daily: "Serie diaria", p95: "p95 (días críticos)" }, help: "Solo cambia lo que ves en el dashboard; el puntaje usa siempre p95 (R-12)." },
  "D-62": { options: { none: "Ninguna", gps: "GPS", full: "GPS + botón de pánico + horarios variables" } },
  "D-63": {},
};

const P95_NOTE = " (5% de los peores días)";

export const KPI_META: KpiMeta[] = [
  { id: "OTD", acronym: "OTD", name: "Entregas a tiempo", formula: "Entregas dentro de la ventana prometida / entregas", format: "pct", higherIsBetter: true },
  { id: "FADS", acronym: "FADS", name: "Entrega al primer intento", formula: "Entregas exitosas al primer intento / intentos", format: "pct", higherIsBetter: true },
  { id: "CPD", acronym: "CPD", name: "Costo por entrega", formula: "Costo de última milla / entregas exitosas (US$)", format: "num2", higherIsBetter: false },
  { id: "CYCLE_HOURS", acronym: "Order Cycle Time", name: "Tiempo de ciclo del pedido", formula: "Horas promedio de la compra a la entrega", format: "num1", higherIsBetter: false },
  { id: "CSAT", acronym: "CSAT", name: "Satisfacción del cliente", formula: "Calificación promedio (1–5)", format: "num2", higherIsBetter: true },
  { id: "SPOIL_RATE", acronym: "Spoilage", name: "Frescos dañados", formula: "Pedidos frescos que llegan tibios / pedidos frescos", format: "pct", higherIsBetter: false },
  { id: "VEHICLE_UTIL", acronym: "Vehicle Util.", name: "Utilización de vehículo", formula: "Paradas / capacidad de los vehículos en ruta", format: "pct", higherIsBetter: true },
  { id: "MARGIN_PCT", acronym: "Margen", name: "Margen del canal en línea", formula: "(Margen de canasta + tarifas − costo de última milla − reembolsos) / ventas", format: "pct", higherIsBetter: true },
  { id: "BACKLOG", acronym: "Backlog", name: "Pedidos que pasan al día siguiente", formula: "Pedidos no entregados / carga del día", format: "pct", higherIsBetter: false },
  { id: "EXCEPTION_RATE", acronym: "Exceptions", name: "Tasa de excepciones", formula: "Fallas, daños, spoilage y robos / entregas", format: "pct", higherIsBetter: false },
  { id: "OTIF", acronym: "OTIF", name: "A tiempo y completo", formula: "OTD × pedidos completos", format: "pct", higherIsBetter: true },
  { id: "PERFECT", acronym: "Perfect Order", name: "Orden perfecta", formula: "A tiempo × completa × sin daño × documentos correctos", format: "pct", higherIsBetter: true },
  { id: "ETA_ACC", acronym: "ETA accuracy", name: "Precisión del ETA", formula: "1 − error del ETA / ancho de la ventana", format: "pct", higherIsBetter: true },
  { id: "STOPS_ROUTE", acronym: "Stops/route", name: "Paradas por ruta", formula: "Paradas / rutas", format: "num1", higherIsBetter: true },
  { id: "ROUTE_EFF", acronym: "Route Efficiency", name: "Eficiencia de ruta", formula: "km del mejor diseño posible / km reales", format: "pct", higherIsBetter: true },
  { id: "NODE_UTIL", acronym: "Node Util.", name: "Utilización máxima de nodo", formula: "Pedidos surtidos / capacidad de picking (nodo más cargado)", format: "pct", higherIsBetter: false },
  { id: "STORE_OSA", acronym: "OSA tienda", name: "Disponibilidad en anaquel de tiendas SFS", formula: "Baja si el picking en línea excede el tope (R-05)", format: "pct", higherIsBetter: true },
  { id: "EMPTY_MILES", acronym: "Empty Miles", name: "Kilómetros en vacío", formula: "km sin carga / km totales", format: "pct", higherIsBetter: false },
  { id: "CO2", acronym: "CO₂", name: "Emisiones por entrega", formula: "kg de CO₂ / entrega", format: "num2", higherIsBetter: false },
  { id: "SHIP_PCT", acronym: "Costo/ventas", name: "Costo de última milla / ventas", formula: "Costo de última milla / ventas en línea", format: "pct", higherIsBetter: false },
  { id: "ORDERS", acronym: "Pedidos", name: "Pedidos del mes", formula: "Pedidos capturados", format: "num0", higherIsBetter: true },
  { id: "OTD_P95", acronym: "OTD p95", name: `Entregas a tiempo${P95_NOTE}`, formula: "Percentil 5 del OTD diario", format: "pct", higherIsBetter: true },
  { id: "FADS_P95", acronym: "FADS p95", name: `Primer intento${P95_NOTE}`, formula: "Percentil 5 del FADS diario", format: "pct", higherIsBetter: true },
  { id: "CPD_P95", acronym: "CPD p95", name: `Costo por entrega${P95_NOTE}`, formula: "Percentil 95 del CPD diario (US$)", format: "num2", higherIsBetter: false },
  { id: "CSAT_P95", acronym: "CSAT p95", name: `Satisfacción${P95_NOTE}`, formula: "Percentil 5 de la CSAT diaria", format: "num2", higherIsBetter: true },
];

/** KPI con los guardrails del territorio (§7.2 y normalización por territorio). */
export function kpiMetaFor(territory: PlayableTerritory): KpiMeta[] {
  const local = (params.score.territories as Record<string, { guardrails?: { kpi: string; op: string; value: number }[] }>)[territory]?.guardrails;
  const gr = local ?? params.score.guardrails;
  return KPI_META.map((m) => {
    const g = gr.find((x) => x.kpi === m.id);
    return g ? { ...m, guardrail: { op: g.op as ">=" | "<=", value: g.value } } : m;
  });
}

/** Con D-61 en p95, las tarjetas principales muestran la versión de días críticos. */
export const P95_OF: Record<string, string> = { OTD: "OTD_P95", FADS: "FADS_P95", CPD: "CPD_P95", CSAT: "CSAT_P95" };

export const KPI_NAMES: Record<string, string> = {
  ...Object.fromEntries(KPI_META.map((m) => [m.id, m.acronym])),
  DELIVERED: "Entregas",
  REVENUE: "Ventas",
  MARGIN: "Margen (US$)",
  CPD_URBAN: "CPD urbano",
  CPD_REMOTE: "CPD foráneo",
  CPD_RURAL: "CPD rural",
  RETURN_COST: "Costo por devolución",
  REJECTED: "Pedidos rechazados",
  CANCELLED: "Pedidos cancelados",
  FLEET_SHORT: "Flota faltante",
  OWN_FLEET: "Flota propia",
  DARK_STORES: "Dark stores",
  MFC_COUNT: "MFC",
  LOCKERS: "Lockers",
  SFS_SHARE: "% SFS",
  LINEHAUL_KM: "km de troncal por pedido",
  FRESH_ROUTE_HOURS: "Horas de ruta con frescos",
  STOPS_HOUR: "Paradas por hora",
  STOPS_RURAL: "Paradas por ruta rural",
  NPS: "NPS",
  PEAK_DAYS: "Días pico",
};

export const STRATEGY_TEXT: Record<Strategy, string> = {
  speed: "Pesa más el tiempo de ciclo y la satisfacción del cliente.",
  reliability: "Pesa más la puntualidad en los peores días (OTD p95) y la satisfacción.",
  efficiency: "Pesa más el costo por entrega en los peores días (CPD p95).",
};

export const TERRITORY_TEXT: Record<PlayableTerritory, { title: string; tagline: string; facts: string[] }> = {
  megalopolis: {
    title: "Megalópolis Centro",
    tagline: "Urbano denso con tráfico severo y competencia de quick commerce.",
    facts: ["~2,500 pedidos/día, 45 tiendas, CD periférico a 25–40 km", "Tráfico lento (~15 km/h) y muy variable", "Clientes fuera de casa de día; edificios y cotos", "Lluvias e inundaciones (jun–sep); no circula los días de contingencia"],
  },
  bajio: {
    title: "Ciudad Bajío",
    tagline: "Ciudad media ordenada: direcciones de calidad y tráfico moderado.",
    facts: ["~600 pedidos/día, 15 tiendas, CD a 10–15 km", "Tráfico medio (~30 km/h)", "Fraccionamientos con caseta; presencia media", "Marketplaces como competencia"],
  },
  norte: {
    title: "Región Norte",
    tagline: "Ciudad principal + 4 ciudades lejanas + zona rural, con calor extremo.",
    facts: ["~400 pedidos/día; 60% en la ciudad principal", "Ciudades a 80–250 km; zona rural dispersa", "30% de pedidos con pago contra entrega", "Calor extremo (may–ago); pocos repartidores crowdsourced"],
  },
};

export const MARKET_FIELDS: { key: string; label: string; options: Record<string, string> }[] = [
  { key: "growth", label: "Crecimiento del canal en línea", options: { slow: "Lento (+10%/año)", medium: "Medio (+25%/año)", explosive: "Explosivo (+50%/año)" } },
  { key: "speedSensitivity", label: "Sensibilidad a la velocidad", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "feeSensitivity", label: "Sensibilidad a la tarifa de envío", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "freshMix", label: "Mezcla de frescos", options: { low: "Baja", mid: "Media", high: "Alta" } },
  { key: "fuel", label: "Gasolina", options: { stable: "Estable", volatile: "Volátil" } },
  { key: "labor", label: "Mercado de choferes", options: { loose: "Holgado", tight: "Escaso" } },
  { key: "returns", label: "Devoluciones", options: { low: "Bajas (abarrotes)", mid: "Medias (mercancía general)", fashion: "Altas (moda)" } },
];

export const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Texto breve de un valor de decisión (para el diálogo de confirmación). */
export function describeValue(id: string, v: unknown): string {
  const local = LABELS[id]?.options ?? {};
  const opt = (x: unknown) => local[String(x)] ?? OPTIONS[String(x)] ?? String(x);
  if ((id === "D-12" || id === "D-23") && typeof v === "number") return `${(v * 100).toFixed(0)}%`;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === "string") return opt(v);
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v && typeof v === "object") {
    const f = LABELS[id]?.fields ?? {};
    if (id === "D-20")
      return (
        Object.entries(v as Record<string, boolean>)
          .filter(([, on]) => on)
          .map(([k]) => f[k] ?? k)
          .join(", ") || "ninguno"
      );
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${f[k] ?? k}: ${id === "D-02" && k === "share" && typeof x === "number" ? `${(x * 100).toFixed(0)}%` : typeof x === "number" ? (Number.isInteger(x) ? String(x) : x.toFixed(2)) : typeof x === "boolean" ? (x ? "Sí" : "No") : opt(x)}`)
      .join(", ");
  }
  return String(v);
}
