/**
 * Bot buscador (BOT-H): búsqueda aleatoria + ascenso por coordenadas sobre un espacio discreto de
 * decisiones, por escenario y estrategia. Cada candidato se evalúa con el promedio de puntaje en un
 * conjunto fijo de semillas (números aleatorios comunes ⇒ comparación justa entre candidatos).
 * El objetivo es `adapter.searchScore` si existe (p. ej. la utilidad) y, si no, `adapter.score`.
 */
import { createRng } from "@mt4035/sim-core";
import type { WorkerPool } from "./runner.ts";
import type { AutoplayAdapter, ParamVector, RunRecord, SearchOutcome, Task } from "./types.ts";

export interface SearchOptions {
  scenarios: string[];
  seeds: number[];
  /** Candidatos aleatorios iniciales por escenario. */
  random: number;
  /** Rondas de ascenso por coordenadas. */
  rounds: number;
  rngSeed?: number;
  onProgress?: (msg: string) => void;
}

const key = (v: ParamVector) => JSON.stringify(Object.keys(v).sort().map((k) => [k, v[k]]));

export async function searchOptima(adapter: AutoplayAdapter, pool: WorkerPool, o: SearchOptions): Promise<SearchOutcome[]> {
  const spec = adapter.search;
  if (!spec) throw new Error(`${adapter.sim} no define espacio de búsqueda`);
  const params = Object.keys(spec.space);
  const out: SearchOutcome[] = [];

  for (const scenario of o.scenarios) {
    const cache = new Map<string, Record<string, number>>();
    const vectors = new Map<string, ParamVector>();
    const canon = (v: ParamVector) => (spec.canonicalize ? spec.canonicalize(v, scenario) : v);
    const evaluate = async (raw: ParamVector[]) => {
      const cands = raw.map(canon);
      const fresh = [...new Map(cands.filter((c) => !cache.has(key(c))).map((c) => [key(c), c])).values()];
      for (const c of fresh) vectors.set(key(c), c);
      if (!fresh.length) return;
      const tasks: Task[] = fresh.flatMap((args) => o.seeds.map((seed) => ({ bot: spec.bot, scenario, seed, args })));
      const recs = await pool.run(tasks);
      const byCand = new Map<string, RunRecord[]>();
      for (const r of recs) {
        const k = key(r.args as ParamVector);
        byCand.set(k, [...(byCand.get(k) ?? []), r]);
      }
      for (const [k, rs] of byCand) {
        const ok = rs.filter((r) => r.ok);
        cache.set(k, Object.fromEntries(adapter.strategies.map((st) => [st, ok.length === rs.length ? ok.reduce((a, r) => a + (r.searchScores ?? r.scores)[st]!, 0) / ok.length : -Infinity])));
      }
    };

    // 1. Búsqueda aleatoria (compartida por las estrategias: una corrida puntúa todas).
    const rng = createRng(o.rngSeed ?? 7).stream("search", 0, 0, scenario);
    const randomCands = Array.from({ length: o.random }, () => canon(Object.fromEntries(params.map((p) => [p, spec.space[p]![rng.int(0, spec.space[p]!.length - 1)]!])) as ParamVector));
    const seeded = [...(spec.baseline ? [spec.baseline(scenario)] : []), ...(spec.starts?.(scenario) ?? [])].map(canon);
    const starts = [...seeded, ...randomCands];
    await evaluate(starts);
    o.onProgress?.(`${scenario}: ${cache.size} candidatos aleatorios evaluados`);

    // 2. Ascenso por coordenadas por estrategia desde varios arranques: los mejores candidatos y los puntos de
    //    partida dados. Evita quedarse en un óptimo local cuando mejorar exige mover varias decisiones juntas.
    const bests = new Map<string, ParamVector>();
    for (const strategy of adapter.strategies) {
      const scoreOf = (v: ParamVector) => cache.get(key(canon(v)))?.[strategy] ?? -Infinity;
      const ranked = [...starts].sort((a, b) => scoreOf(b) - scoreOf(a));
      const origins = [...new Map([...ranked.slice(0, spec.multiStart ?? 1), ...seeded].map((v) => [key(v), v])).values()];
      const ascend = async (origin: ParamVector) => {
        let best = origin;
        const tryVariants = async (variants: ParamVector[]) => {
          await evaluate(variants);
          const top = variants.reduce((a, b) => (scoreOf(b) > scoreOf(a) + 1e-9 ? b : a));
          if (scoreOf(top) > scoreOf(best) + 1e-9) {
            best = canon(top);
            return true;
          }
          return false;
        };
        for (let round = 0; round < o.rounds; round++) {
          let improved = false;
          for (const p of params) improved = (await tryVariants(spec.space[p]!.map((v) => ({ ...best, [p]: v })))) || improved;
          for (const g of spec.groups ?? []) {
            const combos = g.reduce<ParamVector[]>((acc, p) => acc.flatMap((c) => spec.space[p]!.map((v) => ({ ...c, [p]: v }))), [{ ...best }]);
            improved = (await tryVariants(combos)) || improved;
          }
          if (!improved) break;
        }
        return best;
      };
      let best = await ascend(origins[0]!);
      for (const origin of origins.slice(1)) {
        const b = await ascend(origin);
        if (scoreOf(b) > scoreOf(best) + 1e-9) best = b;
      }
      bests.set(strategy, best);
    }

    // El mejor de todo lo evaluado en el escenario, incluidos los ascensos de las otras estrategias: una corrida
    // puntúa todas las estrategias, así que un óptimo hallado desde otra estrategia no se pierde.
    for (const strategy of adapter.strategies) {
      const scoreOf = (v: ParamVector) => cache.get(key(canon(v)))?.[strategy] ?? -Infinity;
      let best = bests.get(strategy)!;
      for (const v of vectors.values()) if (scoreOf(v) > scoreOf(best) + 1e-9) best = v;
      const atBounds = spec.ordinal.filter((p) => {
        if (spec.bounds?.[p]) return spec.bounds[p]!.includes(best[p]!);
        const vals = spec.space[p]!.filter((v) => !(spec.notBound?.[p] ?? []).includes(v));
        return !(spec.notBound?.[p] ?? []).includes(best[p]!) && (best[p] === vals[0] || best[p] === vals[vals.length - 1]);
      });
      out.push({ scenario, strategy, best, score: scoreOf(best), evaluations: cache.size, atBounds });
      o.onProgress?.(`${scenario}/${strategy}: óptimo ${scoreOf(best).toFixed(1)} (${cache.size} evaluaciones)`);
    }
  }
  return out;
}
