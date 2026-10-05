/** Exportación de corridas a JSON con checksum y a CSV (AD-12). */
import { z } from "zod";
import type { GameState } from "./types.ts";

export const EXPORT_FORMAT = "mt4035-run";
export const EXPORT_SCHEMA_VERSION = 1;

const finite = z.number().refine(Number.isFinite, "número no finito");

/** Respuestas del debrief del jugador (AD-31): viajan dentro de la corrida y las cubre el checksum. */
export const RunDebriefSchema = z.object({
  /** true cuando todas las respuestas cumplen el mínimo; el reporte final solo exporta así. */
  complete: z.boolean(),
  answers: z.array(z.object({ id: z.string(), question: z.string(), answer: z.string() })),
});

export type RunDebrief = z.infer<typeof RunDebriefSchema>;

export const RunExportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  sim: z.string(),
  simVersion: z.string(),
  paramsVersion: z.string(),
  runId: z.string(),
  createdAt: z.string(),
  player: z.object({ name: z.string().optional(), team: z.string().optional() }).optional(),
  config: z.object({
    seed: z.number().int().nonnegative(),
    scenario: z.record(z.string(), z.unknown()),
    test: z.record(z.string(), z.unknown()).optional(),
  }),
  epochsPlayed: z.number().int().nonnegative(),
  decisions: z.array(z.object({ epoch: z.number().int().nonnegative(), changes: z.record(z.string(), z.unknown()) })),
  kpis: z.array(z.object({ epoch: z.number().int().nonnegative(), label: z.string(), values: z.record(z.string(), finite) })),
  events: z.array(z.object({ epoch: z.number().int(), tick: z.number().int(), id: z.string(), severity: finite, forced: z.boolean() })),
  finalScore: finite.optional(),
  debrief: RunDebriefSchema.optional(),
  checksum: z.string(),
});

export type RunExport = z.infer<typeof RunExportSchema>;

/** JSON con llaves ordenadas para que el checksum no dependa del orden de inserción. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto no disponible para calcular el checksum");
  const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const checksumPayload = (exp: Omit<RunExport, "checksum"> | RunExport): string => {
  const { checksum: _c, ...rest } = exp as RunExport;
  return canonicalJson(rest);
};

export interface ExportOptions {
  runId: string;
  /** ISO-8601; se pasa desde fuera para que el motor no dependa del reloj. */
  createdAt: string;
  finalScore?: number;
  debrief?: RunDebrief;
}

export async function buildExport<S>(state: GameState<S>, opts: ExportOptions): Promise<RunExport> {
  const { config } = state;
  const body: Omit<RunExport, "checksum"> = {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    sim: config.simId,
    simVersion: config.simVersion,
    paramsVersion: config.paramsVersion,
    runId: opts.runId,
    createdAt: opts.createdAt,
    ...(config.player ? { player: config.player } : {}),
    config: {
      seed: config.seed,
      scenario: config.scenario as Record<string, unknown>,
      ...(config.test ? { test: config.test as Record<string, unknown> } : {}),
    },
    epochsPlayed: state.history.length,
    decisions: state.decisionLog.map((d) => ({ epoch: d.epoch, changes: d.changes })),
    kpis: state.history.map((h) => ({ epoch: h.epoch, label: h.label, values: h.kpis })),
    events: state.history.flatMap((h) => h.events.map((e) => ({ epoch: e.epoch, tick: e.tick, id: e.id, severity: e.severity, forced: e.forced }))),
    ...(opts.finalScore !== undefined ? { finalScore: opts.finalScore } : {}),
    ...(opts.debrief ? { debrief: opts.debrief } : {}),
  };
  // Pasa por JSON para que el objeto devuelto sea idéntico a uno re-importado.
  const normalized = JSON.parse(JSON.stringify(body)) as Omit<RunExport, "checksum">;
  return { ...normalized, checksum: await sha256Hex(checksumPayload(normalized)) };
}

export async function verifyChecksum(exp: RunExport): Promise<boolean> {
  return (await sha256Hex(checksumPayload(exp))) === exp.checksum;
}

export type ParseResult = { ok: true; value: RunExport } | { ok: false; error: string };

/** Valida un JSON importado (texto u objeto) contra el esquema y el simulador esperado. */
export function parseExport(input: string | unknown, expectedSim?: string): ParseResult {
  let data: unknown = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, error: "El archivo no es JSON válido" };
    }
  }
  const r = RunExportSchema.safeParse(data);
  if (!r.success) return { ok: false, error: `Formato de corrida inválido: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}` };
  if (expectedSim && r.data.sim !== expectedSim) return { ok: false, error: `La corrida es de otro simulador (${r.data.sim})` };
  return { ok: true, value: r.data };
}

/** Tabla de KPIs por época de una exportación (filas listas para toCSV). */
export function kpiRows(exp: RunExport): Record<string, string | number>[] {
  return exp.kpis.map((k) => ({ epoch: k.epoch, label: k.label, ...k.values }));
}

/** CSV con separador coma, punto decimal y escape RFC 4180. */
export function toCSV(rows: readonly Record<string, string | number | boolean | null | undefined>[], columns?: readonly string[]): string {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(esc).join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
