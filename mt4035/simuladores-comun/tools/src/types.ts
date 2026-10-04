/** Contrato entre las herramientas de auto-juego y cada simulador (adaptador). */
import type { EpochReport, Engine, GameConfig } from "@mt4035/sim-core";
import type { Policy } from "@mt4035/sim-core/testing";

export type Priority = "P1" | "P2" | "P3";

export interface Bot<S> {
  id: string;
  label: string;
  /** Para qué sirve el bot en la validación (casos de prueba §11.1). */
  purpose: string;
  /** args: parámetros opcionales (los usa el buscador para evaluar un vector de decisiones). */
  policy(seed: number, scenario: string, args?: unknown): Policy<S>;
}

/** Espacio de búsqueda discreto: cada parámetro con sus valores posibles (en orden si es ordinal). */
export type ParamSpace = Record<string, readonly (string | number | boolean)[]>;
export type ParamVector = Record<string, string | number | boolean>;

export interface SearchSpec {
  /** Bot que construye la política a partir de un vector (args). */
  bot: string;
  space: ParamSpace;
  /** Parámetros ordinales cuyo óptimo en un extremo indica posible problema de calibración (AUT-06). */
  ordinal: string[];
  /** Valores de un parámetro ordinal que no cuentan como extremo (p. ej. "conservar la red actual"). */
  notBound?: Record<string, readonly (string | number | boolean)[]>;
  /**
   * Valores extremos que sí indican un problema de calibración, si no son el primero y el último
   * (p. ej. una ventana de 1 h sí, pero "todo el día" es apagar la palanca). Tiene prioridad sobre notBound.
   */
  bounds?: Record<string, readonly (string | number | boolean)[]>;
  /** Vector que reproduce la configuración as-is del escenario (punto de partida del ascenso). */
  baseline?(scenario: string): ParamVector;
  /** Parámetros acoplados que se exploran juntos (producto cartesiano) en cada ronda. */
  groups?: string[][];
  /**
   * Devuelve el vector que realmente se aplica (p. ej. sin CD, todos los flujos son DSD). Evita
   * que dos vectores distintos con el mismo efecto se evalúen como candidatos diferentes y que
   * un parámetro "dormido" cambie de efecto al mover otro.
   */
  canonicalize?(v: ParamVector, scenario: string): ParamVector;
}

export interface SearchOutcome {
  scenario: string;
  strategy: string;
  best: ParamVector;
  score: number;
  evaluations: number;
  atBounds: string[];
}

/** Problemas de una corrida que violan invariantes (KPI no finito, proporción fuera de [0, 1], etc.). */
export type ReportCheck = (reports: readonly EpochReport[]) => string[];

export interface AutoplayAdapter<S = any, P = any> {
  sim: string;
  createEngine(): Engine<S, P>;
  /** Escenarios estructurales a recorrer (p. ej. regiones o territorios). */
  scenarios: string[];
  strategies: string[];
  config(scenario: string, seed: number): GameConfig;
  score(reports: readonly EpochReport[], strategy: string, scenario: string): number;
  bots: Bot<S>[];
  check: ReportCheck;
  /** KPIs para la cobertura de explicabilidad, con umbral absoluto mínimo por KPI. */
  coverage: { kpis: string[]; threshold: number; minAbs: Record<string, number> };
  /** KPIs cuya serie por época se guarda en cada registro (para propiedades que miran trayectorias). */
  trackKpis: string[];
  properties: PropertyDef[];
  /** Opcional: espacio para el bot buscador (BOT-H en SCM, BOT-I en logística). */
  search?: SearchSpec;
}

export interface Task {
  bot: string;
  scenario: string;
  seed: number;
  args?: unknown;
}

export interface RunRecord extends Task {
  ok: boolean;
  error?: string;
  /** Violaciones de invariantes detectadas por adapter.check. */
  problems: string[];
  scores: Record<string, number>;
  /** Promedio de cada KPI sobre las épocas jugadas. */
  kpiMeans: Record<string, number>;
  series: Record<string, number[]>;
  coverage: number;
  changes: number;
  unexplained: { epoch: number; kpi: string; from: number; to: number }[];
  ms: number;
}

export interface PropertyResult {
  pass: boolean;
  detail: string;
}

export interface PropertyDef {
  id: string;
  label: string;
  priority: Priority;
  /** Bots que necesita; si falta alguno en la corrida, la propiedad se omite. */
  needs: string[];
  check(r: import("./results.ts").Results): PropertyResult;
}
