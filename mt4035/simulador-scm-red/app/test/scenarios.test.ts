/** SCM-ESC (P1): escenarios de referencia calibrados contra el caso (casos de prueba §5). */
import { describe, expect, it } from "vitest";
import { playGame } from "@mt4035/sim-core/testing";
import { params, scoreRun } from "../src/index.ts";
import type { DcSpec } from "../src/types.ts";
import { adaptedDispersed, naiveTransplant } from "./helpers/policies.ts";
import { det, engine, meanKpi, sumMetric } from "./helpers/run.ts";

const asIs = (region: "kaigan" | "redriver" | "valle") => playGame(engine, det(region)).reports;

describe("SCM-ESC (P1)", () => {
  it("ESC-01 Kaigan as-is: 8–11 camiones/tienda/día, ITR ≥ 40, OSA ≥ 96%, merma de frescos ≤ 5%", () => {
    for (const r of asIs("kaigan")) {
      expect(r.kpis.TRUCKS).toBeGreaterThanOrEqual(8);
      expect(r.kpis.TRUCKS).toBeLessThanOrEqual(11);
      expect(r.kpis.ITR).toBeGreaterThanOrEqual(40);
      expect(r.kpis.OSA).toBeGreaterThanOrEqual(0.96);
      expect(r.kpis.WASTE_FRESH).toBeLessThanOrEqual(0.05);
    }
  });

  it("ESC-02 Red River as-is: 4–8 camiones/tienda/día, ITR 15–25, OSA 88–93%, frescos < 12% de la demanda", () => {
    for (const r of asIs("redriver")) {
      expect(r.kpis.TRUCKS).toBeGreaterThanOrEqual(4);
      expect(r.kpis.TRUCKS).toBeLessThanOrEqual(8);
      expect(r.kpis.ITR).toBeGreaterThanOrEqual(15);
      expect(r.kpis.ITR).toBeLessThanOrEqual(25);
      expect(r.kpis.OSA).toBeGreaterThanOrEqual(0.88);
      expect(r.kpis.OSA).toBeLessThanOrEqual(0.93);
      expect(sumMetric(r, "demand_fresh") / r.kpis.DEMAND!).toBeLessThan(0.12);
    }
  });

  it("ESC-04 trasplante ingenuo en Red River: CTS ≥ 2× Kaigan, dispara R-05 y pierde contra el adaptado con las tres estrategias", () => {
    const naive = playGame(engine, det("redriver"), naiveTransplant()).reports;
    const adapted = playGame(engine, det("redriver"), adaptedDispersed()).reports;
    const kaigan = asIs("kaigan");
    const late = (rs: typeof naive) => rs.slice(4); // con los CD ya operando
    expect(meanKpi(late(naive), "CTS_PCT")).toBeGreaterThanOrEqual(2 * meanKpi(kaigan, "CTS_PCT"));
    expect(naive.some((r) => r.rulesFired.some((f) => f.id === "R-05"))).toBe(true);
    for (const st of ["freshness", "lowcost", "convenience"] as const) {
      expect(scoreRun(naive, st, params).score).toBeLessThan(scoreRun(adapted, st, params).score);
    }
  });

  it("ESC-05 diseño adaptado en Red River: CTS ↓ y OSA ↑ frente a as-is desde A2", () => {
    const base = asIs("redriver");
    const adapted = playGame(engine, det("redriver"), adaptedDispersed()).reports;
    for (let e = 4; e < 20; e++) {
      expect(adapted[e]!.kpis.CTS_PCT).toBeLessThan(base[e]!.kpis.CTS_PCT!);
      expect(adapted[e]!.kpis.OSA).toBeGreaterThan(base[e]!.kpis.OSA!);
    }
  });

  it("ESC-06 el mismo paquete de decisiones en las tres regiones: costo logístico relativo Kaigan < Valle < Red River", () => {
    const pkg = (_s: unknown, e: number) =>
      e === 0
        ? {
            "D-01": [7, 10, 25, 28].map((zone, i): DcSpec => ({ id: `P${i}`, zone, type: "stocking", size: "medium" })),
            "D-11": { fresh: 7, chilled: 3, ambient: 2, frozen: 1 },
          }
        : e === 3
          ? { "D-10": { fresh: "dsd", chilled: "dc", ambient: "dc", frozen: "dc" } }
          : {};
    const cts = (region: "kaigan" | "redriver" | "valle") => meanKpi(playGame(engine, det(region), pkg).reports.slice(4), "CTS_PCT");
    const [k, v, r] = [cts("kaigan"), cts("valle"), cts("redriver")];
    expect(k).toBeLessThan(v);
    expect(v).toBeLessThan(r);
  });
});
