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
  /** Qué observar durante la partida. */
  watch: string[];
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
    bestWith: "kaigan",
  },
  {
    id: "EM-02",
    title: "Demanda incierta",
    tagline: "Demanda volátil y estacional con proveedores poco confiables.",
    market: { ...DEFAULT_MARKET, volatility: "high", seasonality: "marked", supplierReliability: "low" },
    seed: 4202,
    concept: "Efecto látigo (bullwhip): inventario de seguridad, POS compartido y colaboración (VMI/CPFR).",
    watch: ["Bullwhip ratio (BWR) y error de pronóstico", "Cross-dock sin amortiguador ante fallas del proveedor (R-06)"],
    bestWith: "valle",
  },
  {
    id: "EM-03",
    title: "Presión de costos",
    tagline: "Mercado estancado, combustible al alza, choferes escasos y un competidor agresivo.",
    market: { ...DEFAULT_MARKET, growth: "stagnant", fuel: "rising", labor: "tight", competition: "aggressive" },
    seed: 4303,
    concept: "Eficiencia vs. capacidad de respuesta: densidad, consolidación y costo por entrega.",
    watch: ["CTS y costo de transporte por año", "Si la frecuencia alta de entregas sigue pagando"],
    bestWith: "redriver",
  },
  {
    id: "EM-04",
    title: "Crecimiento acelerado",
    tagline: "Boom de demanda, picos marcados y un cliente que pide cada vez más frescos.",
    market: { ...DEFAULT_MARKET, growth: "boom", seasonality: "marked", demographics: "aging" },
    seed: 4404,
    concept: "Planeación de capacidad con retrasos: un CD tarda 2–4 trimestres; anticipar antes de saturar.",
    watch: ["Utilización de CD y flota", "Merma y OSA de frescos conforme cambia la mezcla"],
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
