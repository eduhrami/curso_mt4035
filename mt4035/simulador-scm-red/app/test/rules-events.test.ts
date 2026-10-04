/** SCM-REG y SCM-EVT (P1): umbrales de reglas y eventos (casos de prueba §6–§7). */
import { describe, expect, it } from "vitest";
import { events } from "../src/events.ts";
import { rules } from "../src/rules.ts";
import { params } from "../src/model.ts";
import type { ScmState } from "../src/types.ts";
import { det, engine, fakeCtx, run, start, withOverrides } from "./helpers/run.ts";

const rule = (id: string) => rules.find((r) => r.id === id)!;
const event = (id: string) => events.find((e) => e.id === id)!;
const kaigan = () => structuredClone(start(det("kaigan")).model) as ScmState;

describe("SCM-REG (P1)", () => {
  it("REG-01 R-01: 3.9 h no dispara; 4.1 h dispara y multiplica la pérdida en ruta de frescos ×1.5", () => {
    expect(rule("R-01").when(fakeCtx(kaigan(), { freshRouteHours: 3.9 }))).toBe(false);
    const s = kaigan();
    const ctx = fakeCtx(s, { freshRouteHours: 4.1 });
    expect(rule("R-01").when(ctx)).toBe(true);
    rule("R-01").apply(ctx);
    expect(s.flags.r01).toBe(true);
    // Efecto: con la bandera activa, la pérdida en ruta (excursion) de la primera semana es 1.5× mayor.
    const off = run(start(det("kaigan")), 1).reports[0]!.tickMetrics[0]!;
    const on = run(withOverrides(start(det("kaigan")), { "flags.r01": true }), 1).reports[0]!.tickMetrics[0]!;
    expect(on.excursion! / off.excursion!).toBeCloseTo(params.excursion.longRouteMult, 6);
  });

  it("REG-02 R-02: merma 5.9% no dispara; 6.1% dispara y la OSA de la categoría cae la semana siguiente", () => {
    const s = kaigan();
    const zi = s.zones.findIndex((z) => z.stores > 0);
    s.lastWaste.fresh[zi] = 0.059;
    expect(rule("R-02").when(fakeCtx(s))).toBe(false);
    s.lastWaste.fresh[zi] = 0.061;
    const ctx = fakeCtx(s);
    expect(rule("R-02").when(ctx)).toBe(true);
    rule("R-02").apply(ctx);
    expect(s.flags.r02.fresh[zi]).toBe(true);
    expect(s.flags.r02.ambient.some(Boolean)).toBe(false);
    // Efecto en la zona marcada (el trace guarda la última zona con tiendas).
    const last = s.zones.map((z) => z.stores > 0).lastIndexOf(true);
    const base = run(start(det("kaigan", { test: { trace: true } })), 1).reports[0]!;
    const hit = run(withOverrides(start(det("kaigan", { test: { trace: true } })), { [`flags.r02.fresh.${last}`]: true }), 1).reports[0]!;
    expect(hit.trace[0]!.osa_fresh! / base.trace[0]!.osa_fresh!).toBeCloseTo(params.inventory.r02OsaMult, 6);
    expect(hit.trace[1]!.osa_fresh).toBeCloseTo(base.trace[1]!.osa_fresh!, 9); // la bandera dura una semana
  });

  it("REG-03 R-03: una semana bajo 90% no afecta; dos seguidas bajan la confianza; la recuperación es más lenta que la caída", () => {
    const s = kaigan();
    s.zones[0]!.lowOsaWeeks = 1;
    expect(rule("R-03").when(fakeCtx(s))).toBe(false);
    s.zones[0]!.lowOsaWeeks = 2;
    const ctx = fakeCtx(s);
    expect(rule("R-03").when(ctx)).toBe(true);
    rule("R-03").apply(ctx);
    expect(s.zones[0]!.trust).toBeCloseTo(1 - params.trust.drop, 12);
    expect(params.trust.recover).toBeLessThan(params.trust.drop);
    // Integración: Red River con CSL bajo pierde confianza; al corregir, recuperarla tarda más que perderla.
    const low = { fresh: 0.85, chilled: 0.85, ambient: 0.85, frozen: 0.85 };
    const fix = { fresh: 0.99, chilled: 0.99, ambient: 0.99, frozen: 0.99 };
    const r = run(start(det("redriver")), 8, (_s, e) => (e === 0 ? { "D-21": low } : e === 2 ? { "D-21": fix, "D-31": "daily", "D-23": "scan" } : {}));
    const trust = r.reports.map((x) => x.kpis.TRUST!);
    const drop = 1 - trust[1]!;
    expect(drop).toBeGreaterThan(0);
    const recoveredAt = trust.findIndex((t, i) => i > 1 && t >= 1 - 1e-9);
    expect(recoveredAt === -1 || recoveredAt - 2 > 2).toBe(true);
  });

  it("REG-05 R-05: δ = 9.9 km no alerta; δ = 10.1 km con frescos 3×/día por CD alerta", () => {
    const s = kaigan();
    expect(rule("R-05").when(fakeCtx(s, { deltaDcMeanFresh: 9.9 }))).toBe(false);
    expect(rule("R-05").when(fakeCtx(s, { deltaDcMeanFresh: 10.1 }))).toBe(true);
    s.dec.freq.fresh = 14;
    expect(rule("R-05").when(fakeCtx(s, { deltaDcMeanFresh: 10.1 }))).toBe(false);
  });

  it("REG-06/EVT-06 R-06: una falla de proveedor pega más con cross-dock sin inventario que con CD con inventario", () => {
    const forced = { forcedEvents: [{ id: "X-04", epoch: 0, tick: 0, severity: 1 }] };
    const xdState = (ev: boolean) => start(det("kaigan", ev ? { test: forced } : {}));
    const stkState = (ev: boolean) =>
      withOverrides(start(det("kaigan", ev ? { test: forced } : {})), {
        dcs: start(det("kaigan")).model.dcs.map((d) => ({ ...d, type: "stocking", prevType: "stocking" })),
        "dec.dcSafetyDays": 3,
      });
    const drop = (mk: (ev: boolean) => ReturnType<typeof start>) => run(mk(false), 1).reports[0]!.kpis.OSA! - run(mk(true), 1).reports[0]!.kpis.OSA!;
    expect(drop(xdState)).toBeGreaterThan(drop(stkState));
    expect(drop(stkState)).toBeGreaterThanOrEqual(0);
    // R-06 avisa con proveedores poco confiables y cross-dock
    const low = start(det("kaigan", { market: { supplierReliability: "low" } }));
    expect(run(low, 1).reports[0]!.rulesFired.some((f) => f.id === "R-06")).toBe(true);
  });
});

describe("SCM-EVT (P1)", () => {
  it("EVT-03 estacionalidad del clima: tifón solo en T3 de Kaigan; nieve en T1/T4 de Red River; lluvia en T2/T3 de Valle", () => {
    const pAt = (region: "kaigan" | "redriver" | "valle", epoch: number) => {
      const s = structuredClone(start(det(region)).model) as ScmState;
      s.epoch = epoch;
      return event("X-02").pBase(fakeCtx(s));
    };
    expect([0, 1, 2, 3].map((e) => pAt("kaigan", e) > 0)).toEqual([false, false, true, false]);
    expect([0, 1, 2, 3].map((e) => pAt("redriver", e) > 0)).toEqual([true, false, false, true]);
    expect([0, 1, 2, 3].map((e) => pAt("valle", e) > 0)).toEqual([false, true, true, false]);
  });

  it("EVT-04 el sismo (X-03) tiene probabilidad 0 fuera de Kaigan", () => {
    for (const region of ["redriver", "valle"] as const) expect(event("X-03").pBase(fakeCtx(start(det(region)).model))).toBe(0);
    expect(event("X-03").pBase(fakeCtx(start(det("kaigan")).model))).toBeGreaterThan(0);
  });

  it("EVT-09 cadena: tres fallas de refrigeración seguidas ⇒ R-02 → R-03 y menos demanda la época siguiente", () => {
    const forced = [0, 1, 2].map((tick) => ({ id: "X-01", epoch: 0, tick, severity: 1 }));
    const hit = run(start(det("kaigan", { test: { forcedEvents: forced } })), 2).reports;
    const base = run(start(det("kaigan")), 2).reports;
    const fired = new Set(hit[0]!.rulesFired.map((f) => f.id));
    expect(fired.has("R-02")).toBe(true);
    expect(fired.has("R-03")).toBe(true);
    expect(hit[1]!.kpis.DEMAND).toBeLessThan(base[1]!.kpis.DEMAND!);
  });

  it("EVT-11 un evento forzado es determinista", () => {
    const cfg = det("valle", { test: { forcedEvents: [{ id: "X-11", epoch: 0, tick: 2, severity: 0.7 }] } });
    expect(run(start(cfg), 1).reports[0]).toEqual(run(start(cfg), 1).reports[0]);
  });

  it("EVT-12 los drivers del mensaje coinciden con los modificadores activos", () => {
    const forced = { forcedEvents: [{ id: "X-01", epoch: 0, tick: 0, severity: 0.5 }] };
    const kg = run(start(det("kaigan", { test: forced })), 1).reports[0]!.messages.find((m) => m.source === "X-01")!;
    expect(kg.drivers.map((d) => d.label)).toEqual([]);
    expect(kg.mitigations.map((d) => d.label).sort()).toEqual(["telemetría de temperatura", "vehículos multi-temperatura"]);
    const rr = run(start(det("redriver", { test: forced })), 1).reports[0]!.messages.find((m) => m.source === "X-01")!;
    expect(rr.drivers.map((d) => d.label)).toEqual(["flota con mantenimiento correctivo"]);
    expect(rr.mitigations).toEqual([]);
    expect(engine.model.events.map((e) => e.id)).toEqual(Array.from({ length: 12 }, (_, i) => `X-${String(i + 1).padStart(2, "0")}`));
  });
});
