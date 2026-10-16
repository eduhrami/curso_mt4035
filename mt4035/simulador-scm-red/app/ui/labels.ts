/** Textos de la interfaz SCM: decisiones, opciones, KPIs y regiones (en español; KPIs con sigla en inglés). */
import type { KpiMeta, LabelMap } from "@mt4035/ui-kit";
import { decisions, params, presetOf, type RegionId, type Strategy } from "../src/index.ts";

export const TABS = [
  { id: "Pronóstico", label: "Pronóstico" },
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
  basic: "POS básico",
  pos_daily: "POS con análisis diario",
  pos_terminal: "POS + terminal gráfica",
  no: "No",
  yes: "Sí",
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

/**
 * «¿Cómo impacta?» (recurso didáctico): en qué dirección mueve cada decisión los KPIs y por qué. Las direcciones siguen
 * el diagrama causal y las reglas de la especificación (§6.2, §6.4); el efecto exacto depende de la región y del resto
 * de las decisiones.
 */
export const IMPACT: Record<string, string> = {
  "F-01":
    "Tu pronóstico fija cuánto piden las tiendas durante el año. Si te quedas corto, baja la OSA y suben las ventas perdidas; si te pasas, compras de más: sube el inventario (baja la ITR), sube la merma de frescos y aparecen rebajas que restan utilidad. El CV que captures dimensiona el stock de seguridad: subestimarlo deja a las tiendas sin protección ante picos. Con POS diario la reposición corrige parte del error con las ventas reales, así que equivocarse cuesta menos.",
  "D-01":
    "Más CEDIS acercan la mercancía a las tiendas: baja la distancia de reparto y el costo de transporte, sube la OTIF y, en frescos, baja la merma porque el producto pasa menos tiempo en ruta. A cambio sube el costo fijo (renta, personal) y la inversión, y cada CEDIS tarda 2–4 trimestres en operar. La ubicación es un trade-off: cerca de las plantas de proveedores (◆ en el mapa) baja el flete de entrada y la edad de los frescos; cerca de las tiendas baja el reparto. El tipo también importa: el CEDIS con inventario amortigua fallas del proveedor y permite stock de seguridad agregado (pooling), pero envejece el producto, y los frescos de vida corta pierden días de anaquel guardados en él; el cross-dock y el combinado mueven rápido sin almacenar, y el combinado es el único que permite consolidar varias temperaturas en un camión. La distancia también fija cuántas veces por semana puedes visitar cada tienda: cerca de un CEDIS, hasta 2 veces al día; muy lejos, 1 vez por semana. Un CEDIS saturado sube la merma y baja la OTIF. Todas las tiendas se surten desde un CEDIS: la red nunca puede quedar vacía, y una zona sin CEDIS en operación no recibe mercancía.",
  "D-05":
    "Define dónde caen las tiendas nuevas. La dominancia concentra aperturas en zonas donde ya hay tiendas: sube la densidad y las paradas por ruta, y baja el costo de servir por tienda (CTS), pero a partir de cierta densidad las tiendas se canibalizan y baja la venta por tienda. La apertura dispersa capta más mercado nuevo, pero alarga las rutas y sube el CTS. Solo cuenta cuando abres tiendas.",
  "D-08":
    "Cada tienda nueva suma ventas y margen bruto, pero cuesta inversión el trimestre en que decides el lote y abre el trimestre siguiente. Más tiendas también llenan los CEDIS: si la capacidad no alcanza, sube la utilización y con ella la merma y los retrasos. Dónde caen depende de la estrategia de apertura.",
  "D-09":
    "Cerrar tiendas quita sus ventas y su margen, pero también su costo de servirlas: conviene en zonas donde las tiendas están tan dispersas o tan lejos de los CEDIS que el reparto cuesta más de lo que dejan, o donde se canibalizan entre sí. Cada cierre cuesta una indemnización y el efecto en el costo de servir (CTS) aparece el trimestre siguiente. Las tiendas cerradas no vuelven: para crecer otra vez hay que abrir lotes nuevos.",
  "D-11":
    "Más entregas por semana bajan la cobertura de cada pedido: el producto llega más fresco (baja la merma), baja el inventario en tienda (sube la ITR) y sube la OSA. A cambio, cada entrega adicional cuesta transporte y recepción, así que sube el CTS. En frescos de vida corta la frecuencia alta suele pagarse; en abarrotes casi nunca. El máximo es de 2 visitas al día (14 por semana), y solo para tiendas cerca de un CEDIS: entre más lejos esté la tienda, menos visitas caben en la semana (hasta 1 por semana en las más lejanas). Pedir más de lo que permite la distancia no tiene efecto en esas zonas.",
  "D-12":
    "La consolidación combinada junta varios proveedores de la misma temperatura en un camión desde un CEDIS combinado: bajan drásticamente los camiones por tienda y el costo de recepción, y sube la OTIF. Por proveedor, cada uno llega por separado aunque pase por el CEDIS. Requiere un CEDIS combinado.",
  "D-20":
    "La política fija cómo repone cada tienda. El punto de reorden (ROP/EOQ) supone demanda estable: con estacionalidad y perecederos falla y sube la merma o los faltantes. La revisión periódica es más robusta ante la estacionalidad. El tanpin kanri (el encargado pide con hipótesis sobre clima y eventos) baja el error de pronóstico y con él el stock de seguridad y la merma, sube la OSA; requiere POS con terminal y rinde el doble con capacitación alta.",
  "D-22":
    "Más SKUs por tienda suben la venta potencial (el cliente encuentra más), pero reparten el anaquel: sube el stock de seguridad total, sube la merma y baja la ITR. El surtido local, con POS que lo respalde, adapta la mezcla a cada zona y sube la venta.",
  "D-23":
    "La recepción por escaneo contra pedido reduce el tiempo por parada (rutas más cortas, menor costo de transporte) y los errores de recepción, que restan OSA. Es indispensable para entregar en horas valle. Cuesta una inversión por tienda.",
  "D-24":
    "Días de stock de seguridad en los CEDIS con inventario: amortiguan las fallas del proveedor (sube el fill rate hacia tiendas, baja el riesgo de faltantes en eventos). Como el CEDIS junta la demanda de muchas tiendas, protege con menos inventario total que repartirlo en tiendas (pooling). A cambio sube el inventario en CEDIS y su costo, y los frescos envejecen.",
  "D-30":
    "Un mejor sistema de información en tienda reduce el error de pronóstico (CV efectivo): baja el stock de seguridad necesario y sube la OSA con el mismo inventario. Además, con POS diario la reposición corrige rápido un pronóstico equivocado, así que equivocarse cuesta menos. Cuesta inversión por tienda y operación semanal; tarda 1–2 trimestres en implantarse y uno en madurar, y con un error de pronóstico típico se paga en menos de dos años. La terminal gráfica habilita tanpin kanri.",
  "D-31":
    "Compartir el POS diario con los proveedores les deja planear con tu demanda real: baja el efecto látigo (BWR), sube su fill rate y con él la OTIF y la OSA. Cuesta una integración inicial con los proveedores (consume el tope del año) y una cuota semanal por tienda. Rinde más donde la demanda es volátil o los proveedores son poco confiables; donde la operación ya es estable, puede no pagarse. Es requisito para el CPFR.",
  "D-32":
    "El pronóstico básico usa promedios móviles: es gratis, pero reacciona tarde y no ve la estacionalidad, así que en los cambios de temporada el error sube y con él el stock de seguridad, la merma y los faltantes. El avanzado (suavizamiento exponencial con estacionalidad, tipo Holt-Winters, más variables causales como clima, calendario y promociones) baja el error y el efecto látigo, pero requiere implementar el modelo y mantener un equipo de analítica cada semana. Se paga donde la estacionalidad pesa y el volumen es grande; en operaciones chicas o estables, el costo del equipo puede superar el beneficio. Es distinto del pronóstico anual que capturas en la pestaña «Pronóstico».",
  "D-33":
    "Partes de RMI: tú pronosticas y repones, y los proveedores solo surten lo que pides. El CPFR (planeación, pronóstico y reabasto colaborativos) suma el pronóstico del proveedor al tuyo: baja el error de pronóstico, acorta y estabiliza el lead time y sube el fill rate. Cuesta una implementación (consume el tope del año) y un equipo de planeación conjunta cada semana, y su beneficio crece poco a poco: entra un trimestre después de decidirlo y madura en tres más. Por eso el momento importa: implementado temprano se paga con creces; tarde, ya no alcanza a recuperarse antes de que termine el juego. Requiere compartir el POS con los proveedores.",
  "D-34":
    "La capacitación de los encargados multiplica el beneficio del tanpin kanri: con capacitación alta la reducción del error de pronóstico es cerca del doble que con baja. Sin tanpin kanri casi no cambia los KPIs y solo suma costo operativo.",
};

export const LABELS: LabelMap = {
  "F-01": { help: "Se captura en T1 de cada año con los datos observados hasta ese momento." },
  "D-01": { help: "Cada CEDIS tarda 2–4 trimestres en construirse según su tamaño. No se puede mover de zona ni reducir." },
  "D-05": { help: "Decide dónde se ubican las tiendas nuevas: concentradas alrededor de tus CEDIS o repartidas." },
  "D-08": { help: "Abre un lote de tiendas el trimestre siguiente. Indispensable si empiezas desde cero.", unit: "tiendas" },
  "D-09": { help: "Cierra tiendas de una zona el trimestre siguiente. Cada cierre cuesta una indemnización, que consume el tope de inversión del año.", fields: { zone: "Zona", stores: "Tiendas a cerrar" } },
  "D-11": { help: "Entregas por semana a cada tienda. Más frecuencia: más frescura y más costo de transporte. Máximo 14 (2 al día) y menos en tiendas lejos del CEDIS.", fields: CATS, unit: "/sem" },
  "D-12": { help: "Combinada: un camión por temperatura con varios proveedores. Requiere un CEDIS combinado." },
  "D-20": { help: "Tanpin kanri (pedido por hipótesis del encargado) requiere POS + terminal gráfica." },
  "D-22": { help: "Más SKUs: más ventas potenciales, más stock de seguridad y más merma.", fields: { skus: "SKUs por tienda", local: "Surtido local" } },
  "D-23": { help: "El escaneo acelera la recepción y reduce errores." },
  "D-24": { help: "Días de stock de seguridad en el CEDIS (solo CEDIS con inventario). Amortigua fallas del proveedor.", unit: "días", step: 0.5 },
  "D-30": { help: "Reduce el error de pronóstico. Tarda 1–2 trimestres en implantarse y uno más en madurar." },
  "D-31": { help: "Los proveedores reciben tu POS diario. Implementación inicial más cuota semanal por tienda.", options: { no: "No", yes: "Sí, a diario" } },
  "D-32": { help: "Básico: promedios móviles. Avanzado: modelo con estacionalidad y variables causales, con equipo de analítica.", options: { basic: "Básico (promedios móviles)", advanced: "Avanzado (equipo de analítica)" } },
  "D-33": { help: "Partes de RMI (tú pronosticas y repones). El CPFR requiere compartir POS, entra un trimestre después y madura en tres.", options: { rmi: "RMI (tú pronosticas y repones)", cpfr: "CPFR (pronóstico colaborativo)" } },
  "D-34": { help: "Multiplica el beneficio de tanpin kanri." },
};
for (const [id, impact] of Object.entries(IMPACT)) LABELS[id] = { ...LABELS[id], impact };

export const KPI_META: KpiMeta[] = [
  { id: "OSA", acronym: "OSA", name: "Disponibilidad en anaquel", formula: "Tiempo con stock / tiempo total", format: "pct", higherIsBetter: true },
  { id: "OTIF", acronym: "OTIF", name: "A tiempo y completo (CEDIS→tienda)", formula: "Entregas a tiempo y completas / entregas", format: "pct", higherIsBetter: true },
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
  MARKET: "Demanda por tienda (mercado)",
  FC_TOTAL: "Pronóstico por tienda",
  FC_WAPE: "WAPE del pronóstico",
  FC_BIAS: "Sesgo del pronóstico",
  FC_ABS: "Error absoluto del pronóstico",
  FC_ORACLE: "Error del ruido (piso)",
  FC_EXCEED: "Semanas sobre el p95 pronosticado",
  FC_WEEKS: "Semanas evaluadas",
  FC_CVACC: "Exactitud del CV",
  FC_SCORE: "Puntaje del pronóstico",
  PROFIT: "Utilidad (US$)",
  SERVICE_PENALTY: "Penalizaciones por servicio (US$)",
  SERVICE_BREACHES: "Guardrails de servicio rotos",
  CAPEX: "Inversión y cargos (US$)",
  OVERSTOCK_COST: "Rebajas por sobrecompra (US$)",
  GM_USD: "Margen bruto (US$)",
};

export const STRATEGY_TEXT: Record<Strategy, string> = {
  freshness: "Pesa más la disponibilidad, la merma y la rotación.",
  lowcost: "Pesa más el costo logístico y el EBITDA.",
  convenience: "Pesa más la disponibilidad y las ventas perdidas.",
};

export const REGION_TEXT: Record<RegionId, { title: string; tagline: string; facts: string[] }> = {
  kaigan: {
    title: "Kaigan",
    tagline: "Franja costera de ~120 km (tipo Japón). Región de origen de Hoshi Mart.",
    facts: ["1,800 tiendas agrupadas a lo largo de la costa", "1 CEDIS grande con inventario (zona 12)", "Frescos: 30% de las ventas; entregas programadas 2 veces al día", "Planta dedicada de alimentos preparados (zona 12)"],
  },
  redriver: {
    title: "Red River",
    tagline: "Corredor de ~630 km (tipo EE.UU.). Prairie Stop, recién adquirida.",
    facts: ["1,200 tiendas repartidas en todo el corredor", "1 CEDIS mediano con inventario (zona 14)", "Frescos: 10% de las ventas", "Pedido por punto de reorden, POS básico"],
  },
  valle: {
    title: "Valle Metropolitano",
    tagline: "Zona metropolitana de ~180 km con núcleo urbano y periferia (tipo México).",
    facts: ["600 tiendas: 70% en el núcleo", "4 CEDIS medianos con inventario", "Central de abasto en el núcleo y parque industrial en la periferia", "Frescos: 20% de las ventas; el tráfico reduce la velocidad 35% en promedio (±12 pp)"],
  },
};

/** Nombre del escenario de mercado de una corrida, o «Escenario propio». */
export const scenarioLabel = (scenario: unknown) => {
  const p = presetOf(scenario as Parameters<typeof presetOf>[0]);
  return p?.title ?? "Escenario propio";
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
  if (id === "F-01" && v && typeof v === "object") {
    const f = v as { year: number; level: number; growth: number; quarters: number[]; cv: number; p95: number };
    return `A${f.year + 1}: nivel ${f.level.toFixed(1)} unid./tienda/día, crecimiento ${(f.growth * 100).toFixed(1)}%, trimestres ${f.quarters.map((q) => `×${q.toFixed(2)}`).join("/")}, CV ${(f.cv * 100).toFixed(1)}%, p95 ${f.p95.toFixed(1)}`;
  }
  const opt = (x: unknown) => LABELS[id]?.options?.[String(x)] ?? OPTIONS[String(x)] ?? String(x);
  if (id === "D-01" && Array.isArray(v)) return v.length ? v.map((d) => `${d.id}: zona ${d.zone}, ${opt(d.type)}, ${opt(d.size)}`).join(" · ") : "sin CEDIS";
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

/** Nombre legible de reglas y eventos para la explicación causal (el jugador no ve los códigos internos). */
const RULE_EVENT_NAMES: Record<string, string> = {
  "R-01": "Rutas de frescos de más de 4 h",
  "R-02": "Merma alta en una zona",
  "R-03": "Disponibilidad baja dos semanas seguidas",
  "R-04": "Demasiados camiones por tienda",
  "R-05": "Frecuencia muy alta en región dispersa",
  "R-06": "Cross-dock con proveedor poco confiable",
  "R-07": "CEDIS saturado",
  "R-08": "POS compartido + CPFR maduro",
  "R-09": "Tanpin kanri sin capacitación",
  "R-10": "Clusters densos",
  "R-11": "Pooling en CEDIS con inventario",
  "R-12": "Entrega en horas valle con escaneo",
  "R-13": "Distancia al CEDIS que limita la frecuencia",
  "R-14": "Tiendas sin CEDIS que las surta",
  "X-01": "Falla de refrigeración en ruta",
  "X-02": "Clima extremo",
  "X-03": "Sismo severo",
  "X-04": "Proveedor clave no entrega",
  "X-05": "Ola de calor",
  "X-06": "Competidor abre tiendas",
  "X-07": "Escasez de choferes",
  "X-08": "Caída del sistema POS",
  "X-09": "Retiro sanitario",
  "X-10": "Alza del combustible",
  "X-11": "Congestión urbana extraordinaria",
  "X-12": "Restricción regulatoria de carga",
};

/** Nombre de cada causa (decisión, regla o evento) por su código interno. */
export const CAUSE_NAMES: Record<string, string> = {
  ...RULE_EVENT_NAMES,
  ...Object.fromEntries(decisions.map((d) => [d.id, d.label])),
};
