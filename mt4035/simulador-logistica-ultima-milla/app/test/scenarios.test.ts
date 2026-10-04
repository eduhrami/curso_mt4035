/** LOG-ESC (P1): escenarios de referencia para calibración (casos de prueba §5). */
import { describe, expect, it } from "vitest";
import { det, oneEpoch, run, start } from "./helpers/run.ts";

const yearMean = (territory: "megalopolis" | "bajio" | "norte", k: string) => {
  const { reports } = run(start(det(territory)), 12);
  return reports.reduce((a, r) => a + r.kpis[k]!, 0) / reports.length;
};

describe("LOG-ESC (P1)", () => {
  it("ESC-01 Megalópolis as-is: FADS 78–85%, spoilage de frescos > 3% y CSAT < 4.0", () => {
    expect(yearMean("megalopolis", "FADS")).toBeGreaterThanOrEqual(0.78);
    expect(yearMean("megalopolis", "FADS")).toBeLessThanOrEqual(0.85);
    expect(yearMean("megalopolis", "SPOIL_RATE")).toBeGreaterThan(0.03);
    expect(yearMean("megalopolis", "CSAT")).toBeLessThan(4);
  });

  it("ESC-02 paradas por ruta as-is: urbano denso 25–70; rural disperso 8–15", () => {
    for (const t of ["megalopolis", "bajio"] as const) {
      const s = oneEpoch(t).kpis.STOPS_ROUTE!;
      expect(s).toBeGreaterThanOrEqual(25);
      expect(s).toBeLessThanOrEqual(70);
    }
    const rural = oneEpoch("norte").kpis.STOPS_RURAL!;
    expect(rural).toBeGreaterThanOrEqual(8);
    expect(rural).toBeLessThanOrEqual(15);
  });

  it("ESC-03 CPD con la misma política: rural ≈ 4–6× urbano; urbano en USD 1.40–12; los micro-hubs abaratan lo rural", () => {
    const n = oneEpoch("norte").kpis;
    const ratio = n.CPD_RURAL! / n.CPD_URBAN!;
    expect(ratio).toBeGreaterThanOrEqual(3.5);
    expect(ratio).toBeLessThanOrEqual(6.5);
    for (const t of ["megalopolis", "bajio", "norte"] as const) {
      const k = oneEpoch(t).kpis;
      expect(k.CPD_URBAN).toBeGreaterThanOrEqual(1.4);
      expect(k.CPD_URBAN).toBeLessThanOrEqual(12);
    }
    // ⚠ El rural as-is (70–80 km del CD, 3,000 km²) excede el máximo de 12 USD de Pahwa & Jaller;
    // la consolidación en micro-hubs lo reduce.
    expect(n.CPD_RURAL).toBeLessThanOrEqual(25);
    expect(oneEpoch("norte", { "dec.hubs": 6 }).kpis.CPD_RURAL).toBeLessThan(n.CPD_RURAL!);
  });

  it("ESC-04 mini-caso S5: costo por pedido urbano ≈ USD 8.00 con SFS y 9.60 con SFD (±10%)", () => {
    const opts = { market: { returns: "fashion" as const, growth: "slow" as const } };
    const sfd = oneEpoch("minicaso", { "dec.returnsChannel": "pickup" }, opts).kpis.CPD_URBAN!;
    const sfs = oneEpoch("minicaso", { "dec.returnsChannel": "pickup", "dec.sfd": { active: false, capacity: "low" }, "dec.sfs": { share: 1, pickers: "6" }, "dec.sfsCap": 0.5 }, opts).kpis.CPD_URBAN!;
    expect(sfs).toBeGreaterThanOrEqual(8 * 0.9);
    expect(sfs).toBeLessThanOrEqual(8 * 1.1);
    expect(sfd).toBeGreaterThanOrEqual(9.6 * 0.9);
    expect(sfd).toBeLessThanOrEqual(9.6 * 1.1);
  });
});
