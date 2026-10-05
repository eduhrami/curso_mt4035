/**
 * Escenarios de mercado predefinidos (especificación §4.3). Cada uno fija el perfil de mercado y una
 * semilla sugerida, para que equipos y estrategias se comparen en las mismas condiciones.
 */
import { DEFAULT_MARKET, type Market, type TerritoryId } from "./types.ts";

export type PresetId = "EM-01" | "EM-02" | "EM-03" | "EM-04";

export interface MarketPreset {
  id: PresetId;
  title: string;
  tagline: string;
  market: Market;
  /** Semilla sugerida ⚠: misma semilla + mismo escenario = mismos picos y eventos para todos los equipos. */
  seed: number;
  /** Concepto de clase que el escenario hace visible. */
  concept: string;
  /** Qué revisar en la corrida (notas del debrief, AD-31). */
  watch: string[];
  /** Pregunta de debrief propia del escenario (DB-05). */
  question: string;
  /** Pista de qué incluir en la respuesta. */
  hint: string;
  /** Territorio donde el contraste es más claro (sugerencia, no restricción). */
  bestWith: Exclude<TerritoryId, "minicaso">;
}

export const PRESETS: MarketPreset[] = [
  {
    id: "EM-01",
    title: "Mercado base",
    tagline: "Crecimiento medio y un cliente promedio: la diferencia la hacen la red y la flota.",
    market: { ...DEFAULT_MARKET },
    seed: 5101,
    concept: "Línea base: la frontera entre entrega a tiempo (OTD) y costo por pedido (CPD).",
    watch: ["Dónde se ubica cada corrida en la frontera OTD–CPD", "Qué tanto sube el FADS al mejorar ventanas y avisos"],
    question: "¿Dónde quedó tu corrida en la frontera entre entrega a tiempo (OTD) y costo por pedido (CPD)? ¿Qué decisión la acercó a la frontera y cuánto subió el FADS al mejorar ventanas y avisos al cliente?",
    hint: "Usa la gráfica OTD vs. CPD; si tienes otra corrida, compáralas.",
    bestWith: "megalopolis",
  },
  {
    id: "EM-02",
    title: "Carrera por la velocidad",
    tagline: "Canal en línea explosivo y un cliente que premia la rapidez y no mira la tarifa.",
    market: { ...DEFAULT_MARKET, growth: "explosive", speedSensitivity: "high", feeSensitivity: "low" },
    seed: 5202,
    concept: "El costo de la velocidad: express y mismo día contra saturación de capacidad en los picos.",
    watch: ["OTD en p95 durante Hot Sale y Buen Fin", "Utilización de flota y nodos conforme crece el volumen"],
    question: "¿Dónde sí valió la pena pagar por velocidad (express, mismo día) y dónde convenía segmentar el servicio? ¿Cómo se comportaron el OTD p95 y la utilización de flota en Hot Sale y Buen Fin?",
    hint: "Reporta OTD p95, CPD y utilización en los meses pico.",
    bestWith: "megalopolis",
  },
  {
    id: "EM-03",
    title: "Margen apretado",
    tagline: "Crecimiento lento, cliente sensible a la tarifa, gasolina volátil y choferes escasos.",
    market: { ...DEFAULT_MARKET, growth: "slow", speedSensitivity: "low", feeSensitivity: "high", fuel: "volatile", labor: "tight" },
    seed: 5303,
    concept: "Eficiencia: consolidación, recoger en tienda (BOPIS), lockers y segmentar el servicio por zona.",
    watch: ["CPD y costo de envío como % de ingresos", "Margen del canal en línea frente a la tarifa y el mínimo de compra"],
    question: "¿Qué palancas de eficiencia usaste (consolidación, recoger en tienda, lockers, tarifa y mínimo de compra) y cuánto movieron el CPD y el margen del canal en línea?",
    hint: "Compara el CPD y el costo de envío como % de ingresos al inicio y al final.",
    bestWith: "norte",
  },
  {
    id: "EM-04",
    title: "Canasta compleja",
    tagline: "Muchos frescos y devoluciones altas de mercancía general.",
    market: { ...DEFAULT_MARKET, freshMix: "high", returns: "fashion" },
    seed: 5404,
    concept: "Cadena de frío en la última milla y logística inversa diseñada desde el inicio.",
    watch: ["Spoilage rate de frescos y su efecto en CSAT", "Costo de devolución por unidad según el canal de retorno"],
    question: "¿Cómo protegiste la cadena de frío (spoilage rate) y qué efecto tuvo en el CSAT? ¿Qué canal de devolución elegiste y cuánto costó por unidad?",
    hint: "Relaciona el spoilage con la duración de ruta y el equipo de frío; cita el costo de devolución por unidad.",
    bestWith: "bajio",
  },
];

const sameMarket = (a: Market, b: Market) => (Object.keys(a) as (keyof Market)[]).every((k) => a[k] === b[k]);

/** Escenario predefinido de una corrida: por su `preset` o, en corridas antiguas, por coincidencia exacta del perfil. */
export function presetOf(scenario: { preset?: string; market?: Partial<Market> }): MarketPreset | undefined {
  const market = { ...DEFAULT_MARKET, ...(scenario.market ?? {}) };
  const byId = PRESETS.find((p) => p.id === scenario.preset);
  if (byId && sameMarket(byId.market, market)) return byId;
  return PRESETS.find((p) => sameMarket(p.market, market));
}
