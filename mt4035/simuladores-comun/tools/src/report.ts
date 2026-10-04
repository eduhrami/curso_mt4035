/** Reporte de coherencia del auto-juego (casos de prueba §11.3) en Markdown y JSON. */
import { Results } from "./results.ts";
import type { AutoplayAdapter, PropertyDef, PropertyResult, RunRecord, SearchOutcome } from "./types.ts";

export interface PropertyOutcome extends PropertyResult {
  id: string;
  label: string;
  priority: PropertyDef["priority"];
  skipped?: boolean;
}

export interface CoherenceReport {
  sim: string;
  generatedAt: string;
  runs: number;
  failedRuns: number;
  seeds: number;
  bots: string[];
  scenarios: string[];
  strategies: string[];
  properties: PropertyOutcome[];
  alarms: string[];
  scoreTable: { bot: string; scenario: string; strategy: string; mean: number; sd: number; p5: number; p95: number }[];
  coverage: { mean: number; min: number; worst: { kpi: string; count: number }[] };
  msPerRun: number;
  search: SearchOutcome[];
}

export function evaluate(adapter: AutoplayAdapter, records: readonly RunRecord[], generatedAt: string, search: readonly SearchOutcome[] = []): CoherenceReport {
  const res = new Results(records, adapter.strategies, search);
  const properties: PropertyOutcome[] = adapter.properties.map((p) => {
    // El bot buscador no deja registros propios: cuenta como presente si hubo búsqueda.
    const missing = p.needs.filter((b) => (b === adapter.search?.bot ? search.length === 0 : !res.has(b)));
    if (missing.length) return { id: p.id, label: p.label, priority: p.priority, pass: false, skipped: true, detail: `omitida: faltan ${missing.join(", ")}` };
    try {
      return { id: p.id, label: p.label, priority: p.priority, ...p.check(res) };
    } catch (err) {
      return { id: p.id, label: p.label, priority: p.priority, pass: false, detail: `error al evaluar: ${(err as Error).message}` };
    }
  });
  const scoreTable = res.scenarios.flatMap((scenario) =>
    res.bots.flatMap((bot) => adapter.strategies.map((strategy) => ({ bot, scenario, strategy, ...pick(res.summary(bot, scenario, strategy)) }))),
  );
  const unexplained = new Map<string, number>();
  for (const r of records) for (const u of r.unexplained) unexplained.set(u.kpi, (unexplained.get(u.kpi) ?? 0) + 1);
  const covs = records.filter((r) => r.ok).map((r) => r.coverage);
  const totalChanges = records.reduce((a, r) => a + r.changes, 0);
  const explained = records.reduce((a, r) => a + r.coverage * r.changes, 0);
  const failed = records.filter((r) => !r.ok);
  const alarms = [
    ...properties.filter((p) => !p.pass && !p.skipped && p.priority === "P1").map((p) => `${p.id} falla: ${p.detail}`),
    ...(failed.length ? [`${failed.length} corridas con error o invariantes violadas`] : []),
  ];
  return {
    sim: adapter.sim,
    generatedAt,
    runs: records.length,
    failedRuns: failed.length,
    seeds: res.seeds().length,
    bots: res.bots,
    scenarios: res.scenarios,
    strategies: adapter.strategies,
    properties,
    alarms,
    scoreTable,
    coverage: {
      mean: totalChanges ? explained / totalChanges : 1,
      min: covs.length ? Math.min(...covs) : 1,
      worst: [...unexplained.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([kpi, count]) => ({ kpi, count })),
    },
    msPerRun: records.reduce((a, r) => a + r.ms, 0) / Math.max(records.length, 1),
    search: [...search],
  };
}

const pick = (s: { mean: number; sd: number; p5: number; p95: number }) => ({ mean: s.mean, sd: s.sd, p5: s.p5, p95: s.p95 });
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "—");

export function toMarkdown(rep: CoherenceReport, failures: readonly RunRecord[] = []): string {
  const icon = (p: PropertyOutcome) => (p.skipped ? "⏭" : p.pass ? "✅" : "❌");
  const lines = [
    `# Reporte de coherencia — ${rep.sim}`,
    "",
    `Generado: ${rep.generatedAt} · ${rep.runs} corridas (${rep.seeds} semillas × ${rep.bots.length} bots × ${rep.scenarios.length} escenarios) · ${rep.msPerRun.toFixed(0)} ms/corrida`,
    "",
    "## Alarmas de calibración",
    "",
    ...(rep.alarms.length ? rep.alarms.map((a) => `- ⚠ ${a}`) : ["- Ninguna alarma P1."]),
    "",
    "## Propiedades",
    "",
    "| | ID | Prioridad | Propiedad | Detalle |",
    "|---|---|---|---|---|",
    ...rep.properties.map((p) => `| ${icon(p)} | ${p.id} | ${p.priority} | ${p.label} | ${p.detail.replace(/\|/g, "/")} |`),
    "",
    "## Puntaje por bot (media · p5 · p95)",
    "",
  ];
  for (const scenario of rep.scenarios) {
    lines.push(`### ${scenario}`, "", `| Bot | ${rep.strategies.join(" | ")} |`, `|---|${rep.strategies.map(() => "---|").join("")}`);
    for (const bot of rep.bots) {
      const cells = rep.strategies.map((st) => {
        const row = rep.scoreTable.find((r) => r.bot === bot && r.scenario === scenario && r.strategy === st)!;
        return `${f1(row.mean)} · ${f1(row.p5)} · ${f1(row.p95)}`;
      });
      lines.push(`| ${bot} | ${cells.join(" | ")} |`);
    }
    lines.push("");
  }
  lines.push(
    "## Explicabilidad",
    "",
    `Cobertura media ${(rep.coverage.mean * 100).toFixed(1)}% · mínima por corrida ${(rep.coverage.min * 100).toFixed(1)}%`,
    "",
    ...(rep.coverage.worst.length ? ["KPIs con más cambios sin causa registrada:", "", ...rep.coverage.worst.map((w) => `- ${w.kpi}: ${w.count}`)] : ["Sin cambios sin explicar."]),
    "",
  );
  if (rep.search.length) {
    const keys = Object.keys(rep.search[0]!.best);
    lines.push("## Óptimos del bot buscador", "", `| Escenario | Estrategia | Puntaje | En extremo | ${keys.join(" | ")} |`, `|---|---|---|---|${keys.map(() => "---|").join("")}`);
    for (const s of rep.search) lines.push(`| ${s.scenario} | ${s.strategy} | ${f1(s.score)} | ${s.atBounds.join(", ") || "—"} | ${keys.map((k) => String(s.best[k])).join(" | ")} |`);
    lines.push("");
  }
  if (failures.length) {
    lines.push("## Corridas con problemas (primeras 5)", "");
    for (const f of failures.slice(0, 5)) lines.push(`- ${f.bot} · ${f.scenario} · semilla ${f.seed}: ${(f.error ?? f.problems.join("; ")).split("\n")[0]}`);
    lines.push("");
  }
  return lines.join("\n");
}
