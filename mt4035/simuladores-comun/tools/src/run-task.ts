/** Ejecuta una partida completa (bot × escenario × semilla) y la resume en un RunRecord. */
import { explainabilityCoverage, type Engine } from "@mt4035/sim-core";
import { playGame } from "@mt4035/sim-core/testing";
import type { AutoplayAdapter, RunRecord, Task } from "./types.ts";

export function runTask<S, P>(adapter: AutoplayAdapter<S, P>, engine: Engine<S, P>, task: Task): RunRecord {
  const t0 = performance.now();
  const base: RunRecord = { ...task, ok: false, problems: [], scores: {}, kpiMeans: {}, series: {}, coverage: 1, changes: 0, unexplained: [], ms: 0 };
  try {
    const bot = adapter.bots.find((b) => b.id === task.bot);
    if (!bot) throw new Error(`Bot desconocido: ${task.bot}`);
    const { reports } = playGame(engine, adapter.config(task.scenario, task.seed), bot.policy(task.seed, task.scenario, task.args));
    const problems = adapter.check(reports);
    const scores = Object.fromEntries(adapter.strategies.map((st) => [st, adapter.score(reports, st, task.scenario)]));
    const keys = Object.keys(reports[0]?.kpis ?? {});
    const kpiMeans = Object.fromEntries(keys.map((k) => [k, reports.reduce((a, r) => a + (r.kpis[k] ?? NaN), 0) / reports.length]));
    const series = Object.fromEntries(adapter.trackKpis.map((k) => [k, reports.map((r) => r.kpis[k] ?? NaN)]));
    const cov = explainabilityCoverage(reports, adapter.coverage.threshold, adapter.coverage.kpis, adapter.coverage.minAbs);
    return {
      ...base,
      ok: problems.length === 0 && Object.values(scores).every(Number.isFinite),
      problems,
      scores,
      kpiMeans,
      series,
      coverage: cov.coverage,
      changes: cov.total,
      unexplained: cov.unexplained.slice(0, 5).map(({ epoch, kpi, from, to }) => ({ epoch, kpi, from, to })),
      ms: performance.now() - t0,
    };
  } catch (err) {
    return { ...base, error: (err as Error).stack ?? String(err), ms: performance.now() - t0 };
  }
}
