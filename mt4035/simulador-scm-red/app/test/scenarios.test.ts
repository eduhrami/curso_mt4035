/** SCM-ESC (P1): escenarios de referencia calibrados contra el caso (casos de prueba §5). */
import { describe, expect, it } from "vitest";
import { playGame } from "@mt4035/sim-core/testing";
import { createScmEngine, EPOCHS, params, scoreRun } from "../src/index.ts";
import type { DcSpec } from "../src/types.ts";
import { adaptedDispersed, naiveTransplant } from "./helpers/policies.ts";
import { det, engine, meanKpi, paramsWith, realEngine, sumMetric } from "./helpers/run.ts";

const asIs = (region: "kaigan" | "redriver" | "valle") => playGame(engine, det(region)).reports;

describe("SCM-ESC (P1)", () => {
  it("ESC-01 Kaigan: la red inicial (un CEDIS grande con inventario para 1,800 tiendas, AD-52) está saturada y pierde disponibilidad; con 8 CEDIS combinados y CPFR alcanza la referencia (OSA ≥ 95%, merma de frescos ≤ 16%)", () => {
    const initial = playGame(realEngine, det("kaigan")).reports;
    for (const r of initial) expect(r.rulesFired.some((f) => f.id === "R-07")).toBe(true);
    expect(meanKpi(initial, "OSA")).toBeLessThan(0.8);
    // Referencia SEJ: 8 CEDIS combinados, consolidación combinada y proveedores que planean junto con la cadena (CPFR).
    const sej = playGame(
      createScmEngine(
        paramsWith((p) => {
          p.regions.kaigan.initial.dcs = { count: 8, type: "combined", size: "medium" } as typeof p.regions.kaigan.initial.dcs;
          p.regions.kaigan.initial.consolidation = "combined";
          p.regions.kaigan.initial.collaboration = "cpfr";
        }),
      ),
      det("kaigan"),
    ).reports;
    for (const r of sej) {
      expect(r.kpis.OSA).toBeGreaterThanOrEqual(0.95);
      expect(r.kpis.WASTE_FRESH).toBeLessThanOrEqual(0.16);
    }
    expect(meanKpi(sej, "OSA")).toBeGreaterThan(meanKpi(initial, "OSA"));
    expect(meanKpi(sej, "WASTE_FRESH")).toBeLessThan(meanKpi(initial, "WASTE_FRESH"));
  });

  it("ESC-02 Red River as-is (un CEDIS central con inventario): 1–4 camiones/tienda/día (consolidado y limitado por distancia), ITR 15–30, OSA 86–93%, frescos < 12% de la demanda", () => {
    for (const r of asIs("redriver")) {
      expect(r.kpis.TRUCKS).toBeGreaterThanOrEqual(1);
      expect(r.kpis.TRUCKS).toBeLessThanOrEqual(4);
      expect(r.kpis.ITR).toBeGreaterThanOrEqual(15);
      expect(r.kpis.ITR).toBeLessThanOrEqual(30);
      expect(r.kpis.OSA).toBeGreaterThanOrEqual(0.86);
      expect(r.kpis.OSA).toBeLessThanOrEqual(0.93);
      expect(sumMetric(r, "demand_fresh") / r.kpis.DEMAND!).toBeLessThan(0.12);
    }
  });

  it("ESC-04 trasplante ingenuo en Red River: CTS ≥ 2× Kaigan, dispara R-05 y pierde en utilidad contra el adaptado", () => {
    const naive = playGame(engine, det("redriver"), naiveTransplant()).reports;
    const adapted = playGame(engine, det("redriver"), adaptedDispersed()).reports;
    const kaigan = asIs("kaigan");
    const late = (rs: typeof naive) => rs.slice(4); // con los CD ya operando
    expect(meanKpi(late(naive), "CTS_PCT")).toBeGreaterThanOrEqual(2 * meanKpi(kaigan, "CTS_PCT"));
    expect(naive.some((r) => r.rulesFired.some((f) => f.id === "R-05"))).toBe(true);
    // Utilidad acumulada: el puntaje definitivo (AD-36).
    const profit = (rs: typeof naive) => rs.reduce((a, r) => a + r.kpis.PROFIT!, 0);
    expect(profit(naive)).toBeLessThan(profit(adapted));
  });

  it("ESC-05 diseño adaptado en Red River: CTS ↓ y OSA ↑ frente a as-is desde A2", () => {
    const base = asIs("redriver");
    const adapted = playGame(engine, det("redriver"), adaptedDispersed()).reports;
    for (let e = 4; e < EPOCHS; e++) {
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
        : {};
    const cts = (region: "kaigan" | "redriver" | "valle") => meanKpi(playGame(engine, det(region), pkg).reports.slice(4), "CTS_PCT");
    const [k, v, r] = [cts("kaigan"), cts("valle"), cts("redriver")];
    expect(k).toBeLessThan(v);
    expect(v).toBeLessThan(r);
  });
});
