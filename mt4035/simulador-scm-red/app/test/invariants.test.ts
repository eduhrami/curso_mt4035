/** SCM-INV: invariantes que se cumplen en cualquier combinación (casos de prueba §3). */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { playGame, allKpiValues } from "@mt4035/sim-core/testing";
import { route } from "../src/network.ts";
import { params } from "../src/model.ts";
import { CATEGORIES } from "../src/types.ts";
import { builtDcs, det, engine, randomPolicy, run, start, sto, withOverrides } from "./helpers/run.ts";

const RATIO_KPIS = ["OSA", "OTIF", "OFR", "WASTE", "LOST_SALES", "INFO_MATURITY", "TRUST", ...CATEGORIES.flatMap((c) => [`OSA_${c.toUpperCase()}`, `WASTE_${c.toUpperCase()}`])];

describe("SCM-INV (P1)", () => {
  it("INV-01 determinismo: misma semilla y decisiones ⇒ corrida idéntica", () => {
    const a = playGame(engine, sto("valle", 7), randomPolicy(3));
    const b = playGame(engine, sto("valle", 7), randomPolicy(3));
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("INV-02 semillas distintas con eventos ⇒ corridas distintas (≥ 99% de pares)", () => {
    let distinct = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const a = playGame(engine, sto("kaigan", i), undefined, 2).reports;
      const b = playGame(engine, sto("kaigan", i + 10_000), undefined, 2).reports;
      if (JSON.stringify(a.map((r) => [r.kpis, r.events])) !== JSON.stringify(b.map((r) => [r.kpis, r.events]))) distinct++;
    }
    expect(distinct / N).toBeGreaterThanOrEqual(0.99);
  });

  it("INV-03 exactamente 12 épocas × 13 semanas, etiquetas A1-T1 … A3-T4", () => {
    const { state, reports } = playGame(engine, det("kaigan"));
    expect(reports).toHaveLength(12);
    expect(reports.every((r) => r.tickMetrics.length === 13)).toBe(true);
    expect(reports[0]!.label).toBe("A1-T1");
    expect(reports[11]!.label).toBe("A3-T4");
    expect(state.model.week).toBe(156);
    expect(state.phase).toBe("FINAL");
  });

  it("INV-04 solo confirmEpoch avanza", () => {
    const s = engine.stage(start(det("redriver")), { "D-23": "scan" }).state;
    expect(s.epoch).toBe(0);
    expect(engine.stage(s, {}).state.epoch).toBe(0);
    expect(engine.confirmEpoch(s).state.epoch).toBe(1);
  });

  it("INV-05/06/07/13 conservación de unidades y demanda, sin inventario negativo, cierre contable (bot aleatorio, 3 regiones)", () => {
    for (const region of ["kaigan", "redriver", "valle"] as const) {
      for (let seed = 1; seed <= 3; seed++) {
        let s = start(sto(region, seed));
        const pol = randomPolicy(seed * 31);
        for (let e = 0; e < 8; e++) {
          const r = run(s, 1, pol);
          s = r.state;
          for (const m of r.reports[0]!.tickMetrics) {
            const tol = 1e-9 * Math.max(1, m.received!);
            expect(m.invIni! + m.received!).toBeCloseTo(m.sold! + m.waste! + m.excursion! + m.invFin!, 6);
            expect(Math.abs(m.invIni! + m.received! - (m.sold! + m.waste! + m.excursion! + m.invFin!))).toBeLessThan(tol + 1e-6);
            expect(m.demand!).toBeCloseTo(m.sold! + m.subst! + m.lost!, 6);
            expect(m.lost!).toBeCloseTo(params.inventory.unmetLostShare * (m.demand! - m.sold!), 6);
            expect(m.ebitda!).toBeCloseTo(m.gm! - m.wasteCost! - m.transport! - m.inbound! - m.handling! - m.dcFixed! - m.receivingCost! - m.carrying! - m.itOpex!, 4);
          }
          for (const c of CATEGORIES) expect(s.model.inventory[c].every((x) => x >= 0)).toBe(true);
        }
      }
    }
  });

  it("INV-08/09/15 proporciones en [0, 1], ITR/DOI coherentes y sin NaN/∞ (propiedad con bot aleatorio)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e6 }), fc.constantFrom("kaigan", "redriver", "valle"), (seed, region) => {
        const { reports } = playGame(engine, sto(region as "kaigan", seed), randomPolicy(seed), 6);
        if (!allKpiValues(reports).every(Number.isFinite)) return false;
        for (const r of reports) {
          for (const k of RATIO_KPIS) if (!(r.kpis[k]! >= 0 && r.kpis[k]! <= 1)) return false;
          if (!(r.kpis.ITR! > 0 && r.kpis.DOI! > 0)) return false;
          if (Math.abs(r.kpis.DOI! - 365 / r.kpis.ITR!) > 1e-9 * r.kpis.DOI!) return false;
        }
        return true;
      }),
      { numRuns: 25 },
    );
  });

  it("INV-11 rutas: 1 ≤ paradas ≤ tope y lazo local ≤ turno (propiedad)", () => {
    fc.assert(
      fc.property(
        fc.record({
          distKm: fc.double({ min: 0, max: 900, noNaN: true }),
          deltaKm: fc.double({ min: 0.05, max: 40, noNaN: true }),
          dropCases: fc.double({ min: 0.1, max: 600, noNaN: true }),
          capacityCases: fc.constantFrom(450, 500),
          speedKmh: fc.double({ min: 5, max: 90, noNaN: true }),
          stopHours: fc.double({ min: 0.1, max: 1, noNaN: true }),
          maxStops: fc.integer({ min: 1, max: 30 }),
        }),
        (i) => {
          const r = route({ ...i, shiftHours: params.shiftHours });
          return r.stops >= 1 && r.stops <= i.maxStops && (r.stops === 1 || r.localHours <= params.shiftHours + 1e-9) && r.routeHours >= r.localHours;
        },
      ),
    );
  });

  it("INV-12 entregas por tienda al día = Σ frecuencias (consolidado) o Σ proveedores × frecuencia (por proveedor)", () => {
    // Red con un CEDIS cerca de cada zona: ninguna frecuencia queda limitada por distancia (R-13).
    const near = [7, 10, 25, 28].map((zone, i) => ({ id: `T${i}`, zone, type: "combined" as const, size: "large" as const }));
    const kr = run(withOverrides(start(det("kaigan")), { dcs: builtDcs(near) }), 1).reports[0]!;
    expect(kr.rulesFired.some((f) => f.id === "R-13")).toBe(false);
    const k = kr.kpis;
    const kf = params.regions.kaigan.initial.freq;
    expect(k.TRUCKS).toBeCloseTo((kf.fresh + kf.chilled + kf.ambient + kf.frozen) / 7, 9);
    // Cross-dock sin consolidar: cada proveedor llega en su propio camión.
    const xd = near.map((d) => ({ ...d, type: "crossdock" as const }));
    const ks = run(withOverrides(start(det("kaigan")), { dcs: builtDcs(xd), "dec.consolidation": "supplier" }), 1).reports[0]!.kpis;
    const sup = params.regions.kaigan.suppliers;
    expect(ks.TRUCKS).toBeCloseTo((sup.fresh * kf.fresh + sup.chilled * kf.chilled + sup.ambient * kf.ambient + sup.frozen * kf.frozen) / 7, 9);
  });

  it("INV-14 todo evento trae mensaje y causa con drivers; toda regla disparada queda en el log", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { reports } = playGame(engine, sto("valle", seed), randomPolicy(seed), 10);
      for (const r of reports) {
        const evMsgs = r.messages.filter((m) => m.source.startsWith("X-"));
        expect(evMsgs).toHaveLength(r.events.length);
        for (const m of evMsgs) expect(m.title.length).toBeGreaterThan(0);
        expect(r.causal.filter((c) => c.kind === "event")).toHaveLength(r.events.length);
        expect(r.causal.filter((c) => c.kind === "rule")).toHaveLength(r.rulesFired.length);
        for (const c of r.causal.filter((x) => x.kind === "event")) expect(c.drivers.length).toBeGreaterThan(0);
      }
    }
  });

  it("INV-16 decisiones fuera de rango o incompatibles se rechazan sin alterar el estado", () => {
    const s0 = start(det("redriver"));
    const bad = engine.stage(s0, { "D-11": { fresh: 30, chilled: 7, ambient: 7, frozen: 2 }, "D-12": "combined", "D-99": 1 });
    expect(bad.errors.map((e) => e.id).sort()).toEqual(["D-11", "D-12", "D-99"]);
    expect(bad.state).toBe(s0);
  });

  it("INV-17 el capex se carga al decidir y el CD opera al cumplirse el retraso", () => {
    const s0 = start(det("redriver"));
    const r = run(s0, 4, (_s, e) => (e === 0 ? { "D-01": [{ id: "N1", zone: 14, type: "stocking", size: "medium" }] } : {}));
    expect(r.reports[0]!.ledger).toContainEqual(expect.objectContaining({ kind: "capex", source: "D-01", epoch: 0 }));
    expect(r.reports.slice(1).flatMap((x) => x.ledger).filter((l) => l.source === "D-01")).toEqual([]);
    expect(r.reports.map((x) => x.kpis.DC_COUNT)).toEqual([0, 0, 0, 1]);
  });
});
