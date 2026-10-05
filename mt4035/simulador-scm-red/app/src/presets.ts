/**
 * Escenarios de mercado predefinidos (especificación §4.3). Cada uno fija el perfil E-20…E-27 y una
 * semilla sugerida, para que equipos y estrategias se comparen en las mismas condiciones.
 */
import { DEFAULT_MARKET, type MarketProfile, type RegionId } from "./types.ts";

export type PresetId = "EM-01" | "EM-02" | "EM-03" | "EM-04";

export interface MarketPreset {
  id: PresetId;
  title: string;
  tagline: string;
  market: MarketProfile;
  /** Semilla sugerida ⚠: misma semilla + mismo escenario = mismos eventos para todos los equipos. */
  seed: number;
  /** Concepto de clase que el escenario hace visible. */
  concept: string;
  /** Qué revisar en la corrida (notas del debrief, AD-31). */
  watch: string[];
  /** Pregunta de debrief propia del escenario (DB-05). */
  question: string;
  /** Pista de qué incluir en la respuesta. */
  hint: string;
  /** Región donde el contraste es más claro (sugerencia, no restricción). */
  bestWith: RegionId;
}

export const PRESETS: MarketPreset[] = [
  {
    id: "EM-01",
    title: "Mercado estable",
    tagline: "Condiciones neutras: la diferencia entre equipos la hace el diseño de la red.",
    market: { ...DEFAULT_MARKET },
    seed: 4101,
    concept: "Línea base: costo de servir (CTS) vs. disponibilidad en anaquel (OSA) sin ruido externo.",
    watch: ["Cómo se reparte el costo entre transporte, inventario y CD", "Qué tan rápido paga una inversión en red o información"],
    question: "Sin ruido externo, ¿cómo se repartió tu costo de servir (CTS) entre transporte, inventario y CD? ¿Qué inversión (red, información o colaboración) se pagó más rápido y cómo lo sabes?",
    hint: "Cita el desglose de costos y el trimestre en que la inversión empezó a rendir.",
    bestWith: "kaigan",
  },
  {
    id: "EM-02",
    title: "Demanda incierta",
    tagline: "Demanda volátil y estacional con proveedores poco confiables.",
    market: { ...DEFAULT_MARKET, volatility: "high", seasonality: "marked", supplierReliability: "low" },
    seed: 4202,
    concept: "Efecto látigo (bullwhip) con demanda volátil y proveedores poco confiables.",
    watch: ["Bullwhip ratio (BWR) y error de pronóstico", "Qué pasa en tienda cuando un proveedor falla"],
    question: "¿Cómo evolucionó tu bullwhip ratio (BWR) y qué decisiones lo movieron? ¿Cómo respondió tu red cuando un proveedor falló?",
    hint: "Compara el BWR y la OSA antes y después de tus decisiones y cita algún evento concreto.",
    bestWith: "valle",
  },
  {
    id: "EM-03",
    title: "Presión de costos",
    tagline: "Mercado estancado, combustible al alza, choferes escasos y un competidor agresivo.",
    market: { ...DEFAULT_MARKET, growth: "stagnant", fuel: "rising", labor: "tight", competition: "aggressive" },
    seed: 4303,
    concept: "Eficiencia vs. capacidad de respuesta cuando suben los costos.",
    watch: ["CTS y costo de transporte por año", "Cuánto cuesta cada entrega adicional"],
    question: "Con combustible al alza, choferes escasos y un competidor agresivo, ¿cómo contuviste el CTS y qué le pasó a la OSA mientras lo hacías?",
    hint: "Reporta el CTS y la OSA al inicio y al final y la decisión que más los movió.",
    bestWith: "redriver",
  },
  {
    id: "EM-04",
    title: "Crecimiento acelerado",
    tagline: "Boom de demanda, picos marcados y un cliente que pide cada vez más frescos.",
    market: { ...DEFAULT_MARKET, growth: "boom", seasonality: "marked", demographics: "aging" },
    seed: 4404,
    concept: "Planeación de capacidad cuando la demanda crece rápido y cambia su mezcla.",
    watch: ["Utilización de CD y flota", "Merma y OSA de frescos conforme cambia la mezcla"],
    question: "¿Cuándo decidiste ampliar capacidad, cuándo surtió efecto y llegaste a saturarte? ¿Cómo cambiaron la merma y la OSA de frescos a lo largo de la partida?",
    hint: "Ubica en la trayectoria el trimestre de la decisión, el de su efecto y, si la hubo, la saturación.",
    bestWith: "valle",
  },
];

const sameMarket = (a: MarketProfile, b: MarketProfile) => (Object.keys(a) as (keyof MarketProfile)[]).every((k) => a[k] === b[k]);

/** Escenario predefinido de una corrida: por su `preset` o, en corridas antiguas, por coincidencia exacta del perfil. */
export function presetOf(scenario: { preset?: string; market?: Partial<MarketProfile> }): MarketPreset | undefined {
  const market = { ...DEFAULT_MARKET, ...(scenario.market ?? {}) };
  const byId = PRESETS.find((p) => p.id === scenario.preset);
  if (byId && sameMarket(byId.market, market)) return byId;
  return PRESETS.find((p) => sameMarket(p.market, market));
}
