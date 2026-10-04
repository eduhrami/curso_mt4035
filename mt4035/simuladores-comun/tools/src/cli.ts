/**
 * Comandos de línea (AD-13). Cada simulador tiene un punto de entrada que llama a estas funciones
 * con su adaptador o su motor:
 *
 *   autoplay  --seeds 200 --bots A,B,C --scenarios all --workers 8 --out reports/
 *   replay    corrida1.json corrida2.json …
 *   aggregate carpeta/  → CSV resumen del grupo
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { kpiRows, parseExport, replay, toCSV, type Engine } from "@mt4035/sim-core";
import { evaluate, toMarkdown } from "./report.ts";
import { makeTasks, WorkerPool } from "./runner.ts";
import { searchOptima } from "./search.ts";
import type { AutoplayAdapter } from "./types.ts";

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=", 2);
      if (v !== undefined) flags[k!] = v;
      else if (argv[i + 1] && !argv[i + 1]!.startsWith("--")) flags[k!] = argv[++i]!;
      else flags[k!] = "true";
    } else positional.push(a);
  }
  return { positional, flags };
}

/** "200" → 1…200 · "1001-1200" → 1001…1200 */
export function parseSeeds(spec: string): number[] {
  const m = /^(\d+)-(\d+)$/.exec(spec);
  if (m) return Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => Number(m[1]) + i);
  return Array.from({ length: Number(spec) }, (_, i) => i + 1);
}

const list = (v: string | undefined, all: string[]) => (!v || v === "all" ? all : v.split(",").map((x) => x.trim()));

export async function autoplayCli(adapterUrl: string, argv: readonly string[]): Promise<number> {
  const adapter = (await import(adapterUrl)).default as AutoplayAdapter;
  const { flags } = parseArgs(argv);
  // El bot buscador necesita un vector de parámetros: solo se usa vía --search.
  const bots = list(flags.bots, adapter.bots.map((b) => b.id).filter((id) => id !== adapter.search?.bot));
  const scenarios = list(flags.scenarios, adapter.scenarios);
  const seeds = parseSeeds(flags.seeds ?? "50");
  const workers = flags.workers !== undefined ? Number(flags.workers) : undefined;
  const out = resolve(flags.out ?? "autoplay-reports");
  const t0 = Date.now();
  let last = 0;
  const pool = await WorkerPool.open(adapterUrl, workers);
  let records;
  let search: Awaited<ReturnType<typeof searchOptima>> = [];
  try {
    records = await pool.run(makeTasks({ bots, scenarios, seeds }), (d, n) => {
      const pct = Math.floor((100 * d) / n);
      if (pct >= last + 10 || d === n) {
        last = pct;
        process.stderr.write(`  ${pct}% (${d}/${n})\n`);
      }
    });
    if (flags.search === "true") {
      search = await searchOptima(adapter, pool, {
        scenarios,
        seeds: parseSeeds(flags["search-seeds"] ?? "6"),
        random: Number(flags["search-random"] ?? 40),
        rounds: Number(flags["search-rounds"] ?? 2),
        onProgress: (m) => process.stderr.write(`  [buscador] ${m}\n`),
      });
    }
  } finally {
    await pool.close();
  }
  const generatedAt = new Date().toISOString();
  const rep = evaluate(adapter, records, generatedAt, search);
  mkdirSync(out, { recursive: true });
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const md = toMarkdown(rep, records.filter((r) => !r.ok));
  writeFileSync(join(out, `coherencia-${stamp}.md`), md);
  writeFileSync(join(out, `coherencia-${stamp}.json`), JSON.stringify(rep, null, 2));
  writeFileSync(join(out, "latest.md"), md);
  if (flags.records === "true") writeFileSync(join(out, `registros-${stamp}.json`), JSON.stringify(records));
  process.stdout.write(md + `\n\nTiempo total: ${((Date.now() - t0) / 1000).toFixed(1)} s · reporte en ${out}\n`);
  return rep.alarms.length ? 1 : 0;
}

export async function replayCli<S, P>(engine: Engine<S, P>, files: readonly string[], versions: { simVersion: string; paramsVersion: string }): Promise<number> {
  let failures = 0;
  for (const f of files) {
    const parsed = parseExport(readFileSync(f, "utf8"), engine.model.id);
    if (!parsed.ok) {
      failures++;
      process.stdout.write(`✗ ${f}: ${parsed.error}\n`);
      continue;
    }
    const r = await replay(engine, parsed.value, versions);
    if (!r.ok) failures++;
    const detail = r.ok ? "idéntica" : [...r.errors, ...(r.checksumOk ? [] : ["checksum no coincide"]), ...r.kpiDiffs.slice(0, 3).map((d) => `${d.kpi}@${d.epoch}: ${d.expected} ≠ ${d.actual}`), ...r.eventDiffs.slice(0, 2).map((d) => `eventos@${d.epoch}`)].join("; ");
    process.stdout.write(`${r.ok ? "✓" : "✗"} ${f}: ${detail}\n`);
  }
  return failures ? 1 : 0;
}

/** Junta las corridas exportadas de un grupo en un CSV: una fila por corrida con promedio de KPIs y puntaje. */
export function aggregateCli(dir: string, expectedSim: string, outFile?: string): number {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(dir, f))
    .filter((f) => statSync(f).isFile());
  const rows: Record<string, string | number>[] = [];
  for (const f of files) {
    const p = parseExport(readFileSync(f, "utf8"), expectedSim);
    if (!p.ok) {
      process.stderr.write(`omitido ${f}: ${p.error}\n`);
      continue;
    }
    const e = p.value;
    const kr = kpiRows(e);
    const keys = Object.keys(kr[0] ?? {}).filter((k) => k !== "epoch" && k !== "label");
    const avg = Object.fromEntries(keys.map((k) => [k, kr.reduce((a, r) => a + Number(r[k]), 0) / kr.length]));
    rows.push({ archivo: f, jugador: e.player?.name ?? "", equipo: e.player?.team ?? "", escenario: JSON.stringify(e.config.scenario), semilla: e.config.seed, epocas: e.epochsPlayed, puntaje: e.finalScore ?? "", ...avg });
  }
  const csv = toCSV(rows);
  if (outFile) writeFileSync(outFile, csv);
  else process.stdout.write(csv);
  return 0;
}
