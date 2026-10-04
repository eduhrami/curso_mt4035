/** Puntaje alineado a la estrategia declarada (especificación §7.3). */
import { computeScore, type EpochReport, type GuardrailSpec, type KpiScoreSpec, type ScoreResult } from "@mt4035/sim-core";
import type { Params, Strategy } from "./types.ts";

export function scoreSpecs(strategy: Strategy, p: Params): KpiScoreSpec[] {
  const w = p.score.weights[strategy] as Record<string, number>;
  const ranges = p.score.ranges as Record<string, { direction: "higher" | "lower"; worst: number; best: number }>;
  return Object.entries(w).map(([kpi, weight]) => ({ kpi, weight, ...ranges[kpi]! }));
}

/** Resumen de la partida: promedio de cada KPI sobre las épocas jugadas; guardrails por época. */
export function scoreRun(history: readonly EpochReport[], strategy: Strategy, p: Params): ScoreResult {
  const specs = scoreSpecs(strategy, p);
  const guardrails = p.score.guardrails as GuardrailSpec[];
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
