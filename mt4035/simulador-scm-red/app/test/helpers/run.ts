/** Utilidades de prueba para el modelo SCM. */
import { createRng, type DecisionChanges, type EpochReport, type GameConfig, type GameState, type TickContext } from "@mt4035/sim-core";
import { overrideState } from "@mt4035/sim-core/testing";
import { createScmEngine, params as baseParams, scmConfig, type ScmConfigOptions } from "../../src/model.ts";
import type { DcSpec, DcState, Params, RegionId, ScmState } from "../../src/types.ts";

export const engine = createScmEngine();

/** Configuración determinista (eventos apagados, ruido 0) salvo que se indique otra cosa. */
export const det = (region: RegionId, o: ScmConfigOptions = {}): GameConfig =>
  scmConfig({ region, ...o, test: { events: "off", noise: 0, ...(o.test ?? {}) } }) as GameConfig;

export const sto = (region: RegionId, seed: number, o: ScmConfigOptions = {}): GameConfig =>
  scmConfig({ region, seed, ...o, test: { events: "on", noise: 1, ...(o.test ?? {}) } }) as GameConfig;

export function paramsWith(mutate: (p: Params) => void): Params {
  const p = structuredClone(baseParams);
  mutate(p);
  return p;
}

/** Corre n épocas aplicando la política (opcional) antes de cada una. */
export function run(
  state: GameState<ScmState>,
  n: number,
  policy: (s: GameState<ScmState>, e: number) => DecisionChanges = () => ({}),
  eng = engine,
): { state: GameState<ScmState>; reports: EpochReport[] } {
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

/** Aplica varias sustituciones de estado (gancho overrideState). */
export function withOverrides(state: GameState<ScmState>, overrides: Record<string, unknown>): GameState<ScmState> {
  return Object.entries(overrides).reduce((s, [path, v]) => overrideState(s, path, v), state);
}

/** CD ya construidos y operando (para pruebas pareadas sin esperar el retraso). */
export const builtDcs = (specs: DcSpec[]): DcState[] =>
  specs.map((d) => ({ ...d, activeFrom: -1, prevType: d.type, prevSize: d.size, typeFrom: -1, sizeFrom: -1, downUntil: -1 }));

export const sumMetric = (r: EpochReport, k: string) => r.tickMetrics.reduce((a, m) => a + (m[k] ?? 0), 0);
export const meanKpi = (rs: readonly EpochReport[], k: string) => rs.reduce((a, r) => a + r.kpis[k]!, 0) / rs.length;

/** Contexto mínimo para probar reglas de forma unitaria. */
export function fakeCtx(state: ScmState, metrics: Record<string, number> = {}, p: Params = baseParams): TickContext<ScmState, Params> {
  return { state, params: p, metrics, epoch: state.epoch, tick: 0, ticks: 13 } as unknown as TickContext<ScmState, Params>;
}

/** Bot aleatorio con decisiones válidas (BOT-F): cada época prueba algunos cambios y conserva los que validan. */
export function randomPolicy(seed: number, eng = engine) {
  return (s: GameState<ScmState>, e: number): DecisionChanges => {
    const st = createRng(seed).stream("bot", e, 0);
    const pick = <T>(xs: readonly T[]) => xs[st.int(0, xs.length - 1)]!;
    const candidates: DecisionChanges[] = [
      { "D-11": { fresh: st.int(7, 21), chilled: st.int(3, 21), ambient: st.int(1, 7), frozen: st.int(1, 7) } },
      { "D-21": { fresh: st.uniform(0.85, 0.99), chilled: st.uniform(0.85, 0.99), ambient: st.uniform(0.85, 0.99), frozen: st.uniform(0.85, 0.99) } },
      { "D-31": pick(["no", "weekly", "daily"]) },
      { "D-32": pick(["moving_avg", "seasonal", "causal"]) },
      { "D-13": pick(["own", "dedicated", "spot"]) },
      { "D-14": { type: pick(["mono", "multi"]), telemetry: st.bernoulli(0.5) } },
      { "D-15": pick(["peak", "offpeak"]) },
      { "D-16": pick(["corrective", "preventive", "predictive"]) },
      { "D-22": { skus: st.int(2000, 4000), local: st.bernoulli(0.5) } },
      { "D-23": pick(["manual", "scan"]) },
      { "D-25": pick(["fifo", "discount"]) },
      { "D-34": pick(["low", "mid", "high"]) },
      { "D-05": pick(["dominance", "dispersed", "mixed"]) },
      { "D-06": st.uniform(-0.1, 0.15) },
      { "D-08": st.int(0, 60) },
      { "D-30": pick(["basic", "pos_daily", "pos_terminal"]) },
      { "D-33": pick(["arms", "vmi", "cpfr"]) },
      { "D-20": pick(["rop", "periodic", "tanpin"]) },
      { "D-24": st.uniform(0, 5) },
      { "D-12": pick(["supplier", "combined"]) },
      { "D-10": { fresh: pick(["dc", "dsd"]), chilled: pick(["dc", "dsd"]), ambient: pick(["dc", "dsd"]), frozen: pick(["dc", "dsd"]) } },
      {
        "D-01": [
          ...(eng.effectiveValue(s, "D-01") as DcSpec[]),
          ...(st.bernoulli(0.3) && (eng.effectiveValue(s, "D-01") as DcSpec[]).length < 20 ? [{ id: `R${e}`, zone: st.int(0, 35), type: pick(["stocking", "crossdock", "combined"] as const), size: pick(["small", "medium", "large"] as const) }] : []),
        ],
      },
    ];
    let changes: DecisionChanges = {};
    for (const c of candidates) {
      if (!st.bernoulli(0.25)) continue;
      const merged = { ...changes, ...c };
      if (eng.validate(s, merged).ok) changes = merged;
    }
    return changes;
  };
}
