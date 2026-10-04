/**
 * SCM-EVT-01/02 (P1, Monte Carlo): frecuencias observadas vs. p_base × modificadores.
 * Semillas fijas 1…N: resultado determinista (AD-15). Se corre con `npm run test:mc`.
 */
import { describe, expect, it } from "vitest";
import { perTickProbability } from "@mt4035/sim-core";
import { events } from "../src/events.ts";
import { createScmEngine, params } from "../src/model.ts";
import type { RegionId, ScmState } from "../src/types.ts";
import { det, fakeCtx, paramsWith, start, sto } from "./helpers/run.ts";

const N = 1000;
const Z = 2.576; // IC 99%: 36 comparaciones simultáneas

const epochP = (state: ScmState, id: string): number => {
  const def = events.find((e) => e.id === id)!;
  const ctx = fakeCtx(state);
  let p = def.pBase(ctx);
  for (const m of def.modifiers ?? []) if (m.when(ctx)) p *= typeof m.factor === "function" ? m.factor(ctx) : m.factor;
  return Math.min(1, p);
};

/**
 * P(≥1 ocurrencia en la época) esperada. La bandera R-01 (rutas largas) se activa al cerrar la
 * semana 0 si la ruta de frescos supera 4 h, así que la semana 0 usa p sin el factor y las
 * semanas 1–12 con él: P = 1 − (1 − p_t(sin)) · (1 − p_t(con))^12.
 */
function expectedP(state: ScmState, id: string, r01FromWeek1: boolean): number {
  const ticks = params.weeksPerEpoch;
  const without = perTickProbability(epochP({ ...state, flags: { ...state.flags, r01: false } }, id), ticks);
  const withFlag = perTickProbability(epochP({ ...state, flags: { ...state.flags, r01: r01FromWeek1 } }, id), ticks);
  return 1 - (1 - without) * (1 - withFlag) ** (ticks - 1);
}

function observed(region: RegionId, eng = createScmEngine()): Map<string, number> {
  const hits = new Map<string, number>();
  for (let seed = 1; seed <= N; seed++) {
    const rep = eng.confirmEpoch(eng.createGame(sto(region, seed))).report;
    for (const id of new Set(rep.events.map((e) => e.id))) hits.set(id, (hits.get(id) ?? 0) + 1);
  }
  return hits;
}

describe("SCM-EVT Monte Carlo (P1)", () => {
  for (const region of ["kaigan", "redriver", "valle"] as const) {
    it(`EVT-01 ${region}: P(≥1 ocurrencia en A1-T1) de cada evento cae en el IC 99% esperado`, () => {
      const s0 = start(sto(region, 1)).model;
      const r01 = createScmEngine().confirmEpoch(start(det(region))).report.rulesFired.some((f) => f.id === "R-01" && f.tick === 0);
      const hits = observed(region);
      for (const def of events) {
        const p = expectedP(s0, def.id, r01);
        const obs = (hits.get(def.id) ?? 0) / N;
        const half = Z * Math.sqrt((p * (1 - p)) / N) + 1e-9;
        expect(Math.abs(obs - p), `${region} ${def.id}: observado ${obs}, esperado ${p.toFixed(4)}`).toBeLessThanOrEqual(half);
      }
    });
  }

  it("EVT-02 Kaigan: con rutas de frescos > 4 h la falla de refrigeración (X-01) es ≈ 1.5× más frecuente", () => {
    const slow = createScmEngine(paramsWith((p) => {
      p.regions.kaigan.speedKmh = 8;
    }));
    const shortRoutes = observed("kaigan").get("X-01") ?? 0;
    const longRoutes = observed("kaigan", slow).get("X-01") ?? 0;
    // Con rutas largas R-01 se activa desde la primera semana: p_tick usa el factor 1.5 casi toda la época.
    const ratio = longRoutes / shortRoutes;
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThan(1.8);
    expect(params.events["X-01"].longRouteMult).toBe(1.5);
  });
});
