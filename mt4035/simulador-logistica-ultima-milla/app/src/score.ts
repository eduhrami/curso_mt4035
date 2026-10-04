/** Puntaje por estrategia de servicio (especificación §7.3): siempre con los valores p95. */
import { computeScore, type EpochReport, type GuardrailSpec, type KpiScoreSpec, type ScoreResult } from "@mt4035/sim-core";
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

export function scoreRun(history: readonly EpochReport[], strategy: Strategy, p: Params, territory?: TerritoryId): ScoreResult {
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
