/** Contrato entre sim-core y los modelos de simulador (AD-05, AD-07). */
import type { ZodType } from "zod";
import type { Rng, Stream, EntityKey } from "./rng.ts";

// ---------------------------------------------------------------------------
// Configuración y calendario
// ---------------------------------------------------------------------------

export interface TestHooks {
  /** "off" desactiva los eventos aleatorios; los forzados ocurren siempre. */
  events?: "on" | "off";
  /** Escala del ruido que el modelo aplica a demanda, tráfico, etc. (0 = determinista). */
  noise?: number;
  forcedEvents?: ForcedEvent[];
  /** Guarda en el reporte los intermedios que el modelo publique con ctx.trace(). */
  trace?: boolean;
}

export interface ForcedEvent {
  id: string;
  epoch: number;
  tick: number;
  severity: number;
}

export interface GameConfig<Scenario = Record<string, unknown>> {
  simId: string;
  simVersion: string;
  paramsVersion: string;
  seed: number;
  scenario: Scenario;
  player?: { name?: string; team?: string };
  test?: TestHooks;
}

export interface Calendar {
  epochs: number;
  ticksPerEpoch(epoch: number): number;
  label(epoch: number): string;
}

// ---------------------------------------------------------------------------
// Log causal y mensajes (AD-08, AD-24)
// ---------------------------------------------------------------------------

export interface Driver {
  label: string;
  value?: number | string | boolean;
  /** Clave de la especificación (D-xx, E-xx, R-xx, X-xx) si aplica. */
  ref?: string;
}

export type CausalKind = "decision" | "activation" | "event" | "rule" | "trend";

export interface CausalEntry {
  epoch: number;
  /** −1 para causas a nivel época (decisiones, activaciones). */
  tick: number;
  kind: CausalKind;
  id: string;
  kpis: string[];
  drivers: Driver[];
  note?: string;
}

export type Severity = "info" | "alerta" | "critico";

export interface Message {
  epoch: number;
  tick: number;
  severity: Severity;
  title: string;
  body: string;
  /** Origen del mensaje (X-xx, R-xx o "sistema"). */
  source: string;
  kpis: string[];
  /** Causas agravantes y mitigantes que explican el mensaje. */
  drivers: Driver[];
  mitigations: Driver[];
}

export interface LedgerEntry {
  epoch: number;
  kind: "capex" | "opex" | "penalty" | "other";
  amount: number;
  source: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Estado de la partida
// ---------------------------------------------------------------------------

export type Phase = "DECIDING" | "FINAL";

export type DecisionChanges = Record<string, unknown>;

export interface DecisionRecord {
  epoch: number;
  changes: DecisionChanges;
}

export interface Project {
  decisionId: string;
  value: unknown;
  decidedAt: number;
  activateAt: number;
}

export interface EventOccurrence {
  id: string;
  epoch: number;
  tick: number;
  severity: number;
  forced: boolean;
  drivers: Driver[];
  mitigations: Driver[];
}

export interface ActiveEvent extends EventOccurrence {
  /** Ticks restantes, incluido el actual. */
  remaining: number;
}

export interface RuleFiring {
  id: string;
  epoch: number;
  tick: number;
  drivers: Driver[];
}

export interface EpochReport {
  epoch: number;
  label: string;
  kpis: Record<string, number>;
  /** Métricas por tick escritas por el modelo (series diarias/semanales, p95). */
  tickMetrics: Record<string, number>[];
  /** Intermedios publicados con ctx.trace() si config.test.trace está activo. */
  trace: Record<string, number>[];
  events: EventOccurrence[];
  rulesFired: RuleFiring[];
  messages: Message[];
  ledger: LedgerEntry[];
  causal: CausalEntry[];
}

export interface GameState<S> {
  config: GameConfig;
  phase: Phase;
  /** Índice (base 0) de la próxima época a correr. */
  epoch: number;
  model: S;
  /** Cambios preparados para la época actual; se pueden reemplazar hasta confirmar. */
  staged: DecisionChanges;
  pending: Project[];
  decisionLog: DecisionRecord[];
  history: EpochReport[];
  ledger: LedgerEntry[];
  /** Eventos en curso que cruzan de una época a otra. */
  activeEvents: ActiveEvent[];
}

// ---------------------------------------------------------------------------
// Contextos que reciben los modelos
// ---------------------------------------------------------------------------

export interface BaseContext<S, P> {
  readonly config: GameConfig;
  readonly params: P;
  readonly epoch: number;
  readonly label: string;
  /** Estado mutable (borrador). El motor lo clona antes de cada época. */
  state: S;
  readonly noise: number;
  stream(subsystem: string, tick: number, entity?: EntityKey): Stream;
  log(entry: Omit<CausalEntry, "epoch" | "tick"> & { tick?: number }): void;
  message(msg: Omit<Message, "epoch" | "tick" | "drivers" | "mitigations"> & { tick?: number; drivers?: Driver[]; mitigations?: Driver[] }): void;
  charge(kind: LedgerEntry["kind"], amount: number, source: string, note?: string): void;
}

export interface TickContext<S, P> extends BaseContext<S, P> {
  readonly tick: number;
  readonly ticks: number;
  /** Métricas de este tick; el modelo las escribe y aggregate() las resume. */
  metrics: Record<string, number>;
  /** Eventos activos en este tick (incluye los que empezaron en épocas previas). */
  readonly activeEvents: readonly ActiveEvent[];
  isActive(eventId: string): ActiveEvent | undefined;
  /** true si config.test.trace está activo: el modelo puede saltarse el costo de preparar trazas. */
  readonly tracing: boolean;
  trace(key: string, value: number): void;
}

export interface EpochContext<S, P> extends BaseContext<S, P> {
  readonly tickMetrics: readonly Record<string, number>[];
  readonly history: readonly EpochReport[];
}

// ---------------------------------------------------------------------------
// Definiciones que aporta cada modelo
// ---------------------------------------------------------------------------

export interface DecisionSpec<S, P, V = unknown> {
  id: string;
  label: string;
  /** Pestaña de la UI (AD-21). */
  tab?: string;
  help?: string;
  schema: ZodType<V>;
  /** Valor vigente en el estado del modelo (sin contar proyectos pendientes). */
  current(state: S): V;
  /** Épocas de retraso hasta que surte efecto (0 = inmediato en la época que se confirma). */
  lag?(value: V, state: S, params: P): number;
  /** Costo inmediato (capex o penalización) que se carga en la época en que se decide. */
  cost?(value: V, state: S, params: P): number;
  /** Tipo de cargo en el ledger para cost() (por omisión "capex"). */
  costKind?: LedgerEntry["kind"];
  /** La UI pide doble confirmación; el motor no lo usa para validar. */
  irreversible?: boolean | ((prev: V, next: V) => boolean);
  /** Dependencias y restricciones; devuelve un mensaje de error o null. */
  validate?(value: V, view: DecisionView<S>, params: P): string | null;
  /** Número máximo de cambios en toda la partida (p. ej. estrategia declarada). */
  maxChanges?: number;
  /** Aplica el valor al estado cuando surte efecto. */
  apply(state: S, value: V, params: P): void;
  /** KPIs que esta decisión mueve (matriz de signos); alimenta la explicabilidad. */
  kpis?: string[];
}

/** Vista de decisiones para validar dependencias: valor vigente + pendientes + preparados. */
export interface DecisionView<S> {
  state: S;
  /** Valor que tendrá la decisión cuando se apliquen pendientes y preparados (incluye el cambio que se valida). */
  effective(id: string): unknown;
  /** Valor antes del cambio que se valida: pendiente más reciente o vigente. Úsalo para "solo ampliar" o "no revertir". */
  previous(id: string): unknown;
}

export interface Modifier<S, P> {
  label: string;
  ref?: string;
  /** Multiplica la probabilidad (>1 agrava, <1 mitiga). */
  factor: number | ((ctx: TickContext<S, P>) => number);
  when(ctx: TickContext<S, P>): boolean;
}

export interface EventDef<S, P> {
  id: string;
  /** Probabilidad base por época (antes de modificadores). */
  pBase(ctx: TickContext<S, P>): number;
  modifiers?: Modifier<S, P>[];
  /** Severidad en [0, 1]; por omisión uniforme en [0.3, 1]. */
  severity?(stream: Stream, ctx: TickContext<S, P>): number;
  /** Duración en ticks (por omisión 1). */
  duration?(severity: number, ctx: TickContext<S, P>): number;
  /** Se ejecuta una vez al iniciar el evento. */
  onStart?(ctx: TickContext<S, P>, ev: ActiveEvent): void;
  /** Se ejecuta en cada tick mientras el evento esté activo (incluido el primero). */
  perTick?(ctx: TickContext<S, P>, ev: ActiveEvent): void;
  kpis: string[];
  message(ctx: TickContext<S, P>, ev: ActiveEvent): { title: string; body: string; severity: Severity };
}

export interface RuleDef<S, P> {
  id: string;
  when(ctx: TickContext<S, P>): boolean;
  apply(ctx: TickContext<S, P>): void;
  explain(ctx: TickContext<S, P>): Driver[];
  kpis: string[];
  /** Si se define, la regla avisa al jugador (como mucho una vez por época). */
  message?(ctx: TickContext<S, P>): { title: string; body: string; severity: Severity };
}

export interface ModelDef<S, P, Scenario = Record<string, unknown>> {
  id: string;
  version: string;
  calendar: Calendar;
  decisions: DecisionSpec<S, P, any>[];
  init(config: GameConfig<Scenario>, params: P, rng: Rng): S;
  onEpochStart?(ctx: EpochContext<S, P>): void;
  tick(ctx: TickContext<S, P>): void;
  rules: RuleDef<S, P>[];
  events: EventDef<S, P>[];
  aggregate(ctx: EpochContext<S, P>): Record<string, number>;
  onEpochEnd?(ctx: EpochContext<S, P>, kpis: Record<string, number>): void;
}
