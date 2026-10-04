/** LOG-REG y LOG-EVT (P1): umbrales de reglas, eventos y cadenas causales (casos de prueba §6–§7). */
import { describe, expect, it } from "vitest";
import { events } from "../src/events.ts";
import { rules } from "../src/rules.ts";
import { params } from "../src/model.ts";
import type { LmState, TerritoryId } from "../src/types.ts";
import { det, engine, fakeCtx, oneEpoch, run, start, sumMetric, withOverrides } from "./helpers/run.ts";

const rule = (id: string) => rules.find((r) => r.id === id)!;
const event = (id: string) => events.find((e) => e.id === id)!;
const model = (t: TerritoryId) => structuredClone(start(det(t)).model) as LmState;
const fired = (r: { rulesFired: { id: string }[] }, id: string) => r.rulesFired.some((f) => f.id === id);
const forced = (id: string, epoch = 0, tick = 0, severity = 1) => ({ test: { forcedEvents: [{ id, epoch, tick, severity }] } });
/** Estado al inicio de la época e (decisiones as-is, sin eventos). */
const at = (t: TerritoryId, e: number, o = {}) => run(start(det(t, o)), e).state;

describe("LOG-REG (P1)", () => {
  it("REG-01 R-01: rutas con frescos > 3 h sin frío disparan la regla; con hieleras no; el día siguiente λ ×1.3 y con calor ×2", () => {
    expect(rule("R-01").when(fakeCtx(model("megalopolis")))).toBe(false);
    const s = model("megalopolis");
    s.flags.r01 = true;
    expect(rule("R-01").when(fakeCtx(s))).toBe(true);
    const asIs = oneEpoch("megalopolis");
    expect(asIs.tickMetrics[0]!.freshRouteHours).toBeGreaterThan(3);
    expect(fired(asIs, "R-01")).toBe(true);
    expect(fired(oneEpoch("megalopolis", { "dec.cold": "coolers" }), "R-01")).toBe(false);
    // Efecto en la tasa: p = 1 − e^(−λx) ⇒ con λ' = k·λ, 1 − p' = (1 − p)^k (zona por zona; en total, cota).
    const p = (r: typeof asIs) => r.tickMetrics[0]!.spoiled! / r.tickMetrics[0]!.freshTotal!;
    const base = p(asIs);
    const flagged = p(oneEpoch("megalopolis", { "flags.r01": true }));
    expect(flagged).toBeGreaterThan(base);
    expect(flagged).toBeLessThanOrEqual(1 - (1 - base) ** 1.3 + 1e-9);
    const hot = p(run(start(det("norte", forced("X-12"))), 1).reports[0]!);
    const cool = p(oneEpoch("norte"));
    expect(hot).toBeGreaterThan(cool * 1.5);
  });

  it("REG-02 R-02: 2.9% semanal no dispara; 3.1% dispara y al día siguiente baja CSAT y OSA de tienda", () => {
    const week = (spoiled: number) => oneEpoch("bajio", { day: 6, weekFresh: 1e9, weekSpoiled: spoiled * 1e9 });
    const below = week(0.029);
    const above = week(0.031);
    expect(below.tickMetrics[0]!.storeOsa).toBe(params.nodes.store.osaBase);
    expect(below.tickMetrics[1]!.storeOsa).toBe(params.nodes.store.osaBase);
    expect(above.tickMetrics[1]!.storeOsa).toBeCloseTo(params.nodes.store.osaBase - 0.02, 12);
    expect(above.tickMetrics[1]!.dayCsat).toBeLessThan(below.tickMetrics[1]!.dayCsat!);
    expect(fired(above, "R-02")).toBe(true);
  });

  it("REG-03 R-03: ventana de todo el día con presencia baja ⇒ FADS < 80% y alerta; con presencia media no", () => {
    const meg = oneEpoch("megalopolis");
    const baj = oneEpoch("bajio");
    expect(meg.kpis.FADS).toBeLessThan(0.8);
    expect(fired(meg, "R-03")).toBe(true);
    expect(baj.kpis.FADS).toBeGreaterThanOrEqual(0.8);
    expect(fired(baj, "R-03")).toBe(false);
  });

  it("REG-04 R-04: express con baja densidad alerta; con densidad alta y vehículo chico no", () => {
    const express = { "dec.levels": { express: true, sameday: false, nextday: true, standard: false } };
    expect(fired(oneEpoch("norte", { ...express, "dec.darkStores": 1 }), "R-04")).toBe(true);
    const dense = oneEpoch("megalopolis", { ...express, "dec.mfc": 3, "dec.vehicle": "moto", "dec.assignment": "threshold" });
    expect(fired(dense, "R-04")).toBe(false);
  });

  it("REG-05 R-05: en el tope la OSA de tienda no cambia; sobre el tope baja en proporción al exceso", () => {
    const osa = (sfsCap: number) => {
      // Una tienda por zona surte todo su volumen: las horas de picking superan topes bajos.
      const r = oneEpoch("megalopolis", { "dec.sfs": { share: 0.25, pickers: "6" }, "dec.assignment": "nearest", "dec.sfsCap": sfsCap });
      const m = r.tickMetrics[0]!;
      const used = m.storeHours! / (m.storeCapHours! / sfsCap);
      return { osa: m.storeOsa!, excess: Math.max(0, used - sfsCap), r };
    };
    const atCap = osa(0.5);
    expect(atCap.excess).toBe(0);
    expect(atCap.osa).toBe(params.nodes.store.osaBase);
    const a = osa(0.15);
    const b = osa(0.05);
    expect(a.excess).toBeGreaterThan(0);
    expect((params.nodes.store.osaBase - b.osa) / (params.nodes.store.osaBase - a.osa)).toBeCloseTo(b.excess / a.excess, 9);
    expect(fired(b.r, "R-05")).toBe(true);
  });

  it("REG-06 R-06: sin holgura en Navidad el backlog se arrastra ≥ 3 días y el OTD p95 < 80%; con holgura ≥ 10% la promesa absorbe el pico", () => {
    const s = at("megalopolis", 11);
    const none = run(s, 1).reports[0]!;
    const buffered = run(withOverrides(s, { "dec.buffer": 0.1 }), 1).reports[0]!;
    const carriedDays = none.tickMetrics.filter((m) => m.backlogOut! > 0.01 * m.orders!).length;
    expect(carriedDays).toBeGreaterThanOrEqual(3);
    expect(none.kpis.OTD_P95).toBeLessThan(0.8);
    expect(fired(none, "R-06")).toBe(true);
    expect(fired(buffered, "R-06")).toBe(false);
    expect(buffered.kpis.OTD_P95).toBeGreaterThan(none.kpis.OTD_P95!);
  });

  it("REG-08 R-08: IA de ruteo o de asignación con datos básicos dispara el aviso", () => {
    const s = model("megalopolis");
    s.dec.routing = "ai";
    expect(rule("R-08").when(fakeCtx(s))).toBe(true);
    s.dec.data = "gps";
    expect(rule("R-08").when(fakeCtx(s))).toBe(false);
    s.dec.routing = "vrptw";
    s.dec.assignment = "ai";
    s.dec.data = "basic";
    expect(rule("R-08").when(fakeCtx(s))).toBe(true);
  });

  it("REG-12 R-12: el promedio del mes oculta días con OTD < 70% que el p95 sí muestra", () => {
    const dec = run(at("megalopolis", 11), 1).reports[0]!;
    expect(Math.min(...dec.tickMetrics.map((m) => m.dayOtd!))).toBeLessThan(0.7);
    expect(dec.kpis.OTD).toBeGreaterThan(0.75);
    expect(fired(dec, "R-12")).toBe(true);
    expect(fired(run(withOverrides(at("megalopolis", 11), { "dec.report": "p95" }), 1).reports[0]!, "R-12")).toBe(false);
  });

  it("REG-13 R-13: en contingencia la flota de combustión pierde 20% de capacidad; la eléctrica no", () => {
    const van = run(start(det("megalopolis", forced("X-04"))), 1).reports[0]!;
    const ev = run(withOverrides(start(det("megalopolis", forced("X-04"))), { "dec.vehicle": "ev" }), 1).reports[0]!;
    expect(van.tickMetrics[0]!.restrictedCut).toBe(params.events["X-04"].capacityCut);
    expect(ev.tickMetrics[0]!.restrictedCut).toBe(0);
    const base = oneEpoch("megalopolis").tickMetrics[0]!;
    expect(van.tickMetrics[0]!.available! / base.available!).toBeCloseTo(1 - params.events["X-04"].capacityCut, 9);
    expect(fired(van, "R-13")).toBe(true);
    expect(fired(ev, "R-13")).toBe(false);
  });
});

describe("LOG-EVT (P1)", () => {
  const pAt = (t: TerritoryId, id: string, epoch: number) => {
    const s = model(t);
    s.epoch = epoch;
    return event(id).pBase({ ...fakeCtx(s), epoch } as never);
  };
  const months = (t: TerritoryId, id: string) => Array.from({ length: 12 }, (_, m) => m).filter((m) => pAt(t, id, m) > 0);

  it("EVT-02 estacionalidad: inundación solo jun–sep en Megalópolis; calor solo may–ago en Norte; contingencia solo en temporada seca", () => {
    expect(months("megalopolis", "X-02")).toEqual([5, 6, 7, 8]);
    expect(months("bajio", "X-02")).toEqual([]);
    expect(months("norte", "X-12")).toEqual([4, 5, 6, 7]);
    expect(months("megalopolis", "X-12")).toEqual([]);
    expect(months("megalopolis", "X-04")).toEqual(params.events["X-04"].months);
    expect(months("norte", "X-04")).toEqual([]);
  });

  it("EVT-03 los picos ocurren siempre en su mes; la magnitud cambia con la semilla", () => {
    const mags = new Set<number>();
    for (let seed = 1; seed <= 5; seed++) {
      const m = start(det("bajio", { seed })).model.peakMagnitude["0:buenfin"];
      expect(m).toBeDefined();
      mags.add(m!);
      const nov = run(start(det("bajio", { seed })), 11).reports[10]!;
      expect(nov.tickMetrics.filter((x) => x.peak! > 0).length).toBe(params.peaks.find((p) => p.id === "buenfin")!.days);
    }
    expect(mags.size).toBe(5);
  });

  it("EVT-04 contingencia forzada: solo la flota de combustión pierde capacidad (camioneta vs. eléctrica)", () => {
    const fleet = (vehicle: string) => run(withOverrides(start(det("megalopolis", forced("X-04"))), { "dec.vehicle": vehicle }), 1).reports[0]!.tickMetrics[0]!;
    expect(fleet("van").restrictedCut).toBeGreaterThan(0);
    expect(fleet("reefer").restrictedCut).toBeGreaterThan(0);
    expect(fleet("ev").restrictedCut).toBe(0);
    expect(fleet("moto").restrictedCut).toBe(0);
  });

  it("EVT-08 cadena: calor + rutas > 3 h sin frío ⇒ R-01 → spoilage ↑ → R-02 → OSA de tienda ↓", () => {
    const s = at("norte", 5);
    const heat = { forcedEvents: [0, 1, 2].map((tick) => ({ id: "X-12", epoch: 5, tick, severity: 1 })) };
    const hit = run({ ...s, config: { ...s.config, test: { ...s.config.test, ...heat } } }, 1).reports[0]!;
    const base = run(s, 1).reports[0]!;
    expect(fired(hit, "R-01")).toBe(true);
    expect(hit.kpis.SPOIL_RATE).toBeGreaterThan(base.kpis.SPOIL_RATE!);
    expect(fired(hit, "R-02")).toBe(true);
    expect(Math.min(...hit.tickMetrics.map((m) => m.storeOsa!))).toBeLessThan(params.nodes.store.osaBase);
  });

  it("EVT-09 cadena: pico viral sin tope de capacidad ⇒ R-06 → CSAT ↓ → menos pedidos el mes siguiente", () => {
    const viral = { forcedEvents: [{ id: "X-05", epoch: 0, tick: 2, severity: 1 }] };
    const hit = run(start(det("megalopolis", { test: viral })), 2).reports;
    const base = run(start(det("megalopolis")), 2).reports;
    expect(fired(hit[0]!, "R-06")).toBe(true);
    expect(hit[0]!.kpis.CSAT).toBeLessThan(base[0]!.kpis.CSAT!);
    expect(hit[1]!.kpis.ORDERS).toBeLessThan(base[1]!.kpis.ORDERS!);
  });

  it("EVT-11 un evento forzado es determinista", () => {
    const cfg = det("norte", forced("X-08", 0, 4, 0.7));
    expect(run(start(cfg), 1).reports[0]).toEqual(run(start(cfg), 1).reports[0]);
    expect(sumMetric(run(start(cfg), 1).reports[0]!, "robberyCost")).toBe(params.events["X-08"].cost);
  });

  it("EVT-12 los drivers del mensaje coinciden con los modificadores activos", () => {
    const msg = (o: Record<string, unknown>) => run(withOverrides(start(det("bajio", forced("X-01"))), o), 1).reports[0]!.messages.find((m) => m.source === "X-01")!;
    const asIs = msg({});
    expect(asIs.drivers.map((d) => d.label).sort()).toEqual(["mantenimiento correctivo", "sin equipo de frío"]);
    expect(asIs.mitigations).toEqual([]);
    const good = msg({ "dec.cold": "reefer", "dec.maintenance": "preventive", "dec.loadSeq": "fresh_first" });
    expect(good.drivers).toEqual([]);
    expect(good.mitigations.map((d) => d.label).sort()).toEqual(["frescos primero en la ruta", "vehículo refrigerado o multi-temperatura"]);
    expect(engine.model.events.map((e) => e.id)).toEqual(Array.from({ length: 15 }, (_, i) => `X-${String(i + 1).padStart(2, "0")}`));
  });
});
