/**
 * LOG-EVT-01 (P1, Monte Carlo): frecuencia observada de cada evento vs. p_base × modificadores.
 * Semillas fijas 1…N: resultado determinista (AD-15). Se corre con `npm run test:mc`.
 */
import { describe, expect, it } from "vitest";
import { perTickProbability } from "@mt4035/sim-core";
import { events } from "../src/events.ts";
import { createLastMileEngine, params } from "../src/model.ts";
import type { LmState, TerritoryId } from "../src/types.ts";
import { det, fakeCtx, start, sto } from "./helpers/run.ts";

const N = 1000;
const Z = 2.576; // IC 99%: 45 comparaciones simultáneas
const TICKS = params.daysPerMonth[0]!; // A1-M01 (enero)

const epochP = (state: LmState, id: string, active: string[] = []): number => {
  const def = events.find((e) => e.id === id)!;
  const ctx = { ...fakeCtx(state), ticks: TICKS, isActive: (x: string) => (active.includes(x) ? {} : undefined) } as never;
  let p = def.pBase(ctx);
  for (const m of def.modifiers ?? []) if (m.when(ctx)) p *= typeof m.factor === "function" ? m.factor(ctx) : m.factor;
  return Math.min(1, p);
};

/**
 * P(≥ 1 ocurrencia en el mes). La bandera R-01 se fija al cerrar el día 0 si las rutas con frescos
 * pasan de 3 h, así que el día 0 usa p sin ese factor y los días 1…30 con él.
 */
function expectedP(state: LmState, id: string, r01FromDay1: boolean, active: string[] = []): number {
  const without = perTickProbability(epochP({ ...state, flags: { ...state.flags, r01: false } }, id, active), TICKS);
  const withFlag = perTickProbability(epochP({ ...state, flags: { ...state.flags, r01: r01FromDay1 } }, id, active), TICKS);
  return 1 - (1 - without) * (1 - withFlag) ** (TICKS - 1);
}

function observed(territory: TerritoryId): Map<string, number> {
  const eng = createLastMileEngine();
  const hits = new Map<string, number>();
  for (let seed = 1; seed <= N; seed++) {
    const rep = eng.confirmEpoch(eng.createGame(sto(territory, seed))).report;
    for (const id of new Set(rep.events.map((e) => e.id))) hits.set(id, (hits.get(id) ?? 0) + 1);
  }
  return hits;
}

describe("LOG-EVT Monte Carlo (P1)", () => {
  for (const territory of ["megalopolis", "bajio", "norte"] as const) {
    it(`EVT-01 ${territory}: P(≥ 1 ocurrencia en A1-M01) de cada evento cae en el IC 99% esperado`, () => {
      const s0 = start(sto(territory, 1)).model;
      const r01 = createLastMileEngine().confirmEpoch(start(det(territory))).report.rulesFired.some((f) => f.id === "R-01" && f.tick === 0);
      const hits = observed(territory);
      for (const def of events) {
        const obs = (hits.get(def.id) ?? 0) / N;
        // X-09 sube mientras dura un ausentismo (X-06): el valor esperado queda entre ambos extremos.
        const lo = expectedP(s0, def.id, r01);
        const hi = def.id === "X-09" ? expectedP(s0, def.id, r01, ["X-06"]) : lo;
        const half = (p: number) => Z * Math.sqrt((p * (1 - p)) / N) + 1e-9;
        expect(obs, `${territory} ${def.id}: observado ${obs}, esperado ${lo.toFixed(4)}–${hi.toFixed(4)}`).toBeGreaterThanOrEqual(lo - half(lo));
        expect(obs, `${territory} ${def.id}: observado ${obs}, esperado ${lo.toFixed(4)}–${hi.toFixed(4)}`).toBeLessThanOrEqual(hi + half(hi));
      }
    });
  }
});
