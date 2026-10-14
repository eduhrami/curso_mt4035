/**
 * Demanda del mercado y pronóstico del equipo (especificación §4.3b y §5.0, AD-33).
 *
 * La demanda del canal en línea sigue un proceso oculto propio de cada partida (nivel, crecimiento,
 * patrón semanal, quincena, magnitud típica de cada pico y ruido diario), sorteado con la semilla.
 * El equipo lo estima con datos históricos y captura su pronóstico (F-01) al inicio de cada año.
 * El pronóstico dimensiona la capacidad planeada y su precisión es el 30% del puntaje.
 */
import { createRng, type Rng } from "@mt4035/sim-core";
import { monthOf } from "./network.ts";
import type { LmState, Params } from "./types.ts";

export const PEAK_IDS = ["hotsale", "school", "buenfin", "xmas"] as const;
export type PeakId = (typeof PEAK_IDS)[number];

/** Proceso de demanda verdadero (oculto al jugador). */
export interface DemandTruth {
  /** Pedidos por día de un día típico (índice semanal 1, sin quincena ni pico) al inicio del año 1. */
  level: number;
  /** Crecimiento anual compuesto. */
  growth: number;
  /** Índice por día de la semana (lunes = 0), con promedio 1. */
  weekday: number[];
  /** Multiplicador de los días de quincena. */
  quincena: number;
  /** Magnitud típica de cada pico; la de cada año varía alrededor de ella. */
  peaks: Record<PeakId, number>;
  /** Coeficiente de variación del ruido diario de la demanda total. */
  cv: number;
}

/** Pronóstico del equipo (decisión F-01). */
export interface Forecast {
  /** Año que pronostica (0 = A1). −1 = pronóstico por omisión, aún no capturado por el equipo. */
  year: number;
  /** Pedidos por día de un día típico al inicio del año pronosticado. */
  level: number;
  growth: number;
  weekday: number[];
  quincena: number;
  peaks: Record<PeakId, number>;
  cv: number;
  /** Percentil 95 de los pedidos diarios totales del año pronosticado. */
  p95: number;
}

/** Años de historia que se entregan antes de la partida. */
export const HISTORY_YEARS = 2;
/** Desplazamiento de épocas para que la historia (épocas negativas) use semillas propias. */
const EPOCH_OFFSET = 1000;

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

/** Sortea el proceso de demanda de la partida y la magnitud de cada pico por año (historia incluida). */
export function drawTruth(rng: Rng, p: Params, territoryOrders: number, growthBucket: string): { truth: DemandTruth; peakMagnitude: Record<string, number> } {
  const s = rng.stream("truth", 0, 0);
  const f = p.forecast.truth;
  const [gMin, gMax] = (f.growthRange as Record<string, number[]>)[growthBucket] ?? [0.15, 0.3];
  const raw = p.weekdayMult.map((w) => w * s.uniform(1 - f.weekdayJitter, 1 + f.weekdayJitter));
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const truth: DemandTruth = {
    level: territoryOrders * s.uniform(1 - f.levelJitter, 1 + f.levelJitter),
    growth: s.uniform(gMin!, gMax!),
    weekday: raw.map((w) => w / mean),
    quincena: s.uniform(f.quincena[0]!, f.quincena[1]!),
    peaks: Object.fromEntries(PEAK_IDS.map((id) => [id, s.uniform(f.peakTypical[0]!, f.peakTypical[1]!)])) as Record<PeakId, number>,
    cv: s.uniform(f.cv[0]!, f.cv[1]!),
  };
  const peakMagnitude: Record<string, number> = {};
  const years = Math.ceil(p.epochs / 12);
  for (let year = -HISTORY_YEARS; year < years; year++) {
    for (const id of PEAK_IDS) peakMagnitude[`${year}:${id}`] = Math.min(f.peakClamp[1]!, Math.max(f.peakClamp[0]!, truth.peaks[id] * Math.exp(s.normal() * f.peakYearSigma)));
  }
  return { truth, peakMagnitude };
}

/** Día del calendario: época (mes absoluto; negativa en la historia), día del mes (0…) y día absoluto. */
export interface CalendarDay {
  epoch: number;
  dom: number;
  day: number;
}

/** Días desde el inicio de la historia hasta el final de la época `untilEpoch` (exclusiva). */
export function calendarDays(p: Params, fromEpoch: number, untilEpoch: number): CalendarDay[] {
  const out: CalendarDay[] = [];
  let day = 0;
  for (let e = 0; e > fromEpoch; e--) day -= p.daysPerMonth[(((e - 1) % 12) + 12) % 12]!;
  for (let e = fromEpoch; e < untilEpoch; e++) {
    const n = p.daysPerMonth[((e % 12) + 12) % 12]!;
    for (let dom = 0; dom < n; dom++) out.push({ epoch: e, dom, day: day++ });
  }
  return out;
}

const weekdayIdx = (day: number) => ((day % 7) + 7) % 7;
const isQuincena = (p: Params, dom: number) => p.quincena.days.includes(dom + 1);

/** Pico programado en (época, día del mes), con su id, o null. */
export function peakAt(p: Params, epoch: number, dom: number): { id: PeakId; name: string } | null {
  const m = monthOf(((epoch % 12) + 12) % 12);
  for (const pk of p.peaks) if (pk.month === m && dom >= pk.startDay - 1 && dom < pk.startDay - 1 + pk.days) return { id: pk.id as PeakId, name: pk.name };
  return null;
}

/** Demanda esperada del mercado (total, sin ruido) para un día. */
export function expectedMarket(s: Pick<LmState, "truth" | "peakMagnitude">, p: Params, c: CalendarDay): number {
  const t = s.truth;
  const pk = peakAt(p, c.epoch, c.dom);
  const year = Math.floor(c.epoch / 12);
  return t.level * (1 + t.growth) ** (c.day / 365) * t.weekday[weekdayIdx(c.day)]! * (isQuincena(p, c.dom) ? t.quincena : 1) * (pk ? (s.peakMagnitude[`${year}:${pk.id}`] ?? 1) : 1);
}

/**
 * Demanda realizada del mercado por zona en un día: esperada × participación × (1 + choque común + choque de zona).
 * El choque común tiene CV `truth.cv`; el de zona es pequeño y fijo. Determinista con la semilla.
 */
export function marketByZone(s: Pick<LmState, "truth" | "peakMagnitude">, p: Params, seed: number, c: CalendarDay, shares: readonly number[], noise = 1): number[] {
  const r = rngFor(seed);
  const exp = expectedMarket(s, p, c);
  const common = r.stream("market", c.epoch + EPOCH_OFFSET, c.dom, "all").normal() * s.truth.cv * noise;
  return shares.map((sh, z) => {
    const own = r.stream("market", c.epoch + EPOCH_OFFSET, c.dom, z).normal() * p.forecast.truth.zoneCv * noise;
    return Math.max(0, exp * sh * (1 + common + own));
  });
}

/** Pronóstico por omisión (aún no capturado): valores nominales del territorio y del escenario. */
export function defaultForecast(p: Params, territoryOrders: number, growthBucket: string): Forecast {
  const [gMin, gMax] = (p.forecast.truth.growthRange as Record<string, number[]>)[growthBucket] ?? [0.15, 0.3];
  const level = territoryOrders;
  return {
    year: -1,
    level,
    growth: (gMin! + gMax!) / 2,
    weekday: [...p.weekdayMult],
    quincena: 1.1,
    peaks: Object.fromEntries(PEAK_IDS.map((id) => [id, 1.8])) as Record<PeakId, number>,
    cv: 0.1,
    p95: Math.round(level * 1.9),
  };
}

const firstDayOfYear = (year: number) => 365 * year;

/** Pedidos de un día típico según el pronóstico (sin índice semanal, quincena ni pico). */
export function forecastTypical(fc: Forecast, day: number): number {
  const d0 = firstDayOfYear(Math.max(0, fc.year));
  return fc.level * (1 + fc.growth) ** ((day - d0) / 365);
}

/** Pronóstico de la demanda total de un día (con índice semanal normalizado, quincena y, si se pide, pico). */
export function forecastDay(fc: Forecast, p: Params, c: CalendarDay, withPeak = true): number {
  const mean = fc.weekday.reduce((a, b) => a + b, 0) / fc.weekday.length || 1;
  const pk = withPeak ? peakAt(p, c.epoch, c.dom) : null;
  return forecastTypical(fc, c.day) * (fc.weekday[weekdayIdx(c.day)]! / mean) * (isQuincena(p, c.dom) ? fc.quincena : 1) * (pk ? fc.peaks[pk.id] : 1);
}

const WEEKDAYS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

/**
 * CSV de la demanda diaria del mercado (pedidos solicitados en el canal en línea): los años de historia
 * previos a la partida y los meses ya jugados. Una fila por día, una columna por zona y el total.
 */
export function demandCsv(s: Pick<LmState, "truth" | "peakMagnitude">, p: Params, seed: number, zones: readonly { name: string; share: number }[], untilEpoch: number, noise = 1): string {
  const head = ["dia", "anio", "mes", "dia_mes", "dia_semana", "evento", ...zones.map((z) => z.name.replace(/\s+/g, "_").toLowerCase()), "total"];
  const rows = [head.join(",")];
  for (const c of calendarDays(p, -12 * HISTORY_YEARS, untilEpoch)) {
    const z = marketByZone(s, p, seed, c, zones.map((x) => x.share), noise).map((v) => Math.round(v));
    const pk = peakAt(p, c.epoch, c.dom);
    const year = Math.floor(c.epoch / 12);
    rows.push([c.day, year < 0 ? `H${year + HISTORY_YEARS + 1}` : `A${year + 1}`, (((c.epoch % 12) + 12) % 12) + 1, c.dom + 1, WEEKDAYS[weekdayIdx(c.day)], pk ? pk.name : "", ...z, z.reduce((a, b) => a + b, 0)].join(","));
  }
  return rows.join("\n") + "\n";
}

/** Calidad del pronóstico de un periodo a partir de sumas diarias (§7.4). */
export interface ForecastAccuracy {
  /** Error absoluto ponderado: Σ|pronóstico − real| / Σ real. */
  wape: number;
  /** Proporción de días en que la demanda superó el p95 pronosticado (ideal 5%). */
  exceed: number;
  /** Exactitud del CV pronosticado (1 = exacto). */
  cvAcc: number;
  /** Puntaje 0–1: 60% patrón (WAPE), 20% variabilidad (CV), 20% cobertura del p95. */
  score: number;
}

/**
 * `oracle` es Σ|esperado − real|: el error del pronóstico perfecto (solo ruido). El WAPE se califica por
 * encima de ese piso, así que la calificación no depende de qué tan ruidosa salió la partida.
 */
export function accuracyFrom(p: Params, sums: { abs: number; oracle: number; market: number; exceed: number; days: number; cvAcc: number }): ForecastAccuracy {
  const f = p.forecast.score;
  const wape = sums.market > 0 ? sums.abs / sums.market : 1;
  const floor = sums.market > 0 ? sums.oracle / sums.market : 0;
  const exceed = sums.days > 0 ? sums.exceed / sums.days : 0;
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  const aWape = clamp01(1 - Math.max(0, wape - floor - f.wapeTolerance) / f.wapeSpan);
  const aP95 = clamp01(1 - Math.abs(exceed - 0.05) / f.exceedSpan);
  const score = f.weights.wape * aWape + f.weights.cv * sums.cvAcc + f.weights.p95 * aP95;
  return { wape, exceed, cvAcc: sums.cvAcc, score };
}

const normalTail = (z: number) => 0.5 * erfc(z / Math.SQRT2);
function erfc(x: number): number {
  // Aproximación de Abramowitz y Stegun 7.1.26 (error < 1.5e-7).
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
  return x >= 0 ? y : 2 - y;
}

/**
 * Pronóstico perfecto de un año a partir del proceso verdadero (para pruebas, el bot oráculo y el modo profesor).
 * El p95 resuelve P(demanda > p95) = 5% sobre los días del año con el ruido normal de CV `truth.cv`.
 */
export function truthForecast(s: Pick<LmState, "truth" | "peakMagnitude">, p: Params, year: number): Forecast {
  const t = s.truth;
  const days = calendarDays(p, 12 * year, 12 * year + 12);
  const exp = days.map((c) => expectedMarket(s, p, c));
  const tail = (x: number) => exp.reduce((a, e) => a + normalTail((x / e - 1) / Math.max(t.cv, 1e-6)), 0) / exp.length;
  let lo = 0;
  let hi = Math.max(...exp) * 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tail(mid) > 0.05) lo = mid;
    else hi = mid;
  }
  return { year, level: t.level * (1 + t.growth) ** year, growth: t.growth, weekday: [...t.weekday], quincena: t.quincena, peaks: { ...t.peaks }, cv: t.cv, p95: (lo + hi) / 2 };
}
