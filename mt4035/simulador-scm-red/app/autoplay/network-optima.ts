/**
 * Red óptima por región × propuesta de valor (y por escenario de mercado predefinido), por utilidad acumulada.
 * Parte de los óptimos del buscador (último reporte de `npm run autoplay -- --search`) y:
 *   1. en cada escenario predefinido (EM-01…EM-04, con su semilla) repite el ascenso por coordenadas;
 *   2. refina la ubicación de los CD: mueve un CD a la vez por las 36 zonas, prueba quitar y agregar uno;
 *   3. evalúa contra la operación inicial (BOT-A) y la política adaptada (BOT-C).
 *   npm run network-optima -- [--seeds 8] [--eval-seeds 20] [--regions kaigan,valle] [--no-presets] [--out <archivo.md>]
 * El reporte contiene las respuestas de referencia: se escribe en el repositorio privado (reports-dir.ts).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendRunLedger, parseArgs, WorkerPool, type Task } from "@mt4035/sim-tools";
import { createScmEngine, params, PRESETS, scmConfig, type DcSpec, type RegionId, type Strategy } from "../src/index.ts";
import { regionOf, type NetworkArgs, type Vec } from "./adapter-network.ts";
import { searchSpace, vectorPolicy } from "./bots.ts";
import { REPORTS_DIR } from "./reports-dir.ts";
import { writeTargets } from "./targets.ts";

const here = dirname(fileURLToPath(import.meta.url));
const a = parseArgs(process.argv.slice(2));
const SEEDS = Array.from({ length: Number(a.flags.seeds ?? 8) }, (_, i) => 501 + i);
const EVAL = Array.from({ length: Number(a.flags["eval-seeds"] ?? 20) }, (_, i) => 1001 + i);
const OUT = resolve(a.flags.out ?? resolve(REPORTS_DIR, "red-optima.md"));
const REGIONS = (a.flags.regions ?? "kaigan,redriver,valle").split(",") as RegionId[];
const KS = [0.9, 1.1];
const STRATEGIES: Strategy[] = ["freshness", "lowcost", "convenience"];
const engine = createScmEngine();
const pool = await WorkerPool.open(new URL("./adapter-network.ts", import.meta.url).href);

const dir = REPORTS_DIR;
// El reporte de coherencia más reciente que trae óptimos del buscador (una corrida sin --search no los trae).
const rep = readdirSync(dir)
  .filter((f) => /^coherencia-.*\.json$/.test(f))
  .sort()
  .reverse()
  .map((f) => JSON.parse(readFileSync(resolve(dir, f), "utf8")))
  .find((r) => r.search?.length);
const searched = (region: string, strategy: string) => rep.search.find((s: { scenario: string; strategy: string }) => s.scenario === region && s.strategy === strategy).best as Vec;

/** Utilidad media (M USD) de cada candidato para la estrategia dada. */
const cache = new Map<string, number>();
const keyOf = (scenario: string, strategy: string, seeds: number[], c: NetworkArgs) => JSON.stringify([scenario, strategy, seeds, c.v, c.dcs ?? null]);
async function evaluate(scenario: string, strategy: Strategy, seeds: number[], cands: NetworkArgs[]): Promise<number[]> {
  const todo = [...new Map(cands.filter((c) => !cache.has(keyOf(scenario, strategy, seeds, c))).map((c) => [JSON.stringify(c), c])).values()];
  if (todo.length) {
    // Cada semilla se juega con pronóstico 10% bajo y 10% alto (error de un equipo típico, AD-40).
    const tasks: Task[] = todo.flatMap((args) => seeds.flatMap((seed) => KS.map((k) => ({ bot: "N", scenario, seed, args: { ...args, k } }))));
    const recs = await pool.run(tasks);
    for (const c of todo) {
      const rs = recs.filter((r) => JSON.stringify({ ...(r.args as NetworkArgs), k: undefined }) === JSON.stringify({ ...c, k: undefined }));
      // Las tres estrategias salen de la misma corrida: se guardan todas.
      for (const st of STRATEGIES) cache.set(keyOf(scenario, st, seeds, c), rs.every((r) => r.ok) ? rs.reduce((x, r) => x + r.scores[st]!, 0) / rs.length : -Infinity);
    }
  }
  return cands.map((c) => cache.get(keyOf(scenario, strategy, seeds, c))!);
}
async function bot(id: string, scenario: string, strategy: Strategy, seeds: number[]): Promise<number> {
  const recs = await pool.run(seeds.flatMap((seed) => KS.map((k) => ({ bot: id, scenario, seed, args: { k } }))));
  return recs.reduce((x, r) => x + r.scores[strategy]!, 0) / recs.length;
}

/** CD que resultan del vector (la red actual si dcCount = −1). */
const dcsOf = (scenario: string, v: Vec): DcSpec[] => {
  const s = engine.createGame(scmConfig({ region: regionOf(scenario) }));
  return vectorPolicy(v)(s, 0)["D-01"] as DcSpec[];
};
const TYPES = ["stocking", "crossdock", "combined"] as const;
/** Con un CEDIS combinado en la red, la consolidación combinada se prueba junto con él. */
const withCons = (v: Vec, type: string): Vec => (type === "combined" && v.consolidation !== "combined" ? { ...v, consolidation: "combined" } : v);
const initialDcs = (scenario: string) => engine.createGame(scmConfig({ region: regionOf(scenario) })).model.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size }));

async function best(scenario: string, strategy: Strategy, seeds: number[], cands: NetworkArgs[], cur: NetworkArgs, curP: number): Promise<[NetworkArgs, number, boolean]> {
  const ps = await evaluate(scenario, strategy, seeds, cands);
  let i = -1;
  ps.forEach((p, j) => {
    if (p > (i < 0 ? curP : ps[i]!) + 1e-6) i = j;
  });
  return i < 0 ? [cur, curP, false] : [cands[i]!, ps[i]!, true];
}

/** Ascenso por coordenadas sobre el vector (la red se regenera si cambia el número o el tipo de CD). */
async function ascend(scenario: string, strategy: Strategy, seeds: number[], start: NetworkArgs): Promise<[NetworkArgs, number]> {
  let cur = start;
  let curP = (await evaluate(scenario, strategy, seeds, [cur]))[0]!;
  for (let round = 0; round < 3; round++) {
    let improved = false;
    for (const [k, vals] of Object.entries(searchSpace)) {
      // Cambiar número, tipo o tamaño de CD regenera la red; lo demás conserva la ubicación ya refinada.
      const regen = ["dcCount", "dcType", "dcSize"].includes(k);
      const cands = (vals as readonly unknown[]).map((x) => ({ v: { ...cur.v, [k]: x } as Vec, ...(!regen && cur.dcs ? { dcs: cur.dcs } : {}) }));
      let ok: boolean;
      [cur, curP, ok] = await best(scenario, strategy, seeds, cands, cur, curP);
      improved ||= ok;
    }
    if (!improved) break;
  }
  return [cur, curP];
}

/** Refina la red: mover un CEDIS nuevo a otra zona, quitar uno, convertir el tipo de uno o agregar uno de cualquier tipo. */
async function refine(scenario: string, strategy: Strategy, seeds: number[], start: NetworkArgs): Promise<[NetworkArgs, number]> {
  const existing = new Set(initialDcs(scenario).map((d) => d.id));
  let cur: NetworkArgs = { v: start.v, dcs: start.dcs ?? dcsOf(scenario, start.v) };
  let curP = (await evaluate(scenario, strategy, seeds, [cur]))[0]!;
  for (let pass = 0; pass < 4; pass++) {
    const dcs = cur.dcs!;
    const used = new Set(dcs.map((d) => d.zone));
    const free = Array.from({ length: 36 }, (_, z) => z).filter((z) => !used.has(z));
    // Un CEDIS agregado copia el tamaño de los nuevos o, si no hay, de la red existente; el tipo se prueba completo.
    const proto = dcs.find((d) => !existing.has(d.id)) ?? dcs[0] ?? { type: cur.v.dcType, size: cur.v.dcSize };
    const cands: NetworkArgs[] = [
      // Mover: solo los CD nuevos (uno existente no se puede mover de zona).
      ...dcs.flatMap((d, i) => (existing.has(d.id) ? [] : free.map((zone) => ({ v: cur.v, dcs: dcs.map((x, j) => (j === i ? { ...x, zone } : x)) })))),
      ...dcs.map((_, i) => ({ v: cur.v, dcs: dcs.filter((_, j) => j !== i) })),
      // Convertir el tipo de uno o de todos (p. ej. con inventario → combinado para los frescos). Convertir a combinado se
      // prueba también con la consolidación combinada: por separado, ninguno de los dos pasos mejora y el ascenso no los junta.
      ...TYPES.flatMap((type) => {
        const v = withCons(cur.v, type);
        const one = dcs.flatMap((d, i) => (d.type === type ? [] : [{ v, dcs: dcs.map((x, j) => (j === i ? { ...x, type } : x)) }]));
        const all = dcs.some((d) => d.type !== type) ? [{ v, dcs: dcs.map((x) => ({ ...x, type })) }] : [];
        return [...one, ...all, ...(v !== cur.v ? one.map((c) => ({ ...c, v: cur.v })) : [])];
      }),
      ...free.flatMap((zone) => TYPES.map((type) => ({ v: withCons(cur.v, type), dcs: [...dcs, { id: `R-${dcs.length + 1}-${zone}`, zone, type, size: proto.size } as DcSpec] }))),
    ];
    let ok: boolean;
    [cur, curP, ok] = await best(scenario, strategy, seeds, cands, cur, curP);
    if (!ok) break;
  }
  return [cur, curP];
}

interface Row { scenario: string; strategy: Strategy; args: NetworkArgs; profit: number; asIs: number; adapted: number }
const rows: Row[] = [];
async function solve(scenario: string, strategy: Strategy, seeds: number[], evalSeeds: number[], start: NetworkArgs, climb: boolean) {
  let cur = start;
  if (climb) [cur] = await ascend(scenario, strategy, seeds, cur);
  let curP: number;
  [cur, curP] = await refine(scenario, strategy, seeds, cur);
  // Segundo arranque: conservar la red actual y refinarla (quitar, mover o agregar CD uno a uno). El vector del
  // buscador reemplaza toda la red, así que sin esto nunca se prueba «cerrar algunos y quedarse con otros».
  if (cur.v.dcCount !== -1 || cur.dcs?.some((d) => !initialDcs(scenario).some((x) => x.id === d.id))) {
    const [alt, altP] = await refine(scenario, strategy, seeds, { v: { ...cur.v, dcCount: -1 } as Vec });
    if (altP > curP) cur = alt;
  }
  if (climb) {
    [cur] = await ascend(scenario, strategy, seeds, cur);
    if (!cur.dcs) [cur] = await refine(scenario, strategy, seeds, cur);
  }
  const [profit] = await evaluate(scenario, strategy, evalSeeds, [cur]);
  const row = { scenario, strategy, args: cur, profit: profit!, asIs: await bot("A", scenario, strategy, evalSeeds), adapted: await bot("C", scenario, strategy, evalSeeds) };
  rows.push(row);
  process.stderr.write(`  ${scenario}/${strategy}: ${row.profit.toFixed(0)} M USD (inicial ${row.asIs.toFixed(0)}, adaptado ${row.adapted.toFixed(0)})\n`);
  return row;
}

/**
 * Verificación cruzada: cada propuesta evalúa también las soluciones de las otras propuestas del mismo escenario y se
 * queda con la mejor. El refinamiento de un CD a la vez no sale de «todo DSD» si los flujos no pasan por un CD nuevo.
 */
async function crossCheck(scenario: string, evalSeeds: number[]) {
  const mine = rows.filter((r) => r.scenario === scenario);
  const sols = mine.map((r) => r.args);
  for (const r of mine) {
    const ps = await evaluate(scenario, r.strategy, evalSeeds, sols);
    const i = ps.reduce((bi, p, j) => (p > ps[bi]! ? j : bi), 0);
    if (ps[i]! > r.profit + 1e-6) {
      process.stderr.write(`  ${scenario}/${r.strategy}: la solución de ${mine[i]!.strategy} es mejor (${ps[i]!.toFixed(0)} > ${r.profit.toFixed(0)})\n`);
      r.args = sols[i]!;
      r.profit = ps[i]!;
    }
  }
}

try {
  // 1. Mercado base: parte del óptimo del buscador y refina la ubicación (evaluación en semillas nuevas).
  const baseRows = new Map<string, Row>();
  for (const region of REGIONS) {
    for (const st of STRATEGIES) baseRows.set(`${region}/${st}`, await solve(region, st, SEEDS, EVAL, { v: searched(region, st) }, false));
    await crossCheck(region, EVAL);
  }
  // 2. Escenarios predefinidos con su semilla (lo que juegan los equipos): ascenso + refinamiento con esa semilla.
  for (const p of a.flags["no-presets"] === "true" ? [] : PRESETS)
    for (const region of REGIONS) {
      for (const st of STRATEGIES) await solve(`${region}@${p.id}`, st, [p.seed], [p.seed], baseRows.get(`${region}/${st}`)!.args, true);
      await crossCheck(`${region}@${p.id}`, [p.seed]);
    }
} finally {
  await pool.close();
}

// ---------- Reporte ----------
const NAMES: Record<string, string> = { freshness: "Frescura", lowcost: "Bajo costo", convenience: "Conveniencia", kaigan: "Kaigan", redriver: "Red River", valle: "Valle Metropolitano", stocking: "inventario", crossdock: "cross-dock", combined: "combinado", small: "chico", medium: "mediano", large: "grande", dc: "CD", dsd: "DSD" };
const n = (x: unknown) => NAMES[String(x)] ?? String(x);
function network(scenario: string, args: NetworkArgs): string {
  const existing = new Map(initialDcs(scenario).map((d) => [d.id, d]));
  const dcs = args.dcs ?? dcsOf(scenario, args.v);
  if (!dcs.length) return existing.size ? `**0 CD** (cerrar los ${existing.size} actuales)` : "**0 CD**";
  const kept = dcs.filter((d) => existing.has(d.id));
  const added = dcs.filter((d) => !existing.has(d.id));
  const closed = [...existing.values()].filter((d) => !dcs.some((x) => x.id === d.id));
  const group = (xs: DcSpec[]) => Object.entries(xs.reduce<Record<string, number[]>>((acc, d) => ({ ...acc, [`${n(d.type)} ${n(d.size)}`]: [...(acc[`${n(d.type)} ${n(d.size)}`] ?? []), d.zone] }), {})).map(([k, zs]) => `${zs.length} ${k} (zonas ${zs.sort((x, y) => x - y).join(", ")})`).join("; ");
  const same = kept.filter((d) => existing.get(d.id)!.type === d.type && existing.get(d.id)!.size === d.size);
  const changed = kept.filter((d) => !same.includes(d));
  return [same.length ? `conservar ${same.length} actuales` : "", changed.length ? `convertir ${group(changed)}` : "", added.length ? `construir ${group(added)}` : "", closed.length ? `cerrar zonas ${closed.map((d) => d.zone).join(", ")}` : ""].filter(Boolean).join(" · ");
}
const ops = (v: Vec) => `${v.freshFreq} / ${v.chilledFreq} / ${v.ambientFreq} / ${v.frozenFreq} por semana`;
const extra = (v: Vec, hasDc: boolean) =>
  [hasDc && v.dcSafetyDays ? `${v.dcSafetyDays} d de SS en CD` : "", v.consolidation === "combined" && hasDc ? "consolidación combinada" : ""].filter(Boolean).join(", ") || "—";
const info = (v: Vec) => `POS ${v.info} · POS compartido ${v.sharing} · pronóstico ${v.forecast} · CPFR ${v.cpfrAt} · recepción ${v.receiving} · ${v.policy}`;
const M = (x: number) => x.toFixed(0);
const pct = (x: number, b: number) => `${x >= b ? "+" : ""}${(((x - b) / Math.abs(b)) * 100).toFixed(0)}%`;
const table = (rs: Row[]) => [
  "| Escenario | Propuesta | Red de CD | Flujo y frecuencia (frescos / refrigerado / ambiente / congelado) | Otros | Utilidad (M USD) | vs. inicial | vs. adaptado (BOT-C) |",
  "|---|---|---|---|---|---|---|---|",
  ...rs.map((r) => {
    const hasDc = (r.args.dcs ?? dcsOf(r.scenario, r.args.v)).length > 0;
    return `| ${r.scenario.split("@").map(n).join(" · ")} | ${n(r.strategy)} | ${network(r.scenario, r.args)} | ${ops(r.args.v)} | ${extra(r.args.v, hasDc)} | ${M(r.profit)} | ${M(r.asIs)} (${pct(r.profit, r.asIs)}) | ${M(r.adapted)} (${pct(r.profit, r.adapted)}) |`;
  }),
];
const infoRows = rows.map((r) => info(r.args.v));
const commonInfo = infoRows.every((x) => x === infoRows[0]) ? infoRows[0] : undefined;
const md = [
  "# Red óptima por región — Hoshi Mart (SCM)",
  "",
  `Generado: ${new Date().toISOString()} con \`npm run network-optima\` (parámetros ${JSON.parse(readFileSync(resolve(here, "../params/params.v1.json"), "utf8")).version}). Utilidad acumulada de 12 trimestres con un error de pronóstico de ±10% (cada semilla se juega 10% bajo y 10% alto); todas las decisiones en A1-T1.`,
  "",
  `Mercado base: óptimo del buscador por utilidad (${rep.generatedAt}) + refinamiento de ubicación con ${SEEDS.length} semillas; evaluado en ${EVAL.length} semillas nuevas. Escenarios predefinidos: ascenso por coordenadas + refinamiento con la semilla del escenario (la que juegan los equipos).`,
  "",
  "## Mercado base",
  "",
  ...table(rows.filter((r) => !r.scenario.includes("@"))),
  "",
  "## Escenarios predefinidos (con su semilla)",
  "",
  ...table(rows.filter((r) => r.scenario.includes("@"))),
  "",
  "## Información y operación",
  "",
  commonInfo ? `Todas las soluciones usan: ${commonInfo}.` : rows.map((r, i) => `- ${r.scenario} / ${n(r.strategy)}: ${infoRows[i]}`).join("\n"),
  "",
].join("\n");
writeFileSync(OUT, md);
writeFileSync(OUT.replace(/\.md$/, ".json"), JSON.stringify(rows, null, 2));
writeTargets(rows);
appendRunLedger(REPORTS_DIR, { tool: "network-optima", sim: engine.model.id, simVersion: engine.model.version, paramsVersion: params.version });
console.log(`Reporte en ${OUT}`);
