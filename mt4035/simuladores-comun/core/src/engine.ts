/**
 * Motor genérico de épocas (AD-05). Funciones puras sobre GameState: cada llamada clona el
 * estado y devuelve uno nuevo. El orden dentro de cada tick es fijo:
 *
 *   1. eventos (inicio de nuevos + efecto por tick de los activos)
 *   2. model.tick()
 *   3. reglas (sus efectos sobre el estado se ven a partir del tick siguiente)
 *
 * Al inicio de la época se procesan, en este orden: decisiones confirmadas (capex, aplicación
 * inmediata o proyecto con retraso), activación de proyectos que vencen y onEpochStart().
 */
import { createRng, type Rng, type Stream } from "./rng.ts";
import { perTickProbability } from "./math.ts";
import type {
  ActiveEvent,
  BaseContext,
  CausalEntry,
  DecisionChanges,
  DecisionSpec,
  DecisionView,
  Driver,
  EpochContext,
  EpochReport,
  EventDef,
  EventOccurrence,
  GameConfig,
  GameState,
  LedgerEntry,
  Message,
  ModelDef,
  RuleFiring,
  TickContext,
} from "./types.ts";

export interface ValidationError {
  id: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface Engine<S, P> {
  readonly model: ModelDef<S, P, any>;
  readonly params: P;
  createGame(config: GameConfig): GameState<S>;
  /** Valor que tendrá la decisión tras aplicar pendientes y preparados. */
  effectiveValue(state: GameState<S>, id: string): unknown;
  validate(state: GameState<S>, changes: DecisionChanges): ValidationResult;
  /**
   * Reemplaza el conjunto de cambios preparados de la época actual (deshacer = preparar menos).
   * Si hay errores, devuelve el estado sin cambios.
   */
  stage(state: GameState<S>, changes: DecisionChanges): { state: GameState<S>; errors: ValidationError[] };
  /** Sella los cambios preparados y corre la época. Es la única forma de avanzar. */
  confirmEpoch(state: GameState<S>): { state: GameState<S>; report: EpochReport };
  epochLabel(epoch: number): string;
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function createEngine<S, P>(model: ModelDef<S, P, any>, params: P): Engine<S, P> {
  const specs = new Map<string, DecisionSpec<S, P, any>>(model.decisions.map((d) => [d.id, d]));
  if (specs.size !== model.decisions.length) throw new Error(`Modelo ${model.id}: IDs de decisión duplicados`);

  const pendingValue = (state: GameState<S>, id: string): { found: boolean; value: unknown } => {
    let found = false;
    let value: unknown;
    let latest = -Infinity;
    for (const p of state.pending) {
      if (p.decisionId === id && p.decidedAt >= latest) {
        latest = p.decidedAt;
        value = p.value;
        found = true;
      }
    }
    return { found, value };
  };

  const effectiveWith = (state: GameState<S>, staged: DecisionChanges, id: string): unknown => {
    if (Object.prototype.hasOwnProperty.call(staged, id)) return staged[id];
    const p = pendingValue(state, id);
    if (p.found) return p.value;
    const spec = specs.get(id);
    if (!spec) throw new Error(`Decisión desconocida: ${id}`);
    return spec.current(state.model);
  };

  const changeCount = (state: GameState<S>, id: string): number =>
    state.decisionLog.reduce((n, r) => n + (Object.prototype.hasOwnProperty.call(r.changes, id) ? 1 : 0), 0);

  function validate(state: GameState<S>, changes: DecisionChanges): ValidationResult {
    const errors: ValidationError[] = [];
    if (state.phase === "FINAL") return { ok: false, errors: [{ id: "*", message: "La partida terminó" }] };
    const parsed: DecisionChanges = {};
    for (const [id, raw] of Object.entries(changes)) {
      const spec = specs.get(id);
      if (!spec) {
        errors.push({ id, message: "Decisión desconocida" });
        continue;
      }
      const r = spec.schema.safeParse(raw);
      if (!r.success) {
        errors.push({ id, message: `Valor inválido: ${r.error.issues.map((i) => i.message).join("; ")}` });
        continue;
      }
      parsed[id] = r.data;
      if (spec.maxChanges !== undefined && changeCount(state, id) + 1 > spec.maxChanges) {
        errors.push({ id, message: `Solo se permite cambiar ${spec.maxChanges} vez/veces en la partida` });
      }
    }
    const view: DecisionView<S> = {
      state: state.model,
      effective: (id) => effectiveWith(state, parsed, id),
      previous: (id) => effectiveWith(state, {}, id),
    };
    for (const [id, value] of Object.entries(parsed)) {
      const msg = specs.get(id)!.validate?.(value, view, params) ?? null;
      if (msg) errors.push({ id, message: msg });
    }
    return { ok: errors.length === 0, errors };
  }

  function stage(state: GameState<S>, changes: DecisionChanges) {
    const v = validate(state, changes);
    if (!v.ok) return { state, errors: v.errors };
    const next = structuredClone(state);
    next.staged = {};
    // Orden canónico (el del modelo) y sin cambios que no cambian nada.
    for (const spec of model.decisions) {
      if (!Object.prototype.hasOwnProperty.call(changes, spec.id)) continue;
      const value = spec.schema.parse(changes[spec.id]);
      if (!sameValue(value, effectiveWith(state, {}, spec.id))) next.staged[spec.id] = value;
    }
    return { state: next, errors: [] as ValidationError[] };
  }

  function createGame(config: GameConfig): GameState<S> {
    const cfg = structuredClone(config);
    cfg.seed = cfg.seed >>> 0;
    const rng = createRng(cfg.seed);
    return {
      config: cfg,
      phase: "DECIDING",
      epoch: 0,
      model: model.init(cfg, params, rng),
      staged: {},
      pending: [],
      decisionLog: [],
      history: [],
      ledger: [],
      activeEvents: [],
    };
  }

  function confirmEpoch(input: GameState<S>) {
    if (input.phase === "FINAL") throw new Error("La partida terminó: no hay más épocas");
    const v = validate(input, input.staged);
    if (!v.ok) throw new Error(`Decisiones preparadas inválidas: ${v.errors.map((e) => `${e.id}: ${e.message}`).join(" | ")}`);

    const state = structuredClone(input);
    const e = state.epoch;
    const label = model.calendar.label(e);
    const ticks = model.calendar.ticksPerEpoch(e);
    const rng: Rng = createRng(state.config.seed);
    const noise = state.config.test?.noise ?? 1;

    const causal: CausalEntry[] = [];
    const messages: Message[] = [];
    const ledger: LedgerEntry[] = [];
    const events: EventOccurrence[] = [];
    const rulesFired: RuleFiring[] = [];
    const tickMetrics: Record<string, number>[] = [];
    const traces: Record<string, number>[] = [];

    const base = (tick: number): BaseContext<S, P> => ({
      config: state.config,
      params,
      epoch: e,
      label,
      get state() {
        return state.model;
      },
      set state(s: S) {
        state.model = s;
      },
      noise,
      stream: (subsystem, t, entity) => rng.stream(subsystem, e, t, entity),
      log: (entry) => causal.push({ ...entry, epoch: e, tick: entry.tick ?? tick }),
      message: (msg) =>
        messages.push({ ...msg, epoch: e, tick: msg.tick ?? tick, drivers: msg.drivers ?? [], mitigations: msg.mitigations ?? [] }),
      charge: (kind, amount, source, note) => ledger.push({ epoch: e, kind, amount, source, ...(note ? { note } : {}) }),
    });

    // 1. Decisiones confirmadas
    const epochCtx0 = base(-1);
    const sealed = state.staged;
    for (const spec of model.decisions) {
      if (!Object.prototype.hasOwnProperty.call(sealed, spec.id)) continue;
      const value = sealed[spec.id];
      const cost = spec.cost?.(value, state.model, params) ?? 0;
      if (cost !== 0) epochCtx0.charge(spec.costKind ?? "capex", cost, spec.id);
      const lag = Math.max(0, Math.floor(spec.lag?.(value, state.model, params) ?? 0));
      epochCtx0.log({ kind: "decision", id: spec.id, kpis: spec.kpis ?? [], drivers: [{ label: spec.label, value: JSON.stringify(value), ref: spec.id }], note: lag ? `surte efecto en ${model.calendar.label(e + lag)}` : undefined });
      // Una decisión nueva sustituye a un proyecto pendiente de la misma decisión.
      state.pending = state.pending.filter((p) => p.decisionId !== spec.id);
      if (lag === 0) spec.apply(state.model, value, params);
      else state.pending.push({ decisionId: spec.id, value, decidedAt: e, activateAt: e + lag });
    }
    if (Object.keys(sealed).length) state.decisionLog.push({ epoch: e, changes: sealed });
    state.staged = {};

    // 2. Proyectos que surten efecto en esta época
    const due = state.pending.filter((p) => p.activateAt <= e);
    state.pending = state.pending.filter((p) => p.activateAt > e);
    for (const p of due) {
      const spec = specs.get(p.decisionId)!;
      spec.apply(state.model, p.value, params);
      epochCtx0.log({ kind: "activation", id: spec.id, kpis: spec.kpis ?? [], drivers: [{ label: spec.label, value: JSON.stringify(p.value), ref: spec.id }], note: `decidido en ${model.calendar.label(p.decidedAt)}` });
    }

    // 3. Inicio de época
    const makeEpochCtx = (): EpochContext<S, P> =>
      Object.defineProperties(base(-1), { tickMetrics: { value: tickMetrics }, history: { value: state.history } }) as EpochContext<S, P>;
    model.onEpochStart?.(makeEpochCtx());

    // 4. Ticks
    const forced = (state.config.test?.forcedEvents ?? []).filter((f) => f.epoch === e);
    const eventsOn = (state.config.test?.events ?? "on") !== "off";
    const traceOn = state.config.test?.trace ?? false;
    let active: ActiveEvent[] = state.activeEvents;
    const rulesMessaged = new Set<string>();

    for (let t = 0; t < ticks; t++) {
      const metrics: Record<string, number> = {};
      const trace: Record<string, number> = {};
      // defineProperties (no Object.assign) para conservar el getter de eventos activos.
      const ctx = Object.defineProperties(base(t), {
        tick: { value: t },
        ticks: { value: ticks },
        metrics: { value: metrics },
        activeEvents: { get: () => active },
        isActive: { value: (id: string) => active.find((a) => a.id === id) },
        trace: {
          value: (key: string, value: number) => {
            if (traceOn) trace[key] = value;
          },
        },
      }) as TickContext<S, P>;

      // 4a. Inicio de eventos
      for (const def of model.events) {
        const f = forced.find((x) => x.id === def.id && x.tick === t);
        if (!f && !eventsOn) continue;
        if (active.some((a) => a.id === def.id)) continue; // no se apilan ocurrencias del mismo evento
        const { p, drivers, mitigations } = eventProbability(def, ctx);
        const stream: Stream = ctx.stream("events", t, def.id);
        const draw = stream.next();
        if (!f && !(draw < perTickProbability(p, ticks))) continue;
        const severity = f ? f.severity : def.severity?.(stream, ctx) ?? stream.uniform(0.3, 1);
        const duration = Math.max(1, Math.floor(def.duration?.(severity, ctx) ?? 1));
        const ev: ActiveEvent = { id: def.id, epoch: e, tick: t, severity, forced: !!f, drivers, mitigations, remaining: duration };
        active = [...active, ev];
        const { remaining: _r, ...occurrence } = ev;
        events.push(occurrence);
        def.onStart?.(ctx, ev);
        const m = def.message(ctx, ev);
        ctx.message({ ...m, source: def.id, kpis: def.kpis, drivers, mitigations });
        ctx.log({ kind: "event", id: def.id, kpis: def.kpis, drivers: [...drivers, ...mitigations, { label: "severidad", value: round(severity) }] });
      }
      // 4b. Efecto por tick de los eventos activos
      for (const ev of active) model.events.find((d) => d.id === ev.id)?.perTick?.(ctx, ev);

      // 4c. Modelo
      model.tick(ctx);

      // 4d. Reglas
      for (const rule of model.rules) {
        if (!rule.when(ctx)) continue;
        const drivers = rule.explain(ctx);
        rule.apply(ctx);
        rulesFired.push({ id: rule.id, epoch: e, tick: t, drivers });
        ctx.log({ kind: "rule", id: rule.id, kpis: rule.kpis, drivers });
        if (rule.message && !rulesMessaged.has(rule.id)) {
          rulesMessaged.add(rule.id);
          ctx.message({ ...rule.message(ctx), source: rule.id, kpis: rule.kpis, drivers });
        }
      }

      // 4e. Avance de eventos activos
      active = active.map((a) => ({ ...a, remaining: a.remaining - 1 })).filter((a) => a.remaining > 0);
      tickMetrics.push(metrics);
      traces.push(trace);
    }
    state.activeEvents = active;

    // 5. Agregación y cierre
    const endCtx = makeEpochCtx();
    const kpis = model.aggregate(endCtx);
    model.onEpochEnd?.(endCtx, kpis);

    const report: EpochReport = { epoch: e, label, kpis, tickMetrics, trace: traceOn ? traces : [], events, rulesFired, messages, ledger, causal };
    state.history.push(report);
    state.ledger.push(...ledger);
    state.epoch = e + 1;
    if (state.epoch >= model.calendar.epochs) state.phase = "FINAL";
    return { state, report };
  }

  return {
    model,
    params,
    createGame,
    effectiveValue: (state, id) => effectiveWith(state, state.staged, id),
    validate,
    stage,
    confirmEpoch,
    epochLabel: (n) => model.calendar.label(n),
  };
}

function eventProbability<S, P>(def: EventDef<S, P>, ctx: TickContext<S, P>): { p: number; drivers: Driver[]; mitigations: Driver[] } {
  let p = def.pBase(ctx);
  const drivers: Driver[] = [];
  const mitigations: Driver[] = [];
  for (const m of def.modifiers ?? []) {
    if (!m.when(ctx)) continue;
    const factor = typeof m.factor === "function" ? m.factor(ctx) : m.factor;
    p *= factor;
    const d: Driver = { label: m.label, value: round(factor), ...(m.ref ? { ref: m.ref } : {}) };
    if (factor >= 1) drivers.push(d);
    else mitigations.push(d);
  }
  return { p: Math.min(1, Math.max(0, p)), drivers, mitigations };
}

const round = (x: number): number => Math.round(x * 1000) / 1000;

/** Etiquetas estándar de época (AD-29). */
export const quarterLabel = (epoch: number): string => `A${Math.floor(epoch / 4) + 1}-T${(epoch % 4) + 1}`;
export const monthLabel = (epoch: number): string => `A${Math.floor(epoch / 12) + 1}-M${String((epoch % 12) + 1).padStart(2, "0")}`;
