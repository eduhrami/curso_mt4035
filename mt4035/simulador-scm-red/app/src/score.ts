/** Puntaje alineado a la estrategia declarada (especificación §7.3). */
import { computeScore, type EpochReport, type GuardrailSpec, type KpiScoreSpec, type ScoreResult } from "@mt4035/sim-core";
import { accuracyFrom, type ForecastAccuracy } from "./forecast.ts";
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

/** Precisión del pronóstico por año jugado (§7.4): cada año se califica con el pronóstico vigente en él. */
export function forecastScore(history: readonly EpochReport[], p: Params): { score: number; years: (ForecastAccuracy & { year: number; quarters: number })[] } {
  const byYear = new Map<number, EpochReport[]>();
  for (const h of history) if (Number.isFinite(h.kpis.FC_ABS)) byYear.set(Math.floor(h.epoch / 4), [...(byYear.get(Math.floor(h.epoch / 4)) ?? []), h]);
  const years = [...byYear.entries()].map(([year, hs]) => {
    const sum = (k: string) => hs.reduce((a, h) => a + (h.kpis[k] ?? 0), 0);
    const acc = accuracyFrom(p, { abs: sum("FC_ABS"), oracle: sum("FC_ORACLE"), market: sum("MARKET"), exceed: sum("FC_EXCEED"), weeks: sum("FC_WEEKS"), cvAcc: sum("FC_CVACC") / hs.length });
    return { ...acc, year, quarters: hs.length };
  });
  return { score: years.length ? years.reduce((a, y) => a + y.score, 0) / years.length : 0, years };
}

/** Guardrails de servicio de la propuesta de valor (§7.5): umbral = guardrail calibrado de la región + delta. */
export function serviceGuardrails(strategy: Strategy, p: Params, region?: RegionId): { kpi: string; op: ">=" | "<="; value: number }[] {
  const base = scoreGuardrails(p, region);
  return (p.money.serviceGuardrails[strategy] as { kpi: string; op: string; delta: number; base?: string }[]).map((g) => ({
    kpi: g.kpi,
    op: g.op as ">=" | "<=",
    value: (base.find((b) => b.kpi === (g.base ?? g.kpi))?.value ?? 0) + g.delta,
  }));
}

/** Utilidad acumulada (USD, §7.5): Σ (EBITDA logístico − capex y cargos). Puntaje definitivo. */
export const profitOf = (history: readonly EpochReport[]) => history.reduce((a, h) => a + (h.kpis.PROFIT ?? 0), 0);

export interface ScmScore extends ScoreResult {
  /** Utilidad acumulada (USD): puntaje definitivo de la partida. */
  profit: number;
  /** Puntaje de la operación según la propuesta de valor (KPIs con guardrails), 0–100. */
  operational: number;
  /** Calidad del pronóstico, 0–100, y detalle por año. */
  forecast: number;
  forecastYears: ReturnType<typeof forecastScore>["years"];
}

/** Puntaje: (1 − w) × operación + w × pronóstico, con w = params.forecast.score.weight (30%). */
export function scoreRun(history: readonly EpochReport[], strategy: Strategy, p: Params, region?: RegionId): ScmScore {
  const op = operationalScore(history, strategy, p, region);
  const fc = forecastScore(history, p);
  const w = p.forecast.score.weight;
  return { ...op, score: (1 - w) * op.score + w * 100 * fc.score, operational: op.score, forecast: 100 * fc.score, forecastYears: fc.years, profit: profitOf(history) };
}

/** Resumen de la partida: promedio de cada KPI sobre las épocas jugadas; guardrails por época. */
export function operationalScore(history: readonly EpochReport[], strategy: Strategy, p: Params, region?: RegionId): ScoreResult {
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
