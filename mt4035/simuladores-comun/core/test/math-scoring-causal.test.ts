import { describe, expect, it } from "vitest";
import { normalCdf, normalInv, normalLoss, normalPdf, percentile, perTickProbability, std, mean, clamp } from "../src/math.ts";
import { computeScore, checkWeights, normalize } from "../src/scoring.ts";
import { explainabilityCoverage, explainKpi } from "../src/causal.ts";
import type { EpochReport } from "../src/types.ts";

describe("math", () => {
  it("normalCdf en valores conocidos", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normalCdf(-1.645)).toBeCloseTo(0.05, 3);
  });
  it("normalInv es la inversa de normalCdf", () => {
    for (const p of [0.01, 0.1, 0.5, 0.9, 0.95, 0.99]) expect(normalCdf(normalInv(p))).toBeCloseTo(p, 6);
    expect(normalInv(0)).toBe(-Infinity);
    expect(normalInv(1)).toBe(Infinity);
  });
  it("normalLoss: G(0) = φ(0) y decrece con z", () => {
    expect(normalLoss(0)).toBeCloseTo(normalPdf(0), 9);
    expect(normalLoss(1)).toBeLessThan(normalLoss(0));
    expect(normalLoss(1)).toBeCloseTo(0.0833, 3);
  });
  it("percentile, mean, std y clamp", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([5], 0.95)).toBe(5);
    expect(percentile([], 0.5)).toBeNaN();
    expect(mean([1, 2, 3])).toBe(2);
    expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(clamp(5, 0, 1)).toBe(1);
  });
  it("perTickProbability conserva P(≥1 en la época) = p", () => {
    const p = 0.3;
    const pt = perTickProbability(p, 13);
    expect(1 - (1 - pt) ** 13).toBeCloseTo(p, 12);
    expect(perTickProbability(1, 5)).toBe(1);
    expect(perTickProbability(0, 5)).toBe(0);
  });
});

describe("scoring (SCM-SCO / LOG-SCO genéricos)", () => {
  const specs = [
    { kpi: "OSA", weight: 0.6, direction: "higher" as const, worst: 0.8, best: 1 },
    { kpi: "CTS", weight: 0.4, direction: "lower" as const, worst: 20, best: 5 },
  ];
  it("los pesos deben sumar 1", () => {
    expect(() => checkWeights(specs)).not.toThrow();
    expect(() => checkWeights([{ ...specs[0]!, weight: 0.5 }])).toThrow();
  });
  it("normaliza en ambas direcciones con recorte", () => {
    expect(normalize(0.9, specs[0]!)).toBeCloseTo(0.5);
    expect(normalize(5, specs[1]!)).toBe(1);
    expect(normalize(30, specs[1]!)).toBe(0);
  });
  it("puntaje ∈ [0, 100] y decrece de forma estricta con las violaciones", () => {
    const values = { OSA: 0.95, CTS: 10 };
    const base = computeScore(values, specs).score;
    const g = [{ kpi: "OSA", op: ">=" as const, value: 0.97, penalty: 2 }];
    const one = computeScore(values, specs, g, { OSA: [0.95, 0.98] }).score;
    const two = computeScore(values, specs, g, { OSA: [0.95, 0.96] }).score;
    expect(base).toBeGreaterThan(one);
    expect(one).toBeGreaterThan(two);
    expect(computeScore({ OSA: 0, CTS: 100 }, specs, g, { OSA: Array(100).fill(0) }).score).toBe(0);
    expect(computeScore({ OSA: 1, CTS: 0 }, specs).score).toBe(100);
  });
  it("falla si falta un KPI", () => {
    expect(() => computeScore({ OSA: 1 }, specs)).toThrow(/CTS/);
  });
});

describe("causal: cobertura de explicabilidad", () => {
  const rep = (epoch: number, kpis: Record<string, number>, causalKpis: string[][]): EpochReport => ({
    epoch,
    label: `E${epoch}`,
    kpis,
    tickMetrics: [],
    trace: [],
    events: [],
    rulesFired: [],
    messages: [],
    ledger: [],
    causal: causalKpis.map((k) => ({ epoch, tick: 0, kind: "rule", id: "R-01", kpis: k, drivers: [] })),
  });
  it("cuenta cambios > umbral con y sin causa registrada", () => {
    const h = [rep(0, { A: 1, B: 1 }, []), rep(1, { A: 2, B: 1.05 }, [["A"]]), rep(2, { A: 2, B: 2 }, [])];
    const c = explainabilityCoverage(h, 0.1);
    expect(c.total).toBe(2); // A en E1 (explicado) y B en E2 (sin causa)
    expect(c.explained).toBe(1);
    expect(c.coverage).toBe(0.5);
    expect(c.unexplained[0]).toMatchObject({ epoch: 2, kpi: "B" });
  });
  it("una causa con kpis ['*'] explica cualquier KPI; sin cambios la cobertura es 1", () => {
    expect(explainKpi(rep(1, {}, [["*"]]), "Z")).toHaveLength(1);
    expect(explainabilityCoverage([rep(0, { A: 1 }, []), rep(1, { A: 1 }, [])]).coverage).toBe(1);
  });
});
