/** Estado global de la app de última milla: store de partida, modo profesor y utilidades. */
import { signal } from "@preact/signals";
import { createGameStore } from "@mt4035/ui-kit";
import type { GameState } from "@mt4035/sim-core";
import { createLastMileEngine, debriefFor, params, PARAMS_VERSION, scoreRun, SIM_VERSION, type LmState, type Strategy, type TerritoryId } from "../src/index.ts";
import { OPTIONS, TERRITORY_TEXT } from "./labels.ts";

export const engine = createLastMileEngine();
export const EPOCHS = params.epochs;

/** Modo profesor (AD-27): ?profesor=1 muestra el puntaje durante el juego y habilita herramientas. */
export const professor = typeof location !== "undefined" && new URLSearchParams(location.search).get("profesor") === "1";

export const territoryOf = (s: GameState<LmState>) => s.model.territory as Exclude<TerritoryId, "minicaso">;

export function finalScore(s: GameState<LmState>, strategy: Strategy = s.model.strategy) {
  return scoreRun(s.history, strategy, params, territoryOf(s));
}

export const store = createGameStore({
  engine,
  storageKey: "mt4035.lastmile.runs.v1",
  simVersion: SIM_VERSION,
  paramsVersion: PARAMS_VERSION,
  title: (s) => `${TERRITORY_TEXT[territoryOf(s)].title} · ${OPTIONS[s.model.strategy]} · ${s.config.player?.name || "sin nombre"} · ${s.history.length}/${EPOCHS}`,
  finalScore: (s) => finalScore(s).score,
  debriefQuestions: (s) => debriefFor(s.config.scenario as Parameters<typeof debriefFor>[0]).questions,
});

/** Proyectos que aún no surten efecto (decisiones con retraso: nodos en obra, SFS, datos, contratos). */
export function projectsInProgress(s: GameState<LmState>): string[] {
  const label = (id: string) => engine.model.decisions.find((d) => d.id === id)?.label ?? id;
  return s.pending.map((p) => `${label(p.decisionId)}: opera en ${engine.epochLabel(p.activateAt)}`);
}

/** Pantalla actual fuera del juego. */
export const screen = signal<"setup" | "game" | "runs">("setup");
