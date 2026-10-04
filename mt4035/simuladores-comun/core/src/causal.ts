/** Consultas sobre el log causal (AD-08): "¿por qué pasó esto?" y cobertura de explicabilidad. */
import type { CausalEntry, EpochReport } from "./types.ts";

/** Entradas del log de una época que afectan a un KPI ("*" en kpis = afecta a todos). */
export function explainKpi(report: EpochReport, kpi: string): CausalEntry[] {
  return report.causal.filter((c) => c.kpis.includes(kpi) || c.kpis.includes("*"));
}

export interface UnexplainedChange {
  epoch: number;
  label: string;
  kpi: string;
  from: number;
  to: number;
  relChange: number;
}

export interface CoverageResult {
  total: number;
  explained: number;
  coverage: number;
  unexplained: UnexplainedChange[];
}

/**
 * Proporción de cambios relevantes de KPI (|Δ| relativo > threshold entre épocas consecutivas)
 * que tienen al menos una causa registrada en la época del cambio. Criterio SCM-AUT-14 / LOG-AUT-16.
 */
export function explainabilityCoverage(history: readonly EpochReport[], threshold = 0.1, kpis?: readonly string[]): CoverageResult {
  let total = 0;
  let explained = 0;
  const unexplained: UnexplainedChange[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]!;
    const cur = history[i]!;
    for (const kpi of kpis ?? Object.keys(cur.kpis)) {
      const a = prev.kpis[kpi];
      const b = cur.kpis[kpi];
      if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) continue;
      const rel = Math.abs(b - a) / Math.max(Math.abs(a), 1e-9);
      if (rel <= threshold) continue;
      total++;
      if (explainKpi(cur, kpi).length > 0) explained++;
      else unexplained.push({ epoch: cur.epoch, label: cur.label, kpi, from: a, to: b, relChange: rel });
    }
  }
  return { total, explained, coverage: total === 0 ? 1 : explained / total, unexplained };
}
