/** Estado global de la app SCM: store de partida, modo profesor y utilidades. */
import { signal } from "@preact/signals";
import { createGameStore } from "@mt4035/ui-kit";
import type { GameState } from "@mt4035/sim-core";
import { createScmEngine, params, PARAMS_VERSION, scoreRun, SIM_VERSION, type RegionId, type ScmState, type Strategy } from "../src/index.ts";
import { REGION_TEXT, OPTIONS } from "./labels.ts";

export const engine = createScmEngine();

/** Modo profesor (AD-27): ?profesor=1 muestra el puntaje durante el juego y habilita herramientas. */
export const professor = typeof location !== "undefined" && new URLSearchParams(location.search).get("profesor") === "1";

export const regionOf = (s: GameState<ScmState>) => s.model.region as RegionId;

export function finalScore(s: GameState<ScmState>, strategy: Strategy = s.model.strategy) {
  return scoreRun(s.history, strategy, params, regionOf(s));
}

export const store = createGameStore({
  engine,
  storageKey: "mt4035.scm.runs.v1",
  simVersion: SIM_VERSION,
  paramsVersion: PARAMS_VERSION,
  title: (s) => `${REGION_TEXT[regionOf(s)].title} · ${OPTIONS[s.model.strategy]} · ${s.config.player?.name || "sin nombre"} · ${s.history.length}/20`,
  finalScore: (s) => finalScore(s).score,
});

/** Proyectos que aún no surten efecto: decisiones con retraso del motor y CD en obra, conversión o ampliación. */
export function projectsInProgress(s: GameState<ScmState>): string[] {
  const e = s.epoch;
  const fromEngine = s.pending.map((p) => `${p.decisionId}: opera en ${engine.epochLabel(p.activateAt)}`);
  const dcs = s.model.dcs.flatMap((d) => [
    ...(d.activeFrom > e ? [`${d.id} en construcción: opera en ${engine.epochLabel(d.activeFrom)}`] : []),
    ...(d.typeFrom > e ? [`${d.id} en conversión: ${OPTIONS[d.type]} desde ${engine.epochLabel(d.typeFrom)}`] : []),
    ...(d.sizeFrom > e ? [`${d.id} en ampliación: ${OPTIONS[d.size]} desde ${engine.epochLabel(d.sizeFrom)}`] : []),
  ]);
  return [...fromEngine, ...dcs];
}

/** Pantalla actual fuera del juego. */
export const screen = signal<"setup" | "game" | "runs">("setup");
