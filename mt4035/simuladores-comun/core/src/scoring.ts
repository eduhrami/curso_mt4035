/** Puntaje genérico ponderado por estrategia con penalización por guardrails (§7.3 de las especificaciones). */

export interface KpiScoreSpec {
  kpi: string;
  weight: number;
  direction: "higher" | "lower";
  /** Rango de normalización lineal: el peor valor da 0 y el mejor da 1 (con recorte). */
  worst: number;
  best: number;
}

export interface GuardrailSpec {
  kpi: string;
  op: ">=" | "<=";
  value: number;
  /** Puntos (sobre 100) que se restan por cada observación que viola el guardrail. */
  penalty: number;
}

export interface ScoreResult {
  score: number;
  breakdown: { kpi: string; normalized: number; contribution: number }[];
  violations: { kpi: string; count: number; penalty: number }[];
}

export function checkWeights(specs: readonly KpiScoreSpec[], tolerance = 1e-9): void {
  const total = specs.reduce((a, s) => a + s.weight, 0);
  if (Math.abs(total - 1) > tolerance) throw new Error(`Los pesos suman ${total}, deben sumar 1`);
}

export function normalize(value: number, spec: Pick<KpiScoreSpec, "worst" | "best">): number {
  if (spec.best === spec.worst) return value === spec.best ? 1 : 0;
  const x = (value - spec.worst) / (spec.best - spec.worst);
  return Math.min(1, Math.max(0, x));
}

/**
 * values: KPI resumen de la partida (p. ej. promedio de épocas o p95).
 * observations: serie de valores por época (o por día) para contar violaciones de guardrail.
 */
export function computeScore(
  values: Record<string, number>,
  specs: readonly KpiScoreSpec[],
  guardrails: readonly GuardrailSpec[] = [],
  observations: Record<string, readonly number[]> = {},
): ScoreResult {
  checkWeights(specs);
  const breakdown = specs.map((s) => {
    const v = values[s.kpi];
    if (v === undefined || !Number.isFinite(v)) throw new Error(`Falta el KPI ${s.kpi} para el puntaje`);
    const normalized = normalize(v, s);
    return { kpi: s.kpi, normalized, contribution: 100 * s.weight * normalized };
  });
  const violations = guardrails.map((g) => {
    const series = observations[g.kpi] ?? (values[g.kpi] !== undefined ? [values[g.kpi]!] : []);
    const count = series.filter((x) => (g.op === ">=" ? x < g.value : x > g.value)).length;
    return { kpi: g.kpi, count, penalty: count * g.penalty };
  });
  const raw = breakdown.reduce((a, b) => a + b.contribution, 0) - violations.reduce((a, v) => a + v.penalty, 0);
  return { score: Math.min(100, Math.max(0, raw)), breakdown, violations };
}
