/** Tarjetas de KPI con estado frente al guardrail (ícono + texto + color, AD-23). */
import type { EpochReport } from "@mt4035/sim-core";
import { fmt, fmtDelta, type KpiFormat } from "../format.ts";

export interface KpiMeta {
  id: string;
  /** Sigla en inglés (convención del curso). */
  acronym: string;
  name: string;
  formula: string;
  format: KpiFormat;
  higherIsBetter: boolean;
  guardrail?: { op: ">=" | "<="; value: number };
}

export type Status = "ok" | "warn" | "bad" | "none";

export function guardrailStatus(meta: KpiMeta, v: number | undefined): Status {
  if (!meta.guardrail || v === undefined || !Number.isFinite(v)) return "none";
  const { op, value } = meta.guardrail;
  const pass = op === ">=" ? v >= value : v <= value;
  if (!pass) return "bad";
  const margin = Math.abs(v - value) / Math.max(Math.abs(value), 1e-9);
  return margin < 0.02 ? "warn" : "ok";
}

const STATUS_TEXT: Record<Status, string> = { ok: "✓ en guardrail", warn: "▲ al límite", bad: "✗ fuera de guardrail", none: "" };

export function KpiCard({ meta, report, prev, onExplain, selected }: { meta: KpiMeta; report: EpochReport | null; prev: EpochReport | null; onExplain?: (kpi: string) => void; selected?: boolean }) {
  const v = report?.kpis[meta.id];
  const p = prev?.kpis[meta.id];
  const st = guardrailStatus(meta, v);
  const better = v !== undefined && p !== undefined ? (meta.higherIsBetter ? v > p : v < p) : undefined;
  return (
    <button type="button" class="card kpi" style={{ textAlign: "left", outline: selected ? "2px solid var(--accent)" : undefined }} onClick={() => onExplain?.(meta.id)} title={`${meta.name}: ${meta.formula}`} aria-label={`${meta.acronym} ${fmt(v, meta.format)}. ${STATUS_TEXT[st]}. Ver causas`}>
      <div class="kpi-name">
        <span>
          <strong>{meta.acronym}</strong> · {meta.name}
        </span>
      </div>
      <div class="kpi-value">{fmt(v, meta.format)}</div>
      <div class="kpi-delta" style={{ color: better === undefined ? "var(--text-muted)" : better ? "var(--ok)" : "var(--bad)" }}>
        {fmtDelta(v, p, meta.format)}
      </div>
      {st !== "none" && (
        <div class="kpi-status">
          <span class={`chip badge-${st}`}>
            {STATUS_TEXT[st]} ({meta.guardrail!.op} {fmt(meta.guardrail!.value, meta.format)})
          </span>
        </div>
      )}
    </button>
  );
}
