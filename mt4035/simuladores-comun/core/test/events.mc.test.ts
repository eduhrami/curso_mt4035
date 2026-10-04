/**
 * Monte Carlo de frecuencias de eventos (SCM-EVT-01 / LOG-EVT-01 genéricos).
 * Semillas fijas 1…N: el resultado es determinista, no hay pruebas intermitentes (AD-15).
 */
import { describe, expect, it } from "vitest";
import { createEngine } from "../src/engine.ts";
import { makeToyModel, toyConfig, toyParams } from "./fixtures/toy-model.ts";

const N = 1000;

/** IC 95% normal para una proporción. */
const ci = (p: number, n: number) => {
  const h = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return [p - h, p + h] as const;
};

function epochHitRate(fridge: boolean): number {
  const engine = createEngine(makeToyModel(1), toyParams);
  let hits = 0;
  for (let seed = 1; seed <= N; seed++) {
    let s = engine.createGame(toyConfig(seed));
    if (fridge) s = { ...s, model: { ...s.model, fridge: true } };
    if (engine.confirmEpoch(s).report.events.some((e) => e.id === "X-01")) hits++;
  }
  return hits / N;
}

describe("Monte Carlo de eventos", () => {
  it("P(≥1 ocurrencia en la época) cae en el IC 95% de p_base × modificadores", () => {
    // Sin refrigerador: 0.4 × 2 = 0.8 · Con refrigerador: 0.4 × 0.5 = 0.2
    const [lo1, hi1] = ci(0.8, N);
    const r1 = epochHitRate(false);
    expect(r1).toBeGreaterThanOrEqual(lo1);
    expect(r1).toBeLessThanOrEqual(hi1);
    const [lo2, hi2] = ci(0.2, N);
    const r2 = epochHitRate(true);
    expect(r2).toBeGreaterThanOrEqual(lo2);
    expect(r2).toBeLessThanOrEqual(hi2);
  });
});
