/**
 * Peso del pronóstico en la utilidad (AD-36): de la brecha de utilidad entre la operación inicial (BOT-A) y la mejor
 * operación encontrada, ¿cuánto se explica por pronosticar bien? Cada operación se juega con pronóstico perfecto y con
 * pronóstico equivocado 20% (de menos y de más). Peso = pérdida media por pronóstico / (pérdida + mejora operativa).
 *   npm run forecast-impact -- [--seeds 3] [--candidates 50]
 */
import { writeFileSync } from "node:fs";
import { createRng, type DecisionChanges, type GameState } from "@mt4035/sim-core";
import { parseArgs } from "@mt4035/sim-tools";
import { createScmEngine, EPOCHS, params, profitOf, scmConfig, truthForecast, type RegionId, type ScmState } from "../src/index.ts";
import { bots, canonicalVector, searchSpace, vectorPolicy } from "./bots.ts";

type Pol = (s: GameState<ScmState>, e: number) => DecisionChanges;
const a = parseArgs(process.argv.slice(2));
const SEEDS = Number(a.flags.seeds ?? 3);
const CANDIDATES = Number(a.flags.candidates ?? 50);
const engine = createScmEngine();
const REFERENCE = ["A", "B", "C", "D", "E", "G", "I"];

function play(region: RegionId, polOf: (seed: number) => Pol, k: number, seeds: number[]): number {
  let tot = 0;
  for (const seed of seeds) {
    const pol = polOf(seed);
    let s = engine.createGame(scmConfig({ region, seed, test: { events: "on", noise: 1 } }));
    const reports = [];
    for (let e = 0; e < EPOCHS; e++) {
      const ch: DecisionChanges = { ...pol(s, e) };
      if (e % 4 === 0) {
        const f = truthForecast(s.model, params, e / 4);
        ch["F-01"] = { ...f, level: f.level * k, p95: f.p95 * k };
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
const M = (x: number) => `${(x / 1e6).toFixed(0)}`;
for (const region of ["kaigan", "redriver", "valle"] as RegionId[]) {
  const cands: { name: string; pol: (seed: number) => Pol }[] = REFERENCE.map((id) => ({ name: `BOT-${id}`, pol: (seed: number) => bots.find((b) => b.id === id)!.policy(seed, region) as Pol }));
  for (let i = 0; i < CANDIDATES; i++) {
    const v = canonicalVector(Object.fromEntries(Object.entries(searchSpace).map(([key, opts]) => [key, (opts as readonly unknown[])[Math.floor(rng.next() * (opts as readonly unknown[]).length)]])) as never, region);
    cands.push({ name: `vector ${i}`, pol: () => vectorPolicy(v) as Pol });
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
const md = `# Peso del pronóstico en la utilidad — mt4035-scm

Generado: ${new Date().toISOString()} · ${SEEDS} semillas de evaluación · ${CANDIDATES} vectores aleatorios + bots de referencia para la mejor operación (por utilidad, pronóstico perfecto).

Utilidad acumulada de 3 años en millones de USD. «Pérdida −20% / +20%»: cuánto se pierde con un pronóstico 20% bajo / alto respecto al perfecto.

| Región | BOT-A (inicial) | Mejor operación | Pérdida A −20% / +20% | Pérdida mejor −20% / +20% | Brecha operativa | Brecha por pronóstico | Peso del pronóstico |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}

**Peso medio del pronóstico: ${((shares.reduce((x, y) => x + y, 0) / shares.length) * 100).toFixed(0)}%.** No se fuerza por región: donde la operación ya es buena (Kaigan) el pronóstico es la palanca que queda; donde la operación tiene mucho por mejorar (Red River) pesa menos.
`;
writeFileSync(new URL("./reports/forecast-impact.md", import.meta.url), md);
process.stdout.write(md);
