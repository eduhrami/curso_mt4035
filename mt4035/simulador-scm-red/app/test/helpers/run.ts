/** Utilidades de prueba para el modelo SCM. */
import { createRng, type DecisionChanges, type EpochReport, type GameConfig, type GameState, type TickContext } from "@mt4035/sim-core";
import { overrideState } from "@mt4035/sim-core/testing";
import { createScmEngine, params as baseParams, scmConfig, type ScmConfigOptions } from "../../src/model.ts";
import type { DcSpec, DcState, Params, RegionId, ScmState } from "../../src/types.ts";
import { truthForecast } from "../../src/forecast.ts";

/**
 * Fijación de las pruebas de mecanismo: Kaigan con su red clásica (5 CEDIS combinados medianos en la costa y consolidación
 * combinada), una operación que funciona y sirve de base para las pruebas pareadas. La red inicial que juegan los equipos
 * (un CEDIS grande con inventario, AD-52) se prueba con `realEngine` en los escenarios (SCM-ESC-01, SCO-05).
 */
export const fixtureParams = paramsWith((p) => {
  p.regions.kaigan.initial.dcs = { count: 5, type: "combined", size: "medium" } as typeof p.regions.kaigan.initial.dcs;
  p.regions.kaigan.initial.consolidation = "combined";
});
export const engine = createScmEngine(fixtureParams);
/** Como paramsWith, pero sobre la fijación de pruebas de mecanismo. */
export function fixtureWith(mutate: (p: Params) => void): Params {
  const p = structuredClone(fixtureParams);
  mutate(p);
  return p;
}
export const realEngine = createScmEngine();

/**
 * Configuración determinista (eventos apagados, ruido 0) salvo que se indique otra cosa. Las pruebas de mecanismos
 * corren sin tope de inversión anual (budget: "off"); LAG-10 prueba el tope.
 */
export const det = (region: RegionId, o: ScmConfigOptions = {}): GameConfig =>
  scmConfig({ region, ...o, test: { events: "off", noise: 0, budget: "off", ...(o.test ?? {}) } }) as GameConfig;

export const sto = (region: RegionId, seed: number, o: ScmConfigOptions = {}): GameConfig =>
  scmConfig({ region, seed, ...o, test: { events: "on", noise: 1, budget: "off", ...(o.test ?? {}) } }) as GameConfig;

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

/** Partida nueva con pronóstico perfecto (F-01 = proceso verdadero): las pruebas de mecanismos no dependen de pronosticar. */
export function start(cfg: GameConfig, eng = engine) {
  const g = eng.createGame(cfg);
  g.model.dec.demandForecast = truthForecast(g.model, eng.params, 0);
  return g;
}

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
      { "D-31": pick(["no", "yes"]) },
      { "D-32": pick(["basic", "advanced"]) },
      { "D-22": { skus: st.int(2000, 4000), local: st.bernoulli(0.5) } },
      { "D-23": pick(["manual", "scan"]) },
      { "D-34": pick(["low", "mid", "high"]) },
      { "D-05": pick(["dominance", "dispersed", "mixed"]) },
      { "D-08": st.int(0, 60) },
      { "D-30": pick(["basic", "pos_daily", "pos_terminal"]) },
      { "D-33": pick(["rmi", "cpfr"]) },
      { "D-20": pick(["rop", "periodic", "tanpin"]) },
      { "D-24": st.uniform(0, 5) },
      { "D-12": pick(["supplier", "combined"]) },
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
