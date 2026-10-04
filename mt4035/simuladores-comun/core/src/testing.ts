/** Utilidades para pruebas y auto-juego (ganchos §2 de los casos de prueba). No usar en la UI. */
import type { Engine } from "./engine.ts";
import type { DecisionChanges, EpochReport, GameConfig, GameState } from "./types.ts";

/**
 * Devuelve una copia del estado con un valor fijado en state.model (gancho overrideState).
 * path: "inventory.fresh" o ["inventory", "fresh"].
 */
export function overrideState<S>(state: GameState<S>, path: string | readonly string[], value: unknown): GameState<S> {
  const next = structuredClone(state);
  const parts = typeof path === "string" ? path.split(".") : [...path];
  if (!parts.length) throw new Error("overrideState: ruta vacía");
  let obj = next.model as Record<string, unknown>;
  for (const k of parts.slice(0, -1)) {
    if (typeof obj[k] !== "object" || obj[k] === null) throw new Error(`overrideState: ruta inexistente en '${k}'`);
    obj = obj[k] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1]!;
  if (!(last in obj)) throw new Error(`overrideState: la propiedad '${last}' no existe`);
  obj[last] = value;
  return next;
}

/** Congela en profundidad (para verificar que las funciones del motor no mutan su entrada). */
export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as Record<string, unknown>)) deepFreeze(v);
  }
  return obj;
}

export type Policy<S> = (state: GameState<S>, epoch: number) => DecisionChanges;

/** Juega una partida completa con una política (bot) y devuelve el estado final y los reportes. */
export function playGame<S, P>(
  engine: Engine<S, P>,
  config: GameConfig,
  policy: Policy<S> = () => ({}),
  maxEpochs = Infinity,
): { state: GameState<S>; reports: EpochReport[] } {
  let state = engine.createGame(config);
  const reports: EpochReport[] = [];
  while (state.phase !== "FINAL" && reports.length < maxEpochs) {
    const changes = policy(state, state.epoch);
    const staged = engine.stage(state, changes);
    if (staged.errors.length) {
      throw new Error(`Política inválida en época ${state.epoch}: ${staged.errors.map((e) => `${e.id}: ${e.message}`).join("; ")}`);
    }
    const r = engine.confirmEpoch(staged.state);
    state = r.state;
    reports.push(r.report);
  }
  return { state, reports };
}

/** Lista de todos los valores numéricos de los KPIs de un historial (para detectar NaN/∞). */
export const allKpiValues = (reports: readonly EpochReport[]): number[] => reports.flatMap((r) => Object.values(r.kpis));
