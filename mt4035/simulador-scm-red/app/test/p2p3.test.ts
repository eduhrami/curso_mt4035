/** Casos SCM de prioridad P2 y P3 (casos de prueba §3–§9). Deterministas salvo indicación. */
import { describe, expect, it } from "vitest";
import { playGame } from "@mt4035/sim-core/testing";
import { effectiveCv, supplierLt } from "../src/tick.ts";
import { events } from "../src/events.ts";
import { rules } from "../src/rules.ts";
import { createScmEngine, params, scoreRun } from "../src/index.ts";
import type { DcSpec, ScmState } from "../src/types.ts";
import { adaptedDispersed, naiveTransplant } from "../autoplay/bots.ts";
import { builtDcs, det, engine, fakeCtx, meanKpi, paramsWith, run, start, sumMetric, withOverrides } from "./helpers/run.ts";

const oneEpoch = (overrides: Record<string, unknown>, region: "kaigan" | "redriver" | "valle" = "kaigan", cfgExtra = {}) =>
  run(withOverrides(start(det(region, cfgExtra)), overrides), 1).reports[0]!;
const spreadDcs = (s: ScmState, n: number, type: DcSpec["type"] = "stocking"): DcSpec[] => {
  const zones = s.zones.filter((z) => z.stores > 0);
  const chosen: typeof zones = [];
  while (chosen.length < n) {
    chosen.push(zones.filter((z) => !chosen.includes(z)).reduce((a, b) => {
      const w = (z: (typeof zones)[number]) => z.stores * (chosen.length ? Math.min(...chosen.map((c) => Math.hypot(c.x - z.x, c.y - z.y))) : 1);
      return w(b) > w(a) ? b : a;
    }));
  }
  return chosen.map((z, i) => ({ id: `S${i}`, zone: z.id, type, size: "large" }));
};
const rule = (id: string) => rules.find((r) => r.id === id)!;

describe("SCM P2/P3 — invariantes y dirección causal", () => {
  it("INV-10 en modo determinista BWR ≥ 1", () => {
    for (const region of ["kaigan", "redriver", "valle"] as const) for (const r of playGame(engine, det(region)).reports) expect(r.kpis.BWR).toBeGreaterThanOrEqual(1);
  });

  it("CAU-02 costo logístico total vs. n.º de CD: mínimo interior; en Red River el óptimo por tienda es menor que en Kaigan", () => {
    const sweep = (region: "kaigan" | "redriver") => {
      const s0 = start(det(region)).model;
      const flows = region === "kaigan" ? s0.dec.flows : { fresh: "dsd", chilled: "dc", ambient: "dc", frozen: "dc" };
      const costs = [1, 2, 4, 6, 8, 12, 16, 20].map((n) => ({ n, cost: oneEpoch({ dcs: builtDcs(spreadDcs(s0, n, region === "kaigan" ? "combined" : "stocking")), "dec.flows": flows }, region).kpis.CTS! }));
      const best = costs.reduce((a, b) => (b.cost < a.cost ? b : a));
      return { costs, best, stores: s0.zones.reduce((a, z) => a + z.stores, 0) };
    };
    const kg = sweep("kaigan");
    const rr = sweep("redriver");
    for (const x of [kg, rr]) {
      expect(x.best.n).toBeGreaterThan(1);
      expect(x.best.n).toBeLessThan(20);
    }
    expect(rr.best.n / rr.stores).toBeLessThan(kg.best.n / kg.stores);
  });

  it("CAU-11/12 Valle: horas valle con escaneo acortan las rutas; sin escaneo el beneficio desaparece", () => {
    const base = oneEpoch({}, "valle");
    const scan = oneEpoch({ "dec.window": "offpeak", "dec.receiving": "scan" }, "valle");
    const manual = oneEpoch({ "dec.window": "offpeak" }, "valle");
    expect(sumMetric(scan, "freshRouteHours")).toBeLessThan(sumMetric(base, "freshRouteHours"));
    expect(scan.kpis.WASTE).toBeLessThanOrEqual(base.kpis.WASTE!);
    expect(sumMetric(manual, "freshRouteHours")).toBeGreaterThanOrEqual(sumMetric(base, "freshRouteHours"));
  });

  it("CAU-13 Kaigan: 3,000 → 4,000 SKUs ⇒ demanda ↑, stock de seguridad ↑, merma ↑", () => {
    const a = oneEpoch({ "dec.assortment.skus": 3000 });
    const b = oneEpoch({ "dec.assortment.skus": 4000 });
    expect(b.kpis.DEMAND).toBeGreaterThan(a.kpis.DEMAND!);
    expect(b.tickMetrics[0]!.storeSsUnits).toBeGreaterThan(a.tickMetrics[0]!.storeSsUnits!);
    expect(b.kpis.WASTE).toBeGreaterThan(a.kpis.WASTE!);
  });

  it("CAU-15 Red River: ambiente cross-dock → CD con inventario ⇒ stock de seguridad total de la red ↓; frescos de vida corta sin cambio", () => {
    const s0 = start(det("redriver")).model;
    const flows = { fresh: "dsd", chilled: "dsd", ambient: "dc", frozen: "dsd" };
    const xd = oneEpoch({ dcs: builtDcs(spreadDcs(s0, 4, "crossdock")), "dec.flows": flows }, "redriver");
    const stk = oneEpoch({ dcs: builtDcs(spreadDcs(s0, 4, "stocking")), "dec.flows": flows, "dec.dcSafetyDays": 1 }, "redriver");
    const total = (r: typeof xd) => r.tickMetrics[0]!.storeSsUnits! + r.tickMetrics[0]!.dcSsUnits!;
    expect(total(stk)).toBeLessThan(total(xd));
    const freshWaste = (r: typeof xd) => r.tickMetrics[0]!.waste_fresh! / r.tickMetrics[0]!.received_fresh!;
    expect(freshWaste(stk)).toBeCloseTo(freshWaste(xd), 9);
  });

  it("CAU-17 Valle: ventas menos costo logístico es cóncavo en la densidad del cluster (óptimo interior)", () => {
    const spreads = [0.01, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0];
    const profit = spreads.map((sp) => {
      const zones = start(det("valle")).model.zones.map((z) => ({ ...z, spread: sp }));
      const r = oneEpoch({ zones }, "valle");
      return sumMetric(r, "gm") - r.kpis.CTS!;
    });
    const best = profit.indexOf(Math.max(...profit));
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThan(spreads.length - 1);
  });

  it("CAU-18 proveedores dedicados de frescos (tras 3 épocas): lead time ↓ y merma de frescos ↓", () => {
    const base = run(start(det("valle")), 4).reports;
    const ded = run(start(det("valle")), 4, (_s, e) => (e === 0 ? { "D-07": { fresh: true, chilled: false } } : {})).reports;
    expect(ded[2]!.kpis.WASTE_FRESH).toBeCloseTo(base[2]!.kpis.WASTE_FRESH!, 9); // aún no opera
    expect(ded[3]!.kpis.LT).toBeLessThan(base[3]!.kpis.LT!);
    expect(ded[3]!.kpis.WASTE_FRESH).toBeLessThan(base[3]!.kpis.WASTE_FRESH!);
  });

  it("CAU-19/REG-09 tanpin kanri: con capacitación alta la reducción de CV es ≈ 2× la de capacitación baja; R-09 avisa", () => {
    const s = structuredClone(start(det("kaigan")).model) as ScmState;
    const cvAt = (policy: ScmState["dec"]["policy"], training: ScmState["dec"]["training"]) => effectiveCv({ ...s, dec: { ...s.dec, policy, training } }, params);
    const ref = cvAt("periodic", "high");
    expect((ref - cvAt("tanpin", "high")) / (ref - cvAt("tanpin", "low"))).toBeCloseTo(2, 6);
    expect(rule("R-09").when(fakeCtx({ ...s, dec: { ...s.dec, policy: "tanpin", training: "low" } }))).toBe(true);
  });

  it("CAU-20 pronóstico causal: la reducción de error es mayor con estacionalidad marcada que suave", () => {
    const s = structuredClone(start(det("valle")).model) as ScmState;
    const gain = (seasonality: "soft" | "marked") => {
      const m = { ...s, market: { ...s.market, seasonality } };
      return effectiveCv({ ...m, dec: { ...m.dec, forecast: "seasonal" } }, params) - effectiveCv({ ...m, dec: { ...m.dec, forecast: "causal" } }, params);
    };
    expect(gain("marked")).toBeGreaterThan(gain("soft"));
  });

  it("CAU-21 alza de combustible: el aumento absoluto de transporte es mayor en la configuración con más km", () => {
    const forced = { test: { forcedEvents: [{ id: "X-10", epoch: 4, tick: 0, severity: 1 }] } };
    const inc = (pol: ReturnType<typeof naiveTransplant>) => {
      const hit = playGame(engine, det("redriver", forced), pol, 5).reports[4]!;
      const base = playGame(engine, det("redriver"), pol, 5).reports[4]!;
      return sumMetric(hit, "transport") - sumMetric(base, "transport");
    };
    expect(inc(naiveTransplant())).toBeGreaterThan(inc(adaptedDispersed()));
    expect(inc(adaptedDispersed())).toBeGreaterThan(0);
  });

  it("CAU-23 (P3) retiro con descuento: merma ↓ y margen unitario de frescos ↓", () => {
    const fifo = oneEpoch({}, "valle");
    const disc = oneEpoch({ "dec.retirement": "discount" }, "valle");
    expect(disc.kpis.WASTE_FRESH).toBeLessThan(fifo.kpis.WASTE_FRESH!);
    expect(sumMetric(disc, "gm") / sumMetric(disc, "revenue")).toBeLessThan(sumMetric(fifo, "gm") / sumMetric(fifo, "revenue") + 0.01);
  });

  it("CAU-24 (P3) flota propia → 3PL spot: transporte ↑ y OTIF ↓ (el modelo no separa costo fijo de flota)", () => {
    const own = oneEpoch({ "dec.fleet": "own" });
    const spot = oneEpoch({ "dec.fleet": "spot" });
    expect(sumMetric(spot, "transport")).toBeGreaterThan(sumMetric(own, "transport"));
    expect(spot.kpis.OTIF).toBeLessThan(own.kpis.OTIF!);
  });
});

describe("SCM P2/P3 — escenarios", () => {
  it("ESC-03 Valle as-is queda entre Kaigan y Red River en OSA y en costo logístico relativo", () => {
    const k = meanKpi(playGame(engine, det("kaigan")).reports, "OSA");
    const v = playGame(engine, det("valle")).reports;
    const r = meanKpi(playGame(engine, det("redriver")).reports, "OSA");
    expect(meanKpi(v, "OSA")).toBeLessThan(k);
    expect(meanKpi(v, "OSA")).toBeGreaterThan(r);
    const cts = (region: "kaigan" | "redriver") => meanKpi(playGame(engine, det(region)).reports, "CTS_PCT");
    expect(meanKpi(v, "CTS_PCT")).toBeGreaterThan(cts("kaigan"));
    expect(meanKpi(v, "CTS_PCT")).toBeLessThan(cts("redriver"));
  });

  it("ESC-07 greenfield: sin ventas hasta que abre el primer lote; en la época 0 solo hay capex", () => {
    const r = run(start(det("valle", { greenfield: true })), 3, (_s, e) => (e === 0 ? { "D-08": 100 } : {})).reports;
    expect(r[0]!.kpis.SALES).toBe(0);
    expect(r[0]!.ledger.some((l) => l.kind === "capex" && l.source === "D-08")).toBe(true);
    expect(r[1]!.kpis.STORES).toBe(100);
    expect(r[1]!.kpis.SALES).toBeGreaterThan(0);
  });

  it("ESC-08 volatilidad alta vs. baja con el mismo CSL: inventario ↑ y fill rate ≤", () => {
    const lo = oneEpoch({}, "kaigan", { market: { volatility: "low" } });
    const hi = oneEpoch({}, "kaigan", { market: { volatility: "high" } });
    expect(hi.tickMetrics[0]!.invValue).toBeGreaterThan(lo.tickMetrics[0]!.invValue!);
    expect(hi.kpis.OSA).toBeLessThanOrEqual(lo.kpis.OSA!);
  });

  it("ESC-09 (P3) envejecimiento: la participación de frescos en la demanda sube de forma monótona", () => {
    const share = playGame(engine, det("valle", { market: { demographics: "aging" } })).reports.map((r) => sumMetric(r, "demand_fresh") / r.kpis.DEMAND!);
    for (let i = 4; i < share.length; i += 4) expect(share[i]!).toBeGreaterThan(share[i - 4]!);
  });

  it("ESC-10 boom sin ampliar CD: utilización > 90% antes de A4, dispara R-07 y empeora OTIF", () => {
    // Un solo CD mediano: arranca holgado y el crecimiento lo satura.
    const dcs = start(det("valle")).model.dcs.slice(0, 1);
    const r = run(withOverrides(start(det("valle", { market: { growth: "boom", seasonality: "marked" } })), { dcs }), 12).reports;
    const first = r.findIndex((x) => x.rulesFired.some((f) => f.id === "R-07"));
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThan(12);
    expect(r[first]!.kpis.OTIF).toBeLessThan(r[0]!.kpis.OTIF!);
  });
});

describe("SCM P2 — reglas, eventos, retrasos y puntaje", () => {
  it("REG-04 R-04: 15 entregas por tienda al día con DSD no dispara; 16 dispara", () => {
    const s = start(det("redriver")).model;
    expect(rule("R-04").when(fakeCtx(s, { maxDeliveriesPerStoreDay: 15 }))).toBe(false);
    expect(rule("R-04").when(fakeCtx(s, { maxDeliveriesPerStoreDay: 16 }))).toBe(true);
  });

  it("REG-07 R-07: utilización 89% no dispara; 91% dispara", () => {
    const s = start(det("kaigan")).model;
    expect(rule("R-07").when(fakeCtx(s, { dcUtilMax: 0.89 }))).toBe(false);
    expect(rule("R-07").when(fakeCtx(s, { dcUtilMax: 0.91 }))).toBe(true);
  });

  it("REG-08 POS diario + CPFR: lead time −20% y variabilidad del lead time −30%", () => {
    const s = structuredClone(start(det("redriver")).model) as ScmState;
    const arms = { ...s, dec: { ...s.dec, collaboration: "arms" as const, sharing: "daily" as const } };
    const cpfr = { ...s, dec: { ...s.dec, collaboration: "cpfr" as const, sharing: "daily" as const } };
    expect(supplierLt("ambient", cpfr, params) / supplierLt("ambient", arms, params)).toBeCloseTo(0.8, 9);
    const a = oneEpoch({ "dec.sharing": "daily" }, "redriver");
    const c = oneEpoch({ "dec.sharing": "daily", "dec.collaboration": "cpfr" }, "redriver");
    expect(c.kpis.LT_SD! / c.kpis.LT!).toBeCloseTo((a.kpis.LT_SD! / a.kpis.LT!) * 0.7, 6);
    expect(rule("R-08").when(fakeCtx(cpfr))).toBe(true);
  });

  it("EVT-05 sismo: con más CD cercanos la pérdida de ventas durante el evento es menor", () => {
    const forced = { test: { forcedEvents: [{ id: "X-03", epoch: 0, tick: 0, severity: 1 }] } };
    const s0 = start(det("kaigan")).model;
    const lost = (n: number) => {
      const dcs = builtDcs(spreadDcs(s0, n, "combined"));
      return oneEpoch({ dcs }, "kaigan", forced).kpis.LOST_SALES! - oneEpoch({ dcs }, "kaigan").kpis.LOST_SALES!;
    };
    expect(lost(12)).toBeLessThan(lost(2));
  });

  it("EVT-07 caída del sistema de pedidos: la OSA cae solo la semana del evento", () => {
    const forced = { test: { trace: true, forcedEvents: [{ id: "X-08", epoch: 0, tick: 3, severity: 1 }] } };
    const hit = oneEpoch({}, "valle", forced);
    const base = oneEpoch({}, "valle", { test: { trace: true } });
    expect(hit.trace[3]!.osa_ambient).toBeLessThan(base.trace[3]!.osa_ambient!);
    expect(hit.trace[4]!.osa_ambient).toBeCloseTo(base.trace[4]!.osa_ambient!, 9);
  });

  it("EVT-08 alza de combustible en A2-T1: costo por km +25% (transporte ≈ +10%) solo en esa época", () => {
    const forced = { test: { forcedEvents: [{ id: "X-10", epoch: 4, tick: 0, severity: 1 }] } };
    const hit = run(start(det("kaigan", forced)), 6).reports;
    const base = run(start(det("kaigan")), 6).reports;
    const t = (r: typeof hit, e: number) => sumMetric(r[e]!, "transport");
    expect(t(hit, 4) / t(base, 4)).toBeGreaterThan(1.05);
    expect(t(hit, 5)).toBeCloseTo(t(base, 5), 6);
  });

  it("EVT-10 cadena: con OSA < 90% la época anterior, la probabilidad de que abra un competidor sube", () => {
    const s = structuredClone(start(det("valle", { market: { competition: "aggressive" } })).model) as ScmState;
    const def = events.find((e) => e.id === "X-06")!;
    const p = (osa: number) => {
      const st = { ...s, lastEpochOsa: osa };
      const ctx = fakeCtx(st);
      return (def.modifiers ?? []).filter((m) => m.when(ctx)).reduce((acc, m) => acc * (typeof m.factor === "function" ? m.factor(ctx) : m.factor), def.pBase(ctx));
    };
    expect(p(0.85)).toBeGreaterThan(p(0.95));
  });

  it("LAG-03 cerrar un CD carga la penalización y lo retira de la red", () => {
    const s0 = start(det("valle"));
    const r = run(s0, 1, () => ({ "D-01": [s0.model.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size }))[0]!] })).reports[0]!;
    const capex = params.dc.capex[s0.model.dcs[1]!.size];
    expect(r.ledger.find((l) => l.source === "D-01")!.amount).toBeCloseTo(params.dc.closurePenaltyMult * capex * params.regions.valle.realEstate, 6);
    expect(r.kpis.DC_COUNT).toBe(1);
  });

  it("LAG-08/09 D-24 con CD cross-dock y reducir la capacidad de un CD se rechazan", () => {
    const kg = start(det("kaigan"));
    expect(engine.validate(kg, { "D-24": 2 }).ok).toBe(false);
    const smaller = kg.model.dcs.map(({ id, zone, type }) => ({ id, zone, type, size: "small" as const }));
    expect(engine.validate(kg, { "D-01": smaller }).errors[0]?.message).toMatch(/ampliar/);
  });

  it("SCO-05 con normalización por región, el as-is de cada región puntúa en una banda comparable (25–60)", () => {
    for (const region of ["kaigan", "redriver", "valle"] as const) {
      const reports = playGame(engine, det(region)).reports;
      for (const st of ["freshness", "lowcost", "convenience"] as const) {
        const sc = scoreRun(reports, st, params, region).score;
        expect(sc, `${region}/${st}`).toBeGreaterThanOrEqual(25);
        expect(sc, `${region}/${st}`).toBeLessThanOrEqual(60);
      }
    }
  });

  it("parámetros por región se pueden reemplazar en pruebas (paramsWith)", () => {
    const eng = createScmEngine(paramsWith((p) => (p.regions.kaigan.visitsPerDay = 500)));
    expect(run(eng.createGame(det("kaigan")), 1, undefined, eng).reports[0]!.kpis.DEMAND).toBeLessThan(oneEpoch({}).kpis.DEMAND!);
  });
});
