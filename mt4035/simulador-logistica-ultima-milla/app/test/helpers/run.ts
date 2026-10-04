/** Utilidades de prueba para el modelo de última milla. */
import { type DecisionChanges, type EpochReport, type GameConfig, type GameState, type TickContext } from "@mt4035/sim-core";
import { overrideState } from "@mt4035/sim-core/testing";
import { createLastMileEngine, lmConfig, params as baseParams, type LmConfigOptions } from "../../src/model.ts";
import type { LmState, Params, TerritoryId } from "../../src/types.ts";

export const engine = createLastMileEngine();

export const det = (territory: TerritoryId, o: LmConfigOptions = {}): GameConfig =>
  lmConfig({ territory, ...o, test: { events: "off", noise: 0, ...(o.test ?? {}) } }) as GameConfig;

export const sto = (territory: TerritoryId, seed: number, o: LmConfigOptions = {}): GameConfig =>
  lmConfig({ territory, seed, ...o, test: { events: "on", noise: 1, ...(o.test ?? {}) } }) as GameConfig;

export function paramsWith(mutate: (p: Params) => void): Params {
  const p = structuredClone(baseParams);
  mutate(p);
  return p;
}

export function run(state: GameState<LmState>, n: number, policy: (s: GameState<LmState>, e: number) => DecisionChanges = () => ({}), eng = engine) {
  const reports: EpochReport[] = [];
  let s = state;
  for (let i = 0; i < n && s.phase !== "FINAL"; i++) {
    const staged = eng.stage(s, policy(s, s.epoch));
    if (staged.errors.length) throw new Error(`Decisiones inválidas en época ${s.epoch}: ${JSON.stringify(staged.errors)}`);
    const r = eng.confirmEpoch(staged.state);
    s = r.state;
    reports.push(r.report);
  }
  return { state: s, reports };
}

export const start = (cfg: GameConfig, eng = engine) => eng.createGame(cfg);

export function withOverrides(state: GameState<LmState>, overrides: Record<string, unknown>): GameState<LmState> {
  return Object.entries(overrides).reduce((s, [path, v]) => overrideState(s, path, v), state);
}

/** Una época determinista con decisiones fijadas directamente en el estado (sin retrasos). */
export const oneEpoch = (territory: TerritoryId, overrides: Record<string, unknown> = {}, o: LmConfigOptions = {}, eng = engine) =>
  run(withOverrides(start(det(territory, o), eng), overrides), 1, undefined, eng).reports[0]!;

/** Avanza el estado hasta la época dada sin decisiones (para probar meses con picos). */
export function epochAt(territory: TerritoryId, epoch: number, overrides: Record<string, unknown> = {}, o: LmConfigOptions = {}) {
  let s = withOverrides(start(det(territory, o)), overrides);
  const r = run(s, epoch);
  s = r.state;
  return { state: s, next: () => run(s, 1).reports[0]! };
}

export const sumMetric = (r: EpochReport, k: string) => r.tickMetrics.reduce((a, m) => a + (m[k] ?? 0), 0);

export function fakeCtx(state: LmState, metrics: Record<string, number> = {}, p: Params = baseParams): TickContext<LmState, Params> {
  return { state, params: p, metrics, epoch: state.epoch, tick: 0, ticks: 31, isActive: () => undefined } as unknown as TickContext<LmState, Params>;
}

/** Bot aleatorio con decisiones válidas (BOT-F), el mismo del auto-juego. */
export { randomPolicy } from "../../autoplay/bots.ts";
