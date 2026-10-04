/**
 * Replay de una corrida exportada (AD-12): vuelve a correr la semilla con las decisiones
 * registradas y compara KPIs y eventos. Es la verificación real; el checksum solo detecta
 * alteraciones accidentales.
 *
 * Tolerancia: las funciones Math.* (exp, log, cos) pueden diferir en el último bit entre motores
 * de JavaScript (V8, SpiderMonkey, JavaScriptCore). Por eso los KPIs se comparan con tolerancia
 * relativa y no bit a bit cuando la corrida se generó en otro navegador.
 */
import { verifyChecksum, type RunExport } from "./export.ts";
import type { Engine } from "./engine.ts";
import type { GameConfig, GameState } from "./types.ts";

export interface KpiDiff {
  epoch: number;
  kpi: string;
  expected: number | undefined;
  actual: number | undefined;
}

export interface ReplayResult<S> {
  ok: boolean;
  checksumOk: boolean;
  simOk: boolean;
  versionOk: boolean;
  kpiDiffs: KpiDiff[];
  eventDiffs: { epoch: number; expected: string; actual: string }[];
  errors: string[];
  state?: GameState<S>;
}

export interface ReplayOptions {
  /** Tolerancia relativa para KPIs (por omisión 1e-9). */
  tolerance?: number;
  simVersion: string;
  paramsVersion: string;
}

const close = (a: number, b: number, tol: number): boolean => a === b || Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

export async function replay<S, P>(engine: Engine<S, P>, exp: RunExport, opts: ReplayOptions): Promise<ReplayResult<S>> {
  const tol = opts.tolerance ?? 1e-9;
  const errors: string[] = [];
  const checksumOk = await verifyChecksum(exp);
  const simOk = exp.sim === engine.model.id;
  const versionOk = exp.simVersion === opts.simVersion && exp.paramsVersion === opts.paramsVersion;
  if (!simOk) errors.push(`Simulador distinto: ${exp.sim} ≠ ${engine.model.id}`);
  if (!versionOk) errors.push(`Versión distinta: ${exp.simVersion}/${exp.paramsVersion} ≠ ${opts.simVersion}/${opts.paramsVersion}`);
  if (!simOk) return { ok: false, checksumOk, simOk, versionOk, kpiDiffs: [], eventDiffs: [], errors };

  const config: GameConfig = {
    simId: exp.sim,
    simVersion: exp.simVersion,
    paramsVersion: exp.paramsVersion,
    seed: exp.config.seed,
    scenario: exp.config.scenario,
    ...(exp.player ? { player: exp.player } : {}),
    ...(exp.config.test ? { test: exp.config.test as GameConfig["test"] } : {}),
  };
  let state = engine.createGame(config);
  const byEpoch = new Map(exp.decisions.map((d) => [d.epoch, d.changes]));
  const kpiDiffs: KpiDiff[] = [];
  const eventDiffs: ReplayResult<S>["eventDiffs"] = [];

  for (let e = 0; e < exp.epochsPlayed; e++) {
    const staged = engine.stage(state, byEpoch.get(e) ?? {});
    if (staged.errors.length) {
      errors.push(`Época ${e}: decisiones rechazadas al repetir (${staged.errors.map((x) => `${x.id}: ${x.message}`).join("; ")})`);
      return { ok: false, checksumOk, simOk, versionOk, kpiDiffs, eventDiffs, errors, state };
    }
    const { state: next, report } = engine.confirmEpoch(staged.state);
    state = next;
    const expected = exp.kpis.find((k) => k.epoch === e)?.values ?? {};
    for (const kpi of new Set([...Object.keys(expected), ...Object.keys(report.kpis)])) {
      const a = expected[kpi];
      const b = report.kpis[kpi];
      if (a === undefined || b === undefined || !close(a, b, tol)) kpiDiffs.push({ epoch: e, kpi, expected: a, actual: b });
    }
    const sig = (xs: { id: string; tick: number }[]) => xs.map((x) => `${x.id}@${x.tick}`).join(",");
    const expEv = sig(exp.events.filter((x) => x.epoch === e));
    const actEv = sig(report.events);
    if (expEv !== actEv) eventDiffs.push({ epoch: e, expected: expEv, actual: actEv });
  }
  const ok = checksumOk && versionOk && kpiDiffs.length === 0 && eventDiffs.length === 0 && errors.length === 0;
  return { ok, checksumOk, simOk, versionOk, kpiDiffs, eventDiffs, errors, state };
}
