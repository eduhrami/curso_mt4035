/** SCM-CAU (P1): dirección causal con pruebas pareadas en modo determinista (casos de prueba §4). */
import { describe, expect, it } from "vitest";
import { effectiveCv } from "../src/tick.ts";
import { params } from "../src/model.ts";
import { createScmEngine } from "../src/model.ts";
import type { DcSpec } from "../src/types.ts";
import { builtDcs, det, paramsWith, run, start, sumMetric, withOverrides } from "./helpers/run.ts";

const oneEpoch = (overrides: Record<string, unknown>, region: "kaigan" | "redriver" | "valle" = "kaigan") =>
  run(withOverrides(start(det(region)), overrides), 1).reports[0]!;

const rrDcs = (zones: number[], type: DcSpec["type"] = "stocking"): DcSpec[] => zones.map((zone, i) => ({ id: `T${i}`, zone, type, size: "medium" }));

describe("SCM-CAU (P1)", () => {
  it("CAU-01 Red River: +1 CD operativo ⇒ distancia CD→tienda ↓, transporte ↓, costo fijo de CD ↑", () => {
    const base = oneEpoch({ dcs: builtDcs(rrDcs([14, 21])) }, "redriver");
    const plus = oneEpoch({ dcs: builtDcs(rrDcs([14, 21, 3])) }, "redriver");
    expect(plus.kpis.DC_DIST_KM).toBeLessThan(base.kpis.DC_DIST_KM!);
    expect(sumMetric(plus, "transport")).toBeLessThan(sumMetric(base, "transport"));
    expect(sumMetric(plus, "dcFixed")).toBeGreaterThan(sumMetric(base, "dcFixed"));
  });

  it("CAU-03 Kaigan: frecuencia de frescos 3 → 7 → 14 ⇒ transporte ↑, merma de frescos ↓, inventario ↓; OSA de frescos 14 ≥ 3", () => {
    const [f7, f14, f21] = [3, 7, 14].map((f) => oneEpoch({ "dec.freq.fresh": f }));
    expect(sumMetric(f14!, "transport")).toBeGreaterThan(sumMetric(f7!, "transport"));
    expect(sumMetric(f21!, "transport")).toBeGreaterThan(sumMetric(f14!, "transport"));
    expect(f14!.kpis.WASTE_FRESH).toBeLessThanOrEqual(f7!.kpis.WASTE_FRESH!);
    expect(f21!.kpis.WASTE_FRESH).toBeLessThanOrEqual(f14!.kpis.WASTE_FRESH!);
    expect(f21!.kpis.WASTE_FRESH).toBeLessThan(f7!.kpis.WASTE_FRESH!);
    // Inventario en la primera semana, antes de que R-03 (confianza) altere la demanda.
    expect(f21!.tickMetrics[0]!.invValue).toBeLessThan(f7!.tickMetrics[0]!.invValue!);
    expect(f21!.kpis.OSA_FRESH).toBeGreaterThanOrEqual(f7!.kpis.OSA_FRESH!);
  });

  it("CAU-04 frescos 1× → 2×/día: en Kaigan con CEDIS cercanos sube el transporte; en Red River la distancia lo impide (R-13) y casi no cambia", () => {
    const base = { dcs: builtDcs(rrDcs([7, 10, 25, 28], "combined")), "dec.consolidation": "combined" };
    const inc = (region: "kaigan" | "redriver") => {
      const lo = oneEpoch({ ...base, "dec.freq.fresh": 7 }, region);
      const hi = oneEpoch({ ...base, "dec.freq.fresh": 14 }, region);
      return { trucks: hi.kpis.TRUCKS! - lo.kpis.TRUCKS!, hi };
    };
    const kg = inc("kaigan");
    const rr = inc("redriver");
    // Kaigan: todas las zonas a menos de 2 h del CEDIS reciben las 7 visitas adicionales por semana.
    expect(kg.trucks).toBeCloseTo(1, 6);
    expect(kg.hi.rulesFired.some((f) => f.id === "R-13")).toBe(false);
    // Red River: con la misma red, la mayoría de las zonas queda lejos y la frecuencia efectiva apenas sube.
    expect(rr.trucks).toBeLessThan(0.5 * kg.trucks);
    expect(rr.hi.rulesFired.some((f) => f.id === "R-13")).toBe(true);
  });

  it("CAU-05 Kaigan: CSL de no perecederos 90% → 99% ⇒ inventario ↑, OSA ↑, costo de inventario ↑, ITR ↓", () => {
    // En frescos, subir el CSL más allá de la vida de anaquel se vuelve merma y R-02 baja la OSA: se deja fijo.
    const csl = (v: number) => ({ fresh: 0.9, chilled: v, ambient: v, frozen: v });
    const lo = oneEpoch({ "dec.csl": csl(0.9) });
    const hi = oneEpoch({ "dec.csl": csl(0.99) });
    expect(sumMetric(hi, "invValue")).toBeGreaterThan(sumMetric(lo, "invValue"));
    expect(hi.kpis.OSA).toBeGreaterThan(lo.kpis.OSA!);
    expect(sumMetric(hi, "carrying")).toBeGreaterThan(sumMetric(lo, "carrying"));
    expect(hi.kpis.ITR).toBeLessThan(lo.kpis.ITR!);
  });

  it("CAU-06 Valle: madurez de TI 0 → 1 ⇒ CV efectivo ↓ e inventario ↓ con el mismo CSL", () => {
    const lo = withOverrides(start(det("valle")), { "dec.info": "pos_daily", infoSince: 0 });
    const hi = withOverrides(start(det("valle")), { "dec.info": "pos_daily", infoSince: -2 });
    const rLo = run(lo, 1);
    const rHi = run(hi, 1);
    expect(rLo.reports[0]!.kpis.INFO_MATURITY).toBe(0);
    expect(rHi.reports[0]!.kpis.INFO_MATURITY).toBe(1);
    expect(effectiveCv(rHi.state.model, params)).toBeLessThan(effectiveCv(rLo.state.model, params));
    expect(sumMetric(rHi.reports[0]!, "invValue")).toBeLessThan(sumMetric(rLo.reports[0]!, "invValue"));
  });

  it("CAU-07 Red River: compartir POS no → sí ⇒ BWR ↓ (hacia 1) y OTIF ↑", () => {
    // Red sin saturar y cross-dock: sin el amortiguador del CEDIS con inventario, la mejora del proveedor llega a la tienda.
    const dcs = builtDcs(rrDcs([7, 10, 25, 28], "crossdock"));
    const no = oneEpoch({ dcs }, "redriver");
    const daily = oneEpoch({ dcs, "dec.sharing": "yes" }, "redriver");
    expect(daily.kpis.BWR).toBeLessThan(no.kpis.BWR!);
    expect(daily.kpis.BWR).toBeLessThan(1.5);
    expect(daily.kpis.OTIF).toBeGreaterThan(no.kpis.OTIF!);
  });

  it("CAU-09 Kaigan: consolidación por proveedor → combinada ⇒ camiones por tienda de decenas a < 12", () => {
    const sup = oneEpoch({ "dec.consolidation": "supplier" });
    const comb = oneEpoch({ "dec.consolidation": "combined" });
    expect(sup.kpis.TRUCKS).toBeGreaterThan(20);
    expect(comb.kpis.TRUCKS).toBeLessThan(12);
  });

  it("CAU-14 Kaigan: CD de frescos con inventario → cross-dock ⇒ merma de frescos ↓ e inventario en CD ↓", () => {
    const asIs = start(det("kaigan")).model.dcs;
    const toType = (t: DcSpec["type"]) => asIs.map((d) => ({ ...d, type: t, prevType: t }));
    const stk = oneEpoch({ dcs: toType("stocking") });
    const xd = oneEpoch({ dcs: toType("combined") });
    expect(xd.kpis.WASTE_FRESH).toBeLessThan(stk.kpis.WASTE_FRESH!);
    expect(sumMetric(xd, "dcInvValue")).toBeLessThan(sumMetric(stk, "dcInvValue"));
  });

  it("CAU-16 Valle: apertura dispersa → dominancia ⇒ paradas por ruta ↑, CTS por tienda ↓, densidad (canibalización) ↑", () => {
    const grow = (strategy: "dominance" | "dispersed") =>
      run(start(det("valle")), 9, (_s, e) => (e === 0 ? { "D-05": strategy, "D-08": 25 } : e < 8 ? { "D-08": 25 } : {})).reports[8]!;
    const disp = grow("dispersed");
    const dom = grow("dominance");
    expect(dom.kpis.STOPS_PER_ROUTE).toBeGreaterThan(disp.kpis.STOPS_PER_ROUTE!);
    expect(dom.kpis.CTS_STORE).toBeLessThan(disp.kpis.CTS_STORE!);
    expect(dom.kpis.DC_DIST_KM).toBeLessThan(disp.kpis.DC_DIST_KM!);
  });

  it("CAU-22 Valle: congestión ×1.3 ⇒ horas de ruta ↑, merma ↑ y OTIF ↓", () => {
    const slow = createScmEngine(paramsWith((p) => {
      p.regions.valle.congestionMean *= 1.3;
      p.regions.valle.congestionSd *= 1.3;
    }));
    const base = oneEpoch({}, "valle");
    const jam = run(slow.createGame(det("valle")), 1, undefined, slow).reports[0]!;
    expect(sumMetric(jam, "freshRouteHours")).toBeGreaterThan(sumMetric(base, "freshRouteHours"));
    expect(jam.kpis.WASTE).toBeGreaterThan(base.kpis.WASTE!);
    expect(jam.kpis.OTIF).toBeLessThan(base.kpis.OTIF!);
  });
});
