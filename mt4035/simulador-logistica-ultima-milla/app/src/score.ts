/** Puntaje por estrategia de servicio (especificación §7.3): siempre con los valores p95. */
import { computeScore, type EpochReport, type GuardrailSpec, type KpiScoreSpec, type ScoreResult } from "@mt4035/sim-core";
import { accuracyFrom, type ForecastAccuracy } from "./forecast.ts";
import type { Params, Strategy, TerritoryId } from "./types.ts";

type Range = { direction: "higher" | "lower"; worst: number; best: number };

export function scoreSpecs(strategy: Strategy, p: Params, territory?: TerritoryId): KpiScoreSpec[] {
  const w = p.score.weights[strategy] as Record<string, number>;
  const ranges = p.score.ranges as Record<string, Range>;
  const local = (territory ? (p.score.territories as Record<string, { ranges?: Record<string, Partial<Range>> }>)[territory]?.ranges : undefined) ?? {};
  return Object.entries(w).map(([kpi, weight]) => ({ kpi, weight, ...ranges[kpi]!, ...(local[kpi] ?? {}) }));
}

export function scoreGuardrails(p: Params, territory?: TerritoryId): GuardrailSpec[] {
  const local = territory ? (p.score.territories as Record<string, { guardrails?: GuardrailSpec[] }>)[territory]?.guardrails : undefined;
  return (local ?? p.score.guardrails) as GuardrailSpec[];
}

/** Precisión del pronóstico por año jugado (§7.4): cada año se evalúa con el pronóstico vigente en él. */
export function forecastScore(history: readonly EpochReport[], p: Params): { score: number; years: (ForecastAccuracy & { year: number; months: number })[] } {
  const byYear = new Map<number, EpochReport[]>();
  for (const h of history) if (Number.isFinite(h.kpis.FC_ABS)) byYear.set(Math.floor(h.epoch / 12), [...(byYear.get(Math.floor(h.epoch / 12)) ?? []), h]);
  const years = [...byYear.entries()].map(([year, hs]) => {
    const sum = (k: string) => hs.reduce((a, h) => a + (h.kpis[k] ?? 0), 0);
    const acc = accuracyFrom(p, { abs: sum("FC_ABS"), oracle: sum("FC_ORACLE"), market: sum("MARKET"), exceed: sum("FC_EXCEED"), days: sum("FC_DAYS"), cvAcc: sum("FC_CVACC") / hs.length });
    return { ...acc, year, months: hs.length };
  });
  return { score: years.length ? years.reduce((a, y) => a + y.score, 0) / years.length : 0, years };
}

export interface LmScore extends ScoreResult {
  /** Puntaje de la operación (KPIs según la estrategia, con guardrails), 0–100. */
  operational: number;
  /** Calidad del pronóstico, 0–100, y detalle por año. */
  forecast: number;
  forecastYears: ReturnType<typeof forecastScore>["years"];
}

/** Puntaje final: (1 − w) × operación + w × pronóstico, con w = params.forecast.score.weight (30%). */
export function scoreRun(history: readonly EpochReport[], strategy: Strategy, p: Params, territory?: TerritoryId): LmScore {
  const op = operationalScore(history, strategy, p, territory);
  const fc = forecastScore(history, p);
  const w = p.forecast.score.weight;
  return { ...op, score: (1 - w) * op.score + w * 100 * fc.score, operational: op.score, forecast: 100 * fc.score, forecastYears: fc.years };
}

export function operationalScore(history: readonly EpochReport[], strategy: Strategy, p: Params, territory?: TerritoryId): ScoreResult {
  const specs = scoreSpecs(strategy, p, territory);
  const guardrails = scoreGuardrails(p, territory);
  const keys = new Set([...specs.map((s) => s.kpi), ...guardrails.map((g) => g.kpi)]);
  const values: Record<string, number> = {};
  const observations: Record<string, number[]> = {};
  for (const k of keys) {
    const series = history.map((h) => h.kpis[k]!).filter((x) => Number.isFinite(x));
    observations[k] = series;
    values[k] = series.length ? series.reduce((a, b) => a + b, 0) / series.length : NaN;
  }
  return computeScore(values, specs, guardrails, observations);
}
