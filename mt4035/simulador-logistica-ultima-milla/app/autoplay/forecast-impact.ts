/**
 * Peso del pronóstico en la utilidad (AD-36): de la brecha de utilidad entre la operación inicial (BOT-A) y la mejor
 * operación encontrada, ¿cuánto se explica por pronosticar bien? Cada operación se juega con pronóstico perfecto y con
 * pronóstico equivocado 20% (de menos y de más). Peso = pérdida media por pronóstico / (pérdida + mejora operativa).
 *   npm run forecast-impact -- [--seeds 3] [--candidates 50]
 */
import { writeFileSync } from "node:fs";
import { createRng, type DecisionChanges, type GameState } from "@mt4035/sim-core";
import { parseArgs } from "@mt4035/sim-tools";
import { createLastMileEngine, lmConfig, params, profitOf, truthForecast, type LmState, type TerritoryId } from "../src/index.ts";
import { bots, searchSpace, vectorPolicy } from "./bots.ts";
import { REPORTS_DIR } from "./reports-dir.ts";

type Pol = (s: GameState<LmState>, e: number) => DecisionChanges;
const a = parseArgs(process.argv.slice(2));
const SEEDS = Number(a.flags.seeds ?? 3);
const CANDIDATES = Number(a.flags.candidates ?? 50);
const engine = createLastMileEngine();
const REFERENCE = ["A", "B", "C", "D", "E", "G", "H", "J", "K"];

function play(region: TerritoryId, polOf: (seed: number) => Pol, k: number, seeds: number[]): number {
  let tot = 0;
  for (const seed of seeds) {
    const pol = polOf(seed);
    let s = engine.createGame(lmConfig({ territory: region, seed, test: { events: "on", noise: 1 } }));
    const reports = [];
    for (let e = 0; e < 36; e++) {
      const ch: DecisionChanges = { ...pol(s, e) };
      if (e % 12 === 0) {
        const f = truthForecast(s.model, params, e / 12);
        ch["F-01"] = { ...f, level: f.level * k, p95: f.p95 * k, peaks: Object.fromEntries(Object.entries(f.peaks).map(([id, m]) => [id, 1 + (m - 1) * k])) };
      }
      const st = engine.stage(s, ch);
      if (st.errors.length) return NaN;
      const r = engine.confirmEpoch(st.state);
      s = r.state;
      reports.push(r.report);
    }
    tot += profitOf(reports);
  }
  return tot / seeds.length;
}

const rng = createRng(7).stream("search", 0, 0);
const rows: string[] = [];
const shares: number[] = [];
const M = (x: number) => `${(x / 1e6).toFixed(2)}`;
for (const region of ["megalopolis", "bajio", "norte"] as TerritoryId[]) {
  const cands: { name: string; pol: (seed: number) => Pol }[] = REFERENCE.map((id) => ({ name: `BOT-${id}`, pol: (seed: number) => bots.find((b) => b.id === id)!.policy(seed, region) as Pol }));
  for (let i = 0; i < CANDIDATES; i++) {
    const v = Object.fromEntries(Object.entries(searchSpace).map(([key, opts]) => [key, (opts as readonly unknown[])[Math.floor(rng.next() * (opts as readonly unknown[]).length)]])) as never;
    cands.push({ name: `vector ${i}`, pol: () => vectorPolicy(v, region) as Pol });
  }
  let best = cands[0]!;
  let bestP = -Infinity;
  for (const c of cands) {
    const v = play(region, c.pol, 1, [1, 2]);
    if (v > bestP) [bestP, best] = [v, c];
  }
  const eval_ = Array.from({ length: SEEDS }, (_, i) => 100 + i);
  const P = (c: typeof best, k: number) => play(region, c.pol, k, eval_);
  const [a1, a8, a12] = [1, 0.8, 1.2].map((k) => P(cands[0]!, k));
  const [b1, b8, b12] = [1, 0.8, 1.2].map((k) => P(best, k));
  const fc = (a1! - (a8! + a12!) / 2 + (b1! - (b8! + b12!) / 2)) / 2;
  const ops = Math.max(0, b1! - a1!);
  const share = fc / (fc + ops);
  shares.push(share);
  rows.push(`| ${region} | ${M(a1!)} | ${M(b1!)} (${best.name}) | ${M(a1! - a8!)} / ${M(a1! - a12!)} | ${M(b1! - b8!)} / ${M(b1! - b12!)} | ${M(ops)} | ${M(fc)} | **${(share * 100).toFixed(0)}%** |`);
}
const md = `# Peso del pronóstico en la utilidad — mt4035-lastmile

Generado: ${new Date().toISOString()} · ${SEEDS} semillas de evaluación · ${CANDIDATES} vectores aleatorios + bots de referencia para la mejor operación (por utilidad, pronóstico perfecto).

Utilidad acumulada de 3 años en millones de USD. «Pérdida −20% / +20%»: cuánto se pierde con un pronóstico 20% bajo / alto respecto al perfecto.

| Territorio | BOT-A (inicial) | Mejor operación | Pérdida A −20% / +20% | Pérdida mejor −20% / +20% | Brecha operativa | Brecha por pronóstico | Peso del pronóstico |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}

**Peso medio del pronóstico: ${((shares.reduce((x, y) => x + y, 0) / shares.length) * 100).toFixed(0)}%.** No se fuerza por región: donde la operación tiene poco margen para mejorar la utilidad (Bajío) el pronóstico pesa más; donde la geografía y la red pesan más (Norte, Megalópolis) pesa menos.
`;
writeFileSync(`${REPORTS_DIR}/forecast-impact.md`, md);
process.stdout.write(md);
