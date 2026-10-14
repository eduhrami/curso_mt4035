/**
 * Demanda del mercado y pronóstico del equipo en SCM (especificación §4.4 y §5.0, AD-35).
 *
 * La demanda por tienda (ventas comparables) sigue un proceso oculto propio de cada partida: nivel,
 * crecimiento, índice estacional de cada trimestre y un choque semanal común, sorteados con la semilla.
 * El equipo lo estima con datos históricos semanales y captura su pronóstico (F-01) al inicio de cada año.
 * El pronóstico fija el inventario objetivo y el stock de seguridad de las tiendas, y su precisión es el
 * 30% del índice de desempeño.
 */
import { createRng, type Rng } from "@mt4035/sim-core";
import { CATEGORIES, type Category, type Params, type ScmState } from "./types.ts";

export const WEEKS_PER_YEAR = 52;
export const HISTORY_YEARS = 2;
const EPOCH_OFFSET = 1000;

/** Proceso de demanda verdadero (oculto al jugador). */
export interface DemandTruth {
  /** Unidades por tienda por día en un trimestre de índice 1, al inicio de A1. */
  level: number;
  /** Crecimiento anual compuesto de la demanda por tienda. */
  growth: number;
  /** Forma estacional por trimestre (promedio 0); por categoría se escala con la amplitud y su sensibilidad. */
  shape: number[];
  /** Amplitud estacional de la partida. */
  amp: number;
  /** CV del choque semanal común a todas las tiendas. */
  cv: number;
}

/** Pronóstico del equipo (decisión F-01). */
export interface Forecast {
  /** Año que pronostica (0 = A1). −1 = pronóstico por omisión, aún no capturado. */
  year: number;
  /** Unidades por tienda por día de un trimestre de índice 1, al inicio del año pronosticado. */
  level: number;
  growth: number;
  /** Índice estacional de T1…T4 (se normaliza a promedio 1). */
  quarters: number[];
  /** CV del choque semanal (residuo de la demanda por tienda). */
  cv: number;
  /** Percentil 95 de la demanda semanal por tienda por día del año pronosticado. */
  p95: number;
}

const rngCache = new Map<number, Rng>();
function rngFor(seed: number): Rng {
  let r = rngCache.get(seed);
  if (!r) {
    r = createRng(seed);
    rngCache.set(seed, r);
    if (rngCache.size > 64) rngCache.delete(rngCache.keys().next().value!);
  }
  return r;
}

export const quarterOf = (week: number) => ((Math.floor(week / 13) % 4) + 4) % 4;
const yearOf = (week: number) => Math.floor(week / WEEKS_PER_YEAR);

/** Sortea el proceso de demanda de la partida. */
export function drawTruth(rng: Rng, p: Params, region: ScmState["region"], market: ScmState["market"]): DemandTruth {
  const s = rng.stream("truth", 0, 0);
  const f = p.forecast.truth;
  const r = p.regions[region];
  const [gMin, gMax] = (f.growthRange as Record<string, number[]>)[market.growth]!;
  const [cMin, cMax] = (f.cvRange as Record<string, number[]>)[market.volatility]!;
  const raw = f.seasonShape.map((x) => x + s.uniform(-f.shapeJitter, f.shapeJitter));
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  return {
    level: r.visitsPerDay * r.unitsPerVisit * s.uniform(1 - f.levelJitter, 1 + f.levelJitter),
    growth: s.uniform(gMin!, gMax!),
    shape: raw.map((x) => x - mean),
    amp: p.markets.seasonality[market.seasonality] * s.uniform(1 - f.ampJitter, 1 + f.ampJitter),
    cv: s.uniform(cMin!, cMax!),
  };
}

/** Factor estacional de una categoría en la semana. */
export const seasonFactor = (t: DemandTruth, p: Params, c: Category, week: number) => 1 + t.amp * p.categories[c].seasonMult * t.shape[quarterOf(week)]!;

/** Índice estacional total del trimestre con una mezcla de categorías. */
export function quarterIndex(t: DemandTruth, p: Params, mix: Record<Category, number>, q: number): number {
  return CATEGORIES.reduce((a, c) => a + mix[c] * (1 + t.amp * p.categories[c].seasonMult * t.shape[q]!), 0);
}

/** Demanda esperada por tienda por día del mercado (sin choque) en una semana. */
export function expectedMarket(t: DemandTruth, p: Params, mix: Record<Category, number>, week: number): number {
  return t.level * (1 + t.growth) ** (week / WEEKS_PER_YEAR) * quarterIndex(t, p, mix, quarterOf(week));
}

/** Choque semanal común (determinista con la semilla). */
export const marketShock = (t: DemandTruth, seed: number, week: number, noise = 1) => rngFor(seed).stream("market", Math.floor(week / 13) + EPOCH_OFFSET, ((week % 13) + 13) % 13, "all").normal() * t.cv * noise;

/** Pronóstico por omisión (aún no capturado): valores nominales de la región y el escenario. */
export function defaultForecast(p: Params, region: ScmState["region"], market: ScmState["market"]): Forecast {
  const r = p.regions[region];
  const [gMin, gMax] = (p.forecast.truth.growthRange as Record<string, number[]>)[market.growth]!;
  const level = r.visitsPerDay * r.unitsPerVisit;
  return { year: -1, level, growth: (gMin! + gMax!) / 2, quarters: [1, 1, 1, 1], cv: 0.05, p95: level * 1.2 };
}

/** Pronóstico de la demanda por tienda por día en una semana. */
export function forecastWeek(fc: Forecast, week: number): number {
  const mean = fc.quarters.reduce((a, b) => a + b, 0) / fc.quarters.length || 1;
  const w0 = WEEKS_PER_YEAR * Math.max(0, fc.year);
  return fc.level * (1 + fc.growth) ** ((week - w0) / WEEKS_PER_YEAR) * (fc.quarters[quarterOf(week)]! / mean);
}

/** Mezcla de categorías sin desplazamiento demográfico (la de la región). */
export const baseMix = (p: Params, region: ScmState["region"]) => ({ ...p.regions[region].mix }) as Record<Category, number>;

/**
 * Mezcla de la semana: con envejecimiento (E-26) el motor desplaza demanda de ambiente a frescos al inicio de
 * cada época (onEpochStart), con el mismo tope que demandMix. En la historia no hay desplazamiento.
 */
export function mixAt(p: Params, s: Pick<ScmState, "region" | "market">, week: number): Record<Category, number> {
  const mix = baseMix(p, s.region);
  if (s.market.demographics !== "aging" || week < 0) return mix;
  const shift = Math.min(((Math.floor(week / 13) + 1) * p.markets.agingFreshShiftPerYear) / 4, mix.ambient * 0.5);
  mix.fresh += shift;
  mix.ambient -= shift;
  return mix;
}

const CAT_COL: Record<Category, string> = { fresh: "frescos", chilled: "refrigerado", ambient: "ambiente", frozen: "congelado" };

/**
 * CSV de la demanda semanal del mercado por tienda (unidades por tienda por día): los años de historia previos a la
 * partida y las semanas ya jugadas. Una fila por semana, una columna por categoría y el total.
 */
export function demandCsv(s: Pick<ScmState, "truth" | "region" | "market">, p: Params, seed: number, untilWeek: number, noise = 1): string {
  const rows = ["semana,anio,trimestre,semana_del_anio," + CATEGORIES.map((c) => CAT_COL[c]).join(",") + ",total"];
  for (let w = -WEEKS_PER_YEAR * HISTORY_YEARS; w < untilWeek; w++) {
    const mix = mixAt(p, s, w);
    const shock = 1 + marketShock(s.truth, seed, w, noise);
    const g = s.truth.level * (1 + s.truth.growth) ** (w / WEEKS_PER_YEAR);
    const cats = CATEGORIES.map((c) => Math.max(0, g * mix[c] * seasonFactor(s.truth, p, c, w) * shock));
    const y = yearOf(w);
    rows.push([w, y < 0 ? `H${y + HISTORY_YEARS + 1}` : `A${y + 1}`, `T${quarterOf(w) + 1}`, (((w % 52) + 52) % 52) + 1, ...cats.map((x) => x.toFixed(1)), cats.reduce((a, b) => a + b, 0).toFixed(1)].join(","));
  }
  return rows.join("\n") + "\n";
}

const normalTail = (z: number) => 0.5 * erfc(z / Math.SQRT2);
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
  return x >= 0 ? y : 2 - y;
}

/** Pronóstico perfecto de un año (pruebas, bots y modo profesor), con la mezcla de categorías vigente. */
export function truthForecast(s: Pick<ScmState, "truth" | "region" | "market">, p: Params, year: number): Forecast {
  const t = s.truth;
  const exp = Array.from({ length: WEEKS_PER_YEAR }, (_, i) => expectedMarket(t, p, mixAt(p, s, year * WEEKS_PER_YEAR + i), year * WEEKS_PER_YEAR + i));
  const mix = mixAt(p, s, year * WEEKS_PER_YEAR + 26);
  const tail = (x: number) => exp.reduce((a, e) => a + normalTail((x / e - 1) / Math.max(t.cv, 1e-6)), 0) / exp.length;
  let lo = 0;
  let hi = Math.max(...exp) * 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tail(mid) > 0.05) lo = mid;
    else hi = mid;
  }
  return { year, level: t.level * (1 + t.growth) ** year, growth: t.growth, quarters: [0, 1, 2, 3].map((q) => quarterIndex(t, p, mix, q)), cv: t.cv, p95: (lo + hi) / 2 };
}

export interface ForecastAccuracy {
  wape: number;
  exceed: number;
  cvAcc: number;
  score: number;
}

/** Calidad del pronóstico de un periodo (§7.4): igual que en última milla, con semanas en lugar de días. */
export function accuracyFrom(p: Params, sums: { abs: number; oracle: number; market: number; exceed: number; weeks: number; cvAcc: number }): ForecastAccuracy {
  const f = p.forecast.score;
  const wape = sums.market > 0 ? sums.abs / sums.market : 1;
  const floor = sums.market > 0 ? sums.oracle / sums.market : 0;
  const exceed = sums.weeks > 0 ? sums.exceed / sums.weeks : 0;
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  const aWape = clamp01(1 - Math.max(0, wape - floor - f.wapeTolerance) / f.wapeSpan);
  const aP95 = clamp01(1 - Math.abs(exceed - 0.05) / f.exceedSpan);
  return { wape, exceed, cvAcc: sums.cvAcc, score: f.weights.wape * aWape + f.weights.cv * sums.cvAcc + f.weights.p95 * aP95 };
}
