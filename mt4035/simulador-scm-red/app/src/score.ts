/** Puntaje alineado a la estrategia declarada (especificación §7.3). */
import { computeScore, type EpochReport, type GuardrailSpec, type KpiScoreSpec, type ScoreResult } from "@mt4035/sim-core";
import type { Params, RegionId, Strategy } from "./types.ts";

type Range = { direction: "higher" | "lower"; worst: number; best: number };

/**
 * Pesos por estrategia y rangos de normalización. Con región, los rangos y guardrails se calibran
 * a la frontera alcanzable de esa región (SCM-SCO-05): sin esto, Red River puntúa 0 haga lo que haga.
 */
export function scoreSpecs(strategy: Strategy, p: Params, region?: RegionId): KpiScoreSpec[] {
  const w = p.score.weights[strategy] as Record<string, number>;
  const ranges = p.score.ranges as Record<string, Range>;
  const local = (region ? p.score.regions[region]?.ranges : undefined) as Record<string, Partial<Range>> | undefined;
  return Object.entries(w).map(([kpi, weight]) => ({ kpi, weight, ...ranges[kpi]!, ...(local?.[kpi] ?? {}) }));
}

export function scoreGuardrails(p: Params, region?: RegionId): GuardrailSpec[] {
  return ((region ? p.score.regions[region]?.guardrails : undefined) ?? p.score.guardrails) as GuardrailSpec[];
}

/** Resumen de la partida: promedio de cada KPI sobre las épocas jugadas; guardrails por época. */
export function scoreRun(history: readonly EpochReport[], strategy: Strategy, p: Params, region?: RegionId): ScoreResult {
  const specs = scoreSpecs(strategy, p, region);
  const guardrails = scoreGuardrails(p, region);
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
