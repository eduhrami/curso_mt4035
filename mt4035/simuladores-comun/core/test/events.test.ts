/** Eventos: forzados, desactivados, duración, mensajes y drivers (EVT genéricos). */
import { describe, expect, it } from "vitest";
import { createEngine } from "../src/engine.ts";
import { playGame } from "../src/testing.ts";
import { makeToyModel, toyConfig, toyParams } from "./fixtures/toy-model.ts";

const engine = createEngine(makeToyModel(), toyParams);

describe("eventos", () => {
  it("eventos off ⇒ ninguno, salvo los forzados", () => {
    const cfg = { ...toyConfig(1, { events: "off" }), test: { events: "off" as const, forcedEvents: [{ id: "X-01", epoch: 1, tick: 2, severity: 0.8 }] } };
    const all = playGame(engine, cfg).reports.flatMap((r) => r.events);
    expect(all).toEqual([expect.objectContaining({ id: "X-01", epoch: 1, tick: 2, severity: 0.8, forced: true })]);
  });

  it("un evento forzado es determinista: mismo impacto en dos corridas (EVT-11)", () => {
    const cfg = { ...toyConfig(9), test: { events: "off" as const, noise: 0, forcedEvents: [{ id: "X-01", epoch: 0, tick: 1, severity: 0.5 }] } };
    const a = engine.confirmEpoch(engine.createGame(cfg)).report;
    const b = engine.confirmEpoch(engine.createGame(cfg)).report;
    expect(a.tickMetrics[1]!.spoiled).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it("los drivers del mensaje coinciden con los modificadores activos (EVT-12)", () => {
    const forced = { events: "off" as const, forcedEvents: [{ id: "X-01", epoch: 0, tick: 0, severity: 0.5 }] };
    const sinRefri = engine.confirmEpoch(engine.createGame({ ...toyConfig(1), test: forced })).report.messages[0]!;
    expect(sinRefri.drivers.map((d) => d.label)).toEqual(["sin refrigerador"]);
    expect(sinRefri.mitigations).toEqual([]);

    let s = engine.createGame({ ...toyConfig(1), test: { events: "off" as const, forcedEvents: [{ id: "X-01", epoch: 1, tick: 0, severity: 0.5 }] } });
    s = engine.confirmEpoch(engine.stage(s, { "D-02": true }).state).state; // el refrigerador opera desde la época 1
    const conRefri = engine.confirmEpoch(s).report.messages.find((m) => m.source === "X-01")!;
    expect(conRefri.drivers).toEqual([]);
    expect(conRefri.mitigations.map((d) => d.label)).toEqual(["con refrigerador"]);
    expect(conRefri.severity).toBe("critico");
  });

  it("un evento con duración cruza ticks y épocas, y no se apila", () => {
    // X-02 dura 2 ticks; forzado en el último tick de la época 0 (5 ticks) ⇒ sigue activo en el tick 0 de la época 1.
    const cfg = { ...toyConfig(2), test: { events: "off" as const, noise: 0, forcedEvents: [{ id: "X-02", epoch: 0, tick: 4, severity: 1 }, { id: "X-02", epoch: 1, tick: 0, severity: 1 }] } };
    const s0 = engine.stage(engine.createGame(cfg), { "D-01": 3 }).state; // reposición holgada: sin faltantes ni pérdida de confianza
    const r0 = engine.confirmEpoch(s0);
    expect(r0.state.activeEvents).toEqual([expect.objectContaining({ id: "X-02", remaining: 1 })]);
    const r1 = engine.confirmEpoch(r0.state);
    expect(r1.report.events).toHaveLength(0); // el forzado de la época 1 no se apila sobre el activo
    expect(r1.report.tickMetrics[0]!.demand).toBeCloseTo(150, 9); // pico activo
    expect(r1.report.tickMetrics[1]!.demand).toBeCloseTo(100, 9); // pico terminado
    expect(r1.state.activeEvents).toEqual([]);
  });

  it("cada evento produce mensaje y entrada causal con severidad", () => {
    const { reports } = playGame(engine, toyConfig(4));
    const evs = reports.flatMap((r) => r.events);
    expect(evs.length).toBeGreaterThan(0);
    for (const r of reports) {
      expect(r.messages.filter((m) => m.source.startsWith("X-"))).toHaveLength(r.events.length);
      expect(r.causal.filter((c) => c.kind === "event")).toHaveLength(r.events.length);
      for (const c of r.causal.filter((c) => c.kind === "event")) expect(c.drivers.some((d) => d.label === "severidad")).toBe(true);
    }
  });
});
