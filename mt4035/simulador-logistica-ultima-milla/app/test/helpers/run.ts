/** Utilidades de prueba para el modelo de última milla. */
import { createRng, type DecisionChanges, type EpochReport, type GameConfig, type GameState, type TickContext } from "@mt4035/sim-core";
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

/** Bot aleatorio con decisiones válidas (BOT-F). */
export function randomPolicy(seed: number, eng = engine) {
  return (s: GameState<LmState>, e: number): DecisionChanges => {
    const st = createRng(seed).stream("bot", e, 0);
    const pick = <T>(xs: readonly T[]) => xs[st.int(0, xs.length - 1)]!;
    const candidates: DecisionChanges[] = [
      { "D-01": { active: st.bernoulli(0.85), capacity: pick(["low", "mid", "high"]) } },
      { "D-02": { share: st.uniform(0, 1), pickers: pick(["2", "4", "6"]) } },
      { "D-03": st.bernoulli(0.5) },
      { "D-04": st.int(0, 4) },
      { "D-05": st.int(0, 2) },
      { "D-06": st.int(0, 120) },
      { "D-07": st.int(0, 4) },
      { "D-10": pick(["nearest", "lowest", "threshold", "ai"]) },
      { "D-11": pick(["5", "15", "60", "240"]) },
      { "D-12": st.uniform(0.05, 0.5) },
      { "D-20": { express: st.bernoulli(0.3), sameday: st.bernoulli(0.5), nextday: true, standard: st.bernoulli(0.3) } },
      { "D-21": pick(["1h", "2h", "4h", "day"]) },
      { "D-22": pick(["12", "14", "16"]) },
      { "D-23": st.uniform(0, 0.3) },
      { "D-24": pick(["none", "customer", "category", "zone"]) },
      { "D-25": { fee: st.uniform(0, 8), freeThreshold: st.int(0, 100) } },
      { "D-26": pick(["none", "100", "110"]) },
      { "D-30": pick(["3pl", "own", "own_3pl", "own_crowd", "crowd"]) },
      { "D-31": pick(["van", "ev", "moto", "bike", "reefer"]) },
      { "D-32": pick(["none", "coolers", "reefer", "multi"]) },
      { "D-33": pick(["lean", "standard", "ample"]) },
      { "D-34": { two: st.bernoulli(0.4), weekends: st.bernoulli(0.7) } },
      { "D-35": pick(["fixed", "per_stop", "mixed"]) },
      { "D-36": pick(["none", "advance", "spot"]) },
      { "D-40": st.int(3, 30) },
      { "D-41": pick(["fixed", "kmeans", "balanced", "capacitated", "dynamic"]) },
      { "D-42": pick(["never", "quarterly", "monthly", "daily"]) },
      { "D-43": pick(["manual", "heuristic", "vrptw", "ai"]) },
      { "D-44": pick(["euclid", "avgtime", "timedep"]) },
      { "D-45": pick(["none", "fresh_first"]) },
      { "D-50": pick(["none", "sms", "live"]) },
      { "D-51": pick(["none", "capture", "geocode"]) },
      { "D-52": pick(["retry_same", "retry_next", "divert", "neighbor"]) },
      { "D-53": pick(["allow", "limit", "remove"]) },
      { "D-55": pick(["store", "pickup", "locker", "mixed"]) },
      { "D-56": pick(["dedicated", "backhaul"]) },
      { "D-60": pick(["basic", "gps", "full"]) },
      { "D-61": pick(["mean", "daily", "p95"]) },
      { "D-62": pick(["none", "gps", "full"]) },
      { "D-63": pick(["corrective", "preventive"]) },
    ];
    let changes: DecisionChanges = {};
    for (const c of candidates) {
      if (!st.bernoulli(0.2)) continue;
      const merged = { ...changes, ...c };
      if (eng.validate(s, merged).ok) changes = merged;
    }
    return changes;
  };
}
