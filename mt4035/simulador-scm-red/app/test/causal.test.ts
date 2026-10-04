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
const viaDc = { fresh: "dsd", chilled: "dc", ambient: "dc", frozen: "dc" };

describe("SCM-CAU (P1)", () => {
  it("CAU-01 Red River: +1 CD operativo ⇒ distancia CD→tienda ↓, transporte ↓, costo fijo de CD ↑", () => {
    const base = oneEpoch({ dcs: builtDcs(rrDcs([14, 21])), "dec.flows": viaDc }, "redriver");
    const plus = oneEpoch({ dcs: builtDcs(rrDcs([14, 21, 3])), "dec.flows": viaDc }, "redriver");
    expect(plus.kpis.DC_DIST_KM).toBeLessThan(base.kpis.DC_DIST_KM!);
    expect(sumMetric(plus, "transport")).toBeLessThan(sumMetric(base, "transport"));
    expect(sumMetric(plus, "dcFixed")).toBeGreaterThan(sumMetric(base, "dcFixed"));
  });

  it("CAU-03 Kaigan: frecuencia de frescos 7 → 14 → 21 ⇒ transporte ↑, merma de frescos ↓, inventario ↓; OSA de frescos 21 ≥ 7", () => {
    const [f7, f14, f21] = [7, 14, 21].map((f) => oneEpoch({ "dec.freq.fresh": f }));
    expect(sumMetric(f14!, "transport")).toBeGreaterThan(sumMetric(f7!, "transport"));
    expect(sumMetric(f21!, "transport")).toBeGreaterThan(sumMetric(f14!, "transport"));
    expect(f14!.kpis.WASTE_FRESH).toBeLessThanOrEqual(f7!.kpis.WASTE_FRESH!);
    expect(f21!.kpis.WASTE_FRESH).toBeLessThanOrEqual(f14!.kpis.WASTE_FRESH!);
    expect(f21!.kpis.WASTE_FRESH).toBeLessThan(f7!.kpis.WASTE_FRESH!);
    // Inventario en la primera semana, antes de que R-03 (confianza) altere la demanda.
    expect(f21!.tickMetrics[0]!.invValue).toBeLessThan(f7!.tickMetrics[0]!.invValue!);
    expect(f21!.kpis.OSA_FRESH).toBeGreaterThanOrEqual(f7!.kpis.OSA_FRESH!);
  });

  it("CAU-04 frescos 1× → 3×/día cuesta mucho más por tienda en Red River que en Kaigan; R-05 se dispara solo en Red River", () => {
    const allDc = { fresh: "dc", chilled: "dc", ambient: "dc", frozen: "dc" };
    const rrBase = { dcs: builtDcs(rrDcs([7, 10, 25, 28], "combined")), "dec.flows": allDc, "dec.consolidation": "combined" };
    const inc = (region: "kaigan" | "redriver", extra: Record<string, unknown>) => {
      const lo = oneEpoch({ ...extra, "dec.freq.fresh": 7 }, region);
      const hi = oneEpoch({ ...extra, "dec.freq.fresh": 21 }, region);
      return { perStore: (sumMetric(hi, "transport") - sumMetric(lo, "transport")) / hi.kpis.STORES!, hi };
    };
    const rr = inc("redriver", rrBase);
    const kg = inc("kaigan", {});
    expect(rr.perStore).toBeGreaterThan(2 * kg.perStore);
    expect(rr.hi.rulesFired.some((f) => f.id === "R-05")).toBe(true);
    expect(kg.hi.rulesFired.some((f) => f.id === "R-05")).toBe(false);
  });

  it("CAU-05 Kaigan: CSL 90% → 99% ⇒ inventario ↑, OSA ↑, costo de inventario ↑, ITR ↓", () => {
    const csl = (v: number) => ({ fresh: v, chilled: v, ambient: v, frozen: v });
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

  it("CAU-07 Red River: compartir POS no → diario ⇒ BWR ↓ (hacia 1) y OTIF ↑", () => {
    const no = oneEpoch({}, "redriver");
    const daily = oneEpoch({ "dec.sharing": "daily" }, "redriver");
    expect(daily.kpis.BWR).toBeLessThan(no.kpis.BWR!);
    expect(daily.kpis.BWR).toBeLessThan(1.5);
    expect(daily.kpis.OTIF).toBeGreaterThan(no.kpis.OTIF!);
  });

  it("CAU-08 Red River: DSD → por CD (CD operativos) ⇒ camiones por tienda ↓, costo de recepción ↓, OSA ↑ o =", () => {
    const dcs = builtDcs(rrDcs([7, 10, 25, 28]));
    const dsd = oneEpoch({ dcs }, "redriver");
    const dc = oneEpoch({ dcs, "dec.flows": viaDc }, "redriver");
    expect(dc.kpis.TRUCKS).toBeLessThan(dsd.kpis.TRUCKS!);
    expect(sumMetric(dc, "receivingCost")).toBeLessThan(sumMetric(dsd, "receivingCost"));
    expect(dc.kpis.OSA).toBeGreaterThanOrEqual(dsd.kpis.OSA!);
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
      run(start(det("valle")), 9, (_s, e) => (e === 0 ? { "D-05": strategy, "D-06": 0.15 } : {})).reports[8]!;
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
