/**
 * Controlador de partida con signals (AD-20): estado, borrador de decisiones, validación,
 * confirmación de época, guardado automático y exportación. Sin DOM salvo `download()`.
 */
import { computed, signal, type Signal } from "@preact/signals";
import {
  buildExport,
  kpiRows,
  openStorage,
  parseExport,
  replay,
  RunRepository,
  toCSV,
  type DecisionChanges,
  type Engine,
  type EpochReport,
  type GameConfig,
  type GameState,
  type RunDebrief,
  type RunExport,
  type StorageHandle,
} from "@mt4035/sim-core";

export interface SavedRun {
  export: RunExport;
  finished: boolean;
}

export interface GameStoreOptions<S, P> {
  engine: Engine<S, P>;
  storageKey: string;
  simVersion: string;
  paramsVersion: string;
  /** Título legible de la corrida para la lista de guardadas. */
  title(state: GameState<S>): string;
  /** Puntaje final (se guarda en la exportación al terminar). */
  finalScore?(state: GameState<S>): number;
  /** Preguntas de debrief de la corrida (AD-31); sin ellas no hay debrief. */
  debriefQuestions?(state: GameState<S>): DebriefQuestion[];
  /** Caracteres mínimos por respuesta para dar el debrief por completo (60 por omisión). */
  debriefMinChars?: number;
  /** Para pruebas: almacenamiento alternativo. */
  storage?: StorageHandle;
  /** Para pruebas: generador de ids y reloj. */
  newId?: () => string;
  now?: () => string;
}

export interface DebriefQuestion {
  id: string;
  question: string;
  /** Pista breve de qué incluir en la respuesta. */
  hint?: string;
}

export interface GameStore<S, P> {
  engine: Engine<S, P>;
  state: Signal<GameState<S> | null>;
  draft: Signal<DecisionChanges>;
  errors: Signal<Record<string, string>>;
  runId: Signal<string>;
  runs: Signal<ReturnType<RunRepository<SavedRun>["list"]>>;
  persistent: boolean;
  storageError: Signal<string | null>;
  busy: Signal<boolean>;
  reports: Signal<EpochReport[]>;
  last: Signal<EpochReport | null>;
  changedIds: Signal<string[]>;
  /** Borrador de respuestas del debrief por id de pregunta. */
  debrief: Signal<Record<string, string>>;
  debriefMinChars: number;
  /** Todas las preguntas respondidas con el mínimo de caracteres. */
  debriefComplete: Signal<boolean>;
  setDebriefAnswer(id: string, text: string): void;
  /** Guarda el borrador del debrief en la corrida (al salir de cada campo). */
  saveDebrief(): Promise<void>;
  start(config: GameConfig): void;
  setDecision(id: string, value: unknown): void;
  resetDecision(id: string): void;
  clearDraft(): void;
  /** Valor que verá el jugador: borrador si existe; si no, pendiente o vigente. */
  valueOf(id: string): unknown;
  confirm(): Promise<EpochReport | null>;
  exportRun(): Promise<RunExport>;
  load(exp: RunExport): Promise<string | null>;
  remove(id: string): void;
  csv(): string;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const defaultId = () => (globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function createGameStore<S, P>(o: GameStoreOptions<S, P>): GameStore<S, P> {
  const { engine } = o;
  const handle = o.storage ?? openStorage();
  const repo = new RunRepository<SavedRun>(handle, o.storageKey, 1);
  const state = signal<GameState<S> | null>(null);
  const draft = signal<DecisionChanges>({});
  const errors = signal<Record<string, string>>({});
  const runId = signal("");
  const runs = signal(repo.list());
  const storageError = signal<string | null>(handle.persistent ? repo.lastError : (handle.reason ?? "almacenamiento no disponible"));
  const busy = signal(false);
  const reports = computed(() => state.value?.history ?? []);
  const last = computed(() => reports.value[reports.value.length - 1] ?? null);
  const changedIds = computed(() => Object.keys(draft.value));
  const now = o.now ?? (() => new Date().toISOString());
  const debrief = signal<Record<string, string>>({});
  const debriefMinChars = o.debriefMinChars ?? 60;
  const questions = computed(() => (state.value?.phase === "FINAL" && o.debriefQuestions ? o.debriefQuestions(state.value) : []));
  const debriefComplete = computed(() => questions.value.length > 0 && questions.value.every((q) => (debrief.value[q.id] ?? "").trim().length >= debriefMinChars));
  const debriefExport = (): RunDebrief | undefined => {
    const qs = questions.value;
    if (!qs.length || !qs.some((q) => (debrief.value[q.id] ?? "").trim())) return undefined;
    return { complete: debriefComplete.value, answers: qs.map((q) => ({ id: q.id, question: q.question, answer: (debrief.value[q.id] ?? "").trim() })) };
  };
  const exportOpts = (s: GameState<S>) => {
    const d = debriefExport();
    return { runId: runId.value, createdAt: now(), ...(s.phase === "FINAL" && o.finalScore ? { finalScore: o.finalScore(s) } : {}), ...(d ? { debrief: d } : {}) };
  };

  const revalidate = (d: DecisionChanges) => {
    const s = state.value;
    if (!s) return;
    const r = engine.validate(s, d);
    errors.value = Object.fromEntries(r.errors.map((e) => [e.id, e.message]));
  };

  const save = async () => {
    const s = state.value;
    if (!s) return;
    const finished = s.phase === "FINAL";
    const exp = await buildExport(s, exportOpts(s));
    repo.save({ id: runId.value, savedAt: now(), title: o.title(s), data: { export: exp, finished } });
    storageError.value = handle.persistent ? repo.lastError : storageError.value;
    runs.value = repo.list();
  };

  return {
    engine,
    state,
    draft,
    errors,
    runId,
    runs,
    persistent: handle.persistent,
    storageError,
    busy,
    reports,
    last,
    changedIds,
    debrief,
    debriefMinChars,
    debriefComplete,
    setDebriefAnswer(id, text) {
      debrief.value = { ...debrief.value, [id]: text };
    },
    saveDebrief: () => save(),
    start(config) {
      state.value = engine.createGame(config);
      debrief.value = {};
      draft.value = {};
      errors.value = {};
      runId.value = (o.newId ?? defaultId)();
    },
    setDecision(id, value) {
      const s = state.value;
      if (!s) return;
      const d = { ...draft.value };
      if (same(value, engine.effectiveValue(s, id))) delete d[id];
      else d[id] = value;
      draft.value = d;
      revalidate(d);
    },
    resetDecision(id) {
      const d = { ...draft.value };
      delete d[id];
      draft.value = d;
      revalidate(d);
    },
    clearDraft() {
      draft.value = {};
      errors.value = {};
    },
    valueOf(id) {
      const s = state.value;
      if (!s) return undefined;
      return Object.prototype.hasOwnProperty.call(draft.value, id) ? draft.value[id] : engine.effectiveValue(s, id);
    },
    async confirm() {
      const s = state.value;
      if (!s || busy.value || s.phase === "FINAL") return null;
      const staged = engine.stage(s, draft.value);
      if (staged.errors.length) {
        errors.value = Object.fromEntries(staged.errors.map((e) => [e.id, e.message]));
        return null;
      }
      busy.value = true;
      try {
        const r = engine.confirmEpoch(staged.state);
        state.value = r.state;
        draft.value = {};
        errors.value = {};
        await save();
        return r.report;
      } finally {
        busy.value = false;
      }
    },
    async exportRun() {
      const s = state.value;
      if (!s) throw new Error("No hay partida");
      return buildExport(s, exportOpts(s));
    },
    async load(exp) {
      const parsed = parseExport(exp, engine.model.id);
      if (!parsed.ok) return parsed.error;
      const r = await replay(engine, parsed.value, { simVersion: o.simVersion, paramsVersion: o.paramsVersion });
      if (!r.state) return r.errors.join("; ") || "No se pudo reconstruir la corrida";
      state.value = r.state;
      draft.value = {};
      errors.value = {};
      runId.value = parsed.value.runId;
      debrief.value = Object.fromEntries((parsed.value.debrief?.answers ?? []).map((a) => [a.id, a.answer]));
      return r.ok ? null : `La corrida se cargó pero no coincide exactamente: ${[...r.errors, ...(r.checksumOk ? [] : ["checksum"]), ...r.kpiDiffs.slice(0, 2).map((d) => d.kpi)].join(", ")}`;
    },
    remove(id) {
      repo.remove(id);
      runs.value = repo.list();
    },
    csv() {
      const s = state.value;
      if (!s) return "";
      return toCSV(s.history.map((h) => ({ epoch: h.epoch, label: h.label, ...h.kpis })));
    },
  };
}

/** Descarga un archivo desde el navegador. */
export function download(filename: string, content: string, mime = "application/json"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

export { kpiRows };
