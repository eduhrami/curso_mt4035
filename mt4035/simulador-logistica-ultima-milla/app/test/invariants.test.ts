/** LOG-INV: invariantes que se cumplen en cualquier combinación (casos de prueba §3). */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { allKpiValues, playGame } from "@mt4035/sim-core/testing";
import { route } from "../src/network.ts";
import { params } from "../src/model.ts";
import { scoreRun } from "../src/score.ts";
import type { TerritoryId } from "../src/types.ts";
import { det, engine, randomPolicy, run, start, sto } from "./helpers/run.ts";

const TERRITORIES: TerritoryId[] = ["megalopolis", "bajio", "norte"];
const RATIO_KPIS = ["OTD", "OTD_P95", "OTIF", "FADS", "FADS_P95", "PERFECT", "ETA_ACC", "VEHICLE_UTIL", "NODE_UTIL", "SPOIL_RATE", "STORE_OSA", "BACKLOG", "REJECTED", "CANCELLED", "EXCEPTION_RATE", "ROUTE_EFF", "EMPTY_MILES", "FLEET_SHORT"];
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

describe("LOG-INV (P1)", () => {
  it("INV-01 determinismo: misma semilla y decisiones ⇒ corrida idéntica", () => {
    const a = playGame(engine, sto("megalopolis", 7), randomPolicy(3), 12);
    const b = playGame(engine, sto("megalopolis", 7), randomPolicy(3), 12);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("INV-02 exactamente 36 épocas con ticks diarios del calendario real; etiquetas A1-M01 … A3-M12", () => {
    const { state, reports } = playGame(engine, det("bajio"));
    expect(reports).toHaveLength(36);
    expect(reports.map((r) => r.tickMetrics.length)).toEqual([0, 1, 2].flatMap(() => params.daysPerMonth));
    expect(reports[0]!.label).toBe("A1-M01");
    expect(reports[35]!.label).toBe("A3-M12");
    expect(state.model.day).toBe(3 * 365);
    expect(state.phase).toBe("FINAL");
  });

  it("INV-03 solo confirmEpoch avanza", () => {
    const s = engine.stage(start(det("bajio")), { "D-21": "4h" }).state;
    expect(s.epoch).toBe(0);
    expect(engine.stage(s, {}).state.epoch).toBe(0);
    expect(engine.confirmEpoch(s).state.epoch).toBe(1);
  });

  it("INV-04/05/08/09/11 conservación de pedidos, intentos, cierre del CPD y capacidades (bot aleatorio, 3 territorios)", () => {
    for (const territory of TERRITORIES) {
      for (let seed = 1; seed <= 3; seed++) {
        const { reports } = playGame(engine, sto(territory, seed), randomPolicy(seed * 31), 14);
        for (const r of reports) {
          for (const m of r.tickMetrics) {
            // pedidos_nuevos + backlog_ini = entregados + cancelados + backlog_fin
            expect(close(m.orders! + m.backlogIni!, m.handled! + m.cancelled! + m.backlogOut!)).toBe(true);
            // intentos = 1er intento exitoso + fallidos; exitosos ≤ intentos
            expect(close(m.attempts!, m.firstOk! + m.failedFirst!)).toBe(true);
            expect(m.successful!).toBeLessThanOrEqual(m.attempts! + 1e-9);
            // cierre del waterfall de costos
            expect(close(m.lastMile!, m.routeCost! + m.pickCost! + m.capitalCost! + m.reattemptCost! + m.returnsCost! + m.techCost! + m.fixedDaily! + m.robberyCost!)).toBe(true);
            // spoilage solo sobre frescos
            expect(m.spoiled!).toBeLessThanOrEqual(m.freshTotal! + 1e-9);
            expect(m.stops!).toBeLessThanOrEqual(m.capStops! + 1e-9);
          }
          expect(r.kpis.CPD).toBeCloseTo(r.tickMetrics.reduce((a, m) => a + m.lastMile!, 0) / r.tickMetrics.reduce((a, m) => a + m.successful!, 0), 9);
        }
      }
    }
  });

  it("INV-05/06/07/15 proporciones en [0, 1], OTIF ≤ OTD, CSAT ∈ [1, 5], NPS ∈ [−100, 100], sin NaN/∞ (propiedad)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e6 }), fc.constantFrom(...TERRITORIES), (seed, territory) => {
        const { reports } = playGame(engine, sto(territory, seed), randomPolicy(seed), 8);
        if (!allKpiValues(reports).every(Number.isFinite)) return false;
        for (const r of reports) {
          const k = r.kpis;
          for (const key of RATIO_KPIS) if (!(k[key]! >= 0 && k[key]! <= 1 + 1e-12)) return false;
          if (k.OTIF! > k.OTD! + 1e-12) return false;
          if (k.PERFECT! > Math.min(k.OTD!, 1) + 1e-12) return false;
          if (!(k.CSAT! >= 1 && k.CSAT! <= 5 && k.NPS! >= -100 && k.NPS! <= 100)) return false;
          if (!(k.CPD! > 0 && k.CYCLE_HOURS! > 0)) return false;
        }
        return true;
      }),
      { numRuns: 20 },
    );
  });

  it("INV-10 rutas: 1 ≤ paradas ≤ capacidad y tope; la ruta cabe en el turno salvo una parada (propiedad)", () => {
    fc.assert(
      fc.property(
        fc.record({
          stops: fc.double({ min: 0, max: 5000, noNaN: true }),
          areaKm2: fc.double({ min: 1, max: 5000, noNaN: true }),
          fragmentation: fc.double({ min: 1, max: 30, noNaN: true }),
          linehaulKm: fc.double({ min: 0, max: 150, noNaN: true }),
          linehaulSpeed: fc.double({ min: 10, max: 90, noNaN: true }),
          localSpeed: fc.double({ min: 5, max: 60, noNaN: true }),
          stopHours: fc.double({ min: 0.02, max: 0.5, noNaN: true }),
          capacity: fc.integer({ min: 1, max: 150 }),
          maxStops: fc.option(fc.integer({ min: 1, max: 40 }), { nil: undefined }),
        }),
        (i) => {
          const r = route({ ...i, shiftHours: params.shiftHours, kmMult: 1, kTsp: params.kTsp });
          const perStop = i.stopHours + r.deltaKm / i.localSpeed;
          return (
            r.stopsPerRoute >= 1 &&
            r.stopsPerRoute <= i.capacity &&
            r.stopsPerRoute <= (i.maxStops ?? Infinity) &&
            (r.stopsPerRoute === 1 || 2 * r.oneWayHours + r.stopsPerRoute * perStop <= params.shiftHours + 1e-9) &&
            r.routes * r.stopsPerRoute <= i.stops + 1e-9
          );
        },
      ),
    );
    // Un locker es una parada aunque reciba varios pedidos (R-14): menos paradas por pedido.
    const base = run(start(det("megalopolis")), 1).reports[0]!;
    const lk = run(engine.confirmEpoch(engine.stage(start(det("megalopolis")), { "D-06": 120 }).state).state, 1).reports[0]!;
    const stopsPerOrder = (r: typeof base) => r.tickMetrics.reduce((a, m) => a + m.stops!, 0) / r.kpis.DELIVERED!;
    expect(stopsPerOrder(lk)).toBeLessThan(stopsPerOrder(base));
  });

  it("INV-12/13 D-61 no cambia el motor ni el puntaje: solo la vista", () => {
    const pol = randomPolicy(5);
    const noReport = (s: Parameters<typeof pol>[0], e: number) => {
      const c = pol(s, e);
      delete c["D-61"];
      return c;
    };
    const mean = playGame(engine, sto("megalopolis", 9), noReport);
    const p95 = playGame(engine, sto("megalopolis", 9), (s, e) => (e === 0 ? { ...noReport(s, e), "D-61": "p95" } : noReport(s, e)));
    expect(p95.reports.map((r) => r.kpis)).toEqual(mean.reports.map((r) => r.kpis));
    const strip = (x: typeof mean.state.model) => ({ ...x, dec: { ...x.dec, report: "-" } });
    expect(strip(p95.state.model)).toEqual(strip(mean.state.model));
    for (const st of ["speed", "reliability", "efficiency"] as const) expect(scoreRun(p95.reports, st, params).score).toBe(scoreRun(mean.reports, st, params).score);
  });

  it("INV-14 todo evento trae mensaje y causa con drivers; toda regla disparada queda en el log", () => {
    for (let seed = 1; seed <= 4; seed++) {
      for (const territory of TERRITORIES) {
        const { reports } = playGame(engine, sto(territory, seed), randomPolicy(seed), 12);
        for (const r of reports) {
          const evMsgs = r.messages.filter((m) => m.source.startsWith("X-"));
          expect(evMsgs).toHaveLength(r.events.length);
          for (const m of evMsgs) expect(m.title.length).toBeGreaterThan(0);
          expect(r.causal.filter((c) => c.kind === "event")).toHaveLength(r.events.length);
          expect(r.causal.filter((c) => c.kind === "rule")).toHaveLength(r.rulesFired.length);
          for (const c of r.causal.filter((x) => x.kind === "event")) expect(c.drivers.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("INV-15 sin NaN con una zona sin demanda (confianza 0 en una zona rural)", () => {
    const s = start(det("norte"));
    const ruralIdx = params.territories.norte.zones.findIndex((z) => z.kind === "rural");
    const zeroed = { ...s, model: { ...s.model, zones: s.model.zones.map((z, i) => (i === ruralIdx ? { ...z, trust: 0 } : z)) } };
    const r = run(zeroed, 1).reports[0]!;
    expect(Object.values(r.kpis).every(Number.isFinite)).toBe(true);
    expect(r.tickMetrics.every((m) => Object.values(m).every(Number.isFinite))).toBe(true);
  });

  it("INV-16 decisiones fuera de rango o incompatibles se rechazan sin alterar el estado", () => {
    const s0 = start(det("bajio"));
    const bad = engine.stage(s0, { "D-04": 12, "D-44": "timedep", "D-20": { express: false, sameday: false, nextday: false, standard: false }, "D-99": 1 });
    expect(bad.errors.map((e) => e.id).sort()).toEqual(["D-04", "D-20", "D-44", "D-99"]);
    expect(bad.state).toBe(s0);
    expect(engine.validate(s0, { "D-01": { active: false, capacity: "mid" } }).ok).toBe(false);
    expect(engine.validate(s0, { "D-52": "divert" }).ok).toBe(false);
    expect(engine.validate(s0, { "D-55": "locker" }).ok).toBe(false);
  });

  it("INV-17 los picos caen en mayo, agosto, noviembre y diciembre con magnitud en [1.3, 2.5]", () => {
    expect([...new Set(params.peaks.map((p) => p.month))].sort((a, b) => a - b)).toEqual([4, 7, 10, 11]);
    for (let seed = 1; seed <= 20; seed++) {
      const { reports } = playGame(engine, sto("megalopolis", seed, { test: { events: "off" } }));
      reports.forEach((r, e) => {
        const peakDays = r.tickMetrics.filter((m) => m.peak! > 0);
        if ([4, 7, 10, 11].includes(e % 12)) expect(peakDays.length).toBeGreaterThan(0);
        else expect(peakDays).toHaveLength(0);
        for (const m of peakDays) {
          expect(m.peak).toBeGreaterThanOrEqual(params.peakMagnitude.min);
          expect(m.peak).toBeLessThanOrEqual(params.peakMagnitude.max);
        }
      });
    }
  });
});
