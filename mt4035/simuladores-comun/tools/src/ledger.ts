/**
 * Registro acumulado de corridas de simulación (corridas.jsonl en la carpeta de reportes). Cada herramienta de
 * auto-juego agrega una línea al terminar, para documentar cuánto se ha simulado al calibrar (reporte técnico).
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { simulationCount } from "./runner.ts";

export interface LedgerEntry {
  date: string;
  tool: string;
  sim: string;
  simVersion?: string;
  paramsVersion?: string;
  /** Registros de auto-juego (bot × escenario × semilla). */
  tasks: number;
  /** Partidas completas simuladas (12 trimestres cada una). */
  games: number;
  seconds: number;
}

const t0 = Date.now();

/** Agrega al registro lo simulado por este proceso desde que arrancó. */
export function appendRunLedger(dir: string, e: { tool: string; sim: string; simVersion?: string; paramsVersion?: string; tasks?: number; games?: number }): LedgerEntry {
  // Las herramientas que no usan WorkerPool (p. ej. forecast-impact) pasan sus propios conteos.
  const entry: LedgerEntry = { date: new Date().toISOString(), ...simulationCount(), ...e, seconds: Math.round((Date.now() - t0) / 1000) };
  appendFileSync(join(dir, "corridas.jsonl"), JSON.stringify(entry) + "\n");
  return entry;
}

/** Totales del registro. */
export function readRunLedger(dir: string): LedgerEntry[] {
  const f = join(dir, "corridas.jsonl");
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as LedgerEntry) : [];
}
