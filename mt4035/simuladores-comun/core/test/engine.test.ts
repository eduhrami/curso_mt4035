/** Invariantes genéricas del motor (equivalentes a SCM-INV / LOG-INV) y decisiones (LAG). */
import { describe, expect, it } from "vitest";
import { createEngine, quarterLabel, monthLabel } from "../src/engine.ts";
import { deepFreeze, overrideState, playGame, allKpiValues } from "../src/testing.ts";
import { makeToyModel, toyConfig, toyParams, TOY_TICKS, type ToyState } from "./fixtures/toy-model.ts";

const engine = createEngine(makeToyModel(), toyParams);

describe("calendario y avance de épocas (INV-02/03/04)", () => {
  it("corre exactamente las épocas del calendario con ticks variables y termina en FINAL", () => {
    const { state, reports } = playGame(engine, toyConfig());
    expect(reports).toHaveLength(4);
    expect(reports.map((r) => r.tickMetrics.length)).toEqual(TOY_TICKS);
    expect(reports.map((r) => r.label)).toEqual(["E1", "E2", "E3", "E4"]);
    expect(state.phase).toBe("FINAL");
    expect(() => engine.confirmEpoch(state)).toThrow(/terminó/);
  });

  it("solo confirmEpoch avanza; preparar decisiones no avanza", () => {
    const g = engine.createGame(toyConfig());
    const s = engine.stage(g, { "D-01": 3 }).state;
    expect(s.epoch).toBe(0);
    expect(s.history).toHaveLength(0);
    expect(engine.confirmEpoch(s).state.epoch).toBe(1);
  });

  it("etiquetas estándar de época (AD-29)", () => {
    expect([0, 3, 4, 19].map(quarterLabel)).toEqual(["A1-T1", "A1-T4", "A2-T1", "A5-T4"]);
    expect([0, 11, 12, 35].map(monthLabel)).toEqual(["A1-M01", "A1-M12", "A2-M01", "A3-M12"]);
  });
});

describe("pureza y determinismo (INV-01/02)", () => {
  it("las funciones del motor no mutan su entrada", () => {
    const g = deepFreeze(engine.createGame(toyConfig()));
    const staged = deepFreeze(engine.stage(g, { "D-01": 3 }).state);
    expect(() => engine.confirmEpoch(staged)).not.toThrow();
  });

  it("misma semilla y decisiones ⇒ resultados idénticos", () => {
    const policy = (_s: unknown, e: number) => (e === 1 ? { "D-01": 3, "D-02": true } : {});
    const a = playGame(engine, toyConfig(11), policy);
    const b = playGame(engine, toyConfig(11), policy);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("semillas distintas con eventos activos ⇒ corridas distintas", () => {
    let distinct = 0;
    for (let s = 0; s < 50; s++) {
      const a = playGame(engine, toyConfig(s)).reports;
      const b = playGame(engine, toyConfig(s + 1000)).reports;
      if (JSON.stringify(a.map((r) => r.kpis)) !== JSON.stringify(b.map((r) => r.kpis))) distinct++;
    }
    expect(distinct).toBe(50);
  });

  it("modo determinista (eventos off, ruido 0): la semilla no importa", () => {
    const a = playGame(engine, toyConfig(1, { events: "off", noise: 0 })).reports;
    const b = playGame(engine, toyConfig(2, { events: "off", noise: 0 })).reports;
    expect(a.map((r) => r.kpis)).toEqual(b.map((r) => r.kpis));
    expect(a.flatMap((r) => r.events)).toHaveLength(0);
  });

  it("números aleatorios comunes: cambiar una decisión que no modifica eventos deja los eventos idénticos", () => {
    for (let seed = 0; seed < 30; seed++) {
      const a = playGame(engine, toyConfig(seed), () => ({ "D-01": 1 })).reports;
      const b = playGame(engine, toyConfig(seed), () => ({ "D-01": 3 })).reports;
      const sig = (rs: typeof a) => rs.flatMap((r) => r.events.map((e) => `${e.epoch}:${e.tick}:${e.id}:${e.severity}`));
      expect(sig(b)).toEqual(sig(a));
    }
  });
});

describe("conservación y rangos en el modelo de juguete (INV-05/08/15)", () => {
  it("unidades: stockIni + recibido = vendido + merma + spoilage + stockFin en cada tick", () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const r of playGame(engine, toyConfig(seed)).reports) {
        for (const m of r.tickMetrics) {
          expect(m.stockIni! + m.received!).toBeCloseTo(m.sold! + m.waste! + m.spoiled! + m.stockEnd!, 9);
        }
      }
    }
  });
  it("proporciones en [0, 1] y sin NaN/∞", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { reports } = playGame(engine, toyConfig(seed));
      expect(allKpiValues(reports).every(Number.isFinite)).toBe(true);
      for (const r of reports) for (const k of ["OSA", "WASTE", "LOST"]) expect(r.kpis[k]).toBeGreaterThanOrEqual(0), expect(r.kpis[k]).toBeLessThanOrEqual(1);
    }
  });
});

describe("decisiones: validación, preparación, retrasos y costos (INV-16/17, LAG)", () => {
  const g0 = engine.createGame(toyConfig(1));

  it("rechaza IDs desconocidos y valores fuera de rango sin alterar el estado", () => {
    const r = engine.stage(g0, { "D-99": 1, "D-01": 7 });
    expect(r.errors.map((e) => e.id).sort()).toEqual(["D-01", "D-99"]);
    expect(r.state).toBe(g0);
  });

  it("dependencias: D-05 requiere D-02 efectivo (preparado o pendiente)", () => {
    expect(engine.validate(g0, { "D-05": true }).ok).toBe(false);
    expect(engine.validate(g0, { "D-02": true, "D-05": true }).ok).toBe(true);
    const pending = engine.confirmEpoch(engine.stage(g0, { "D-02": true }).state).state; // D-02 con retraso 1
    expect(pending.model.fridge).toBe(false);
    expect(engine.validate(pending, { "D-05": true }).ok).toBe(true);
  });

  it("restricciones: no se puede reducir la capacidad ni quitar el refrigerador", () => {
    expect(engine.validate(g0, { "D-03": 150 }).errors[0]?.message).toMatch(/ampliar/);
    let s = engine.confirmEpoch(engine.stage(g0, { "D-02": true }).state).state;
    s = engine.confirmEpoch(s).state;
    expect(s.model.fridge).toBe(true);
    expect(engine.validate(s, { "D-02": false }).ok).toBe(false);
  });

  it("límite de cambios: la estrategia se cambia una vez con penalización; el segundo cambio se rechaza", () => {
    const s1 = engine.confirmEpoch(engine.stage(g0, { "D-04": "b" }).state).state;
    expect(s1.ledger).toContainEqual(expect.objectContaining({ kind: "penalty", amount: 10, source: "D-04" }));
    expect(engine.validate(s1, { "D-04": "a" }).errors[0]?.message).toMatch(/1 vez/);
  });

  it("preparar reemplaza el conjunto (deshacer) y descarta cambios sin efecto", () => {
    const a = engine.stage(g0, { "D-01": 3, "D-02": true }).state;
    const b = engine.stage(a, { "D-01": 3 }).state;
    expect(b.staged).toEqual({ "D-01": 3 });
    expect(engine.stage(g0, { "D-01": 2 }).state.staged).toEqual({}); // 2 ya es el valor vigente
  });

  it("retraso: capex al decidir, efecto al vencer el retraso (SCM-LAG-01)", () => {
    let s = engine.stage(g0, { "D-03": 300 }).state; // retraso 2, costo 100
    let r = engine.confirmEpoch(s);
    expect(r.report.ledger).toEqual([expect.objectContaining({ kind: "capex", amount: 100, source: "D-03", epoch: 0 })]);
    expect(r.state.model.capacity).toBe(200);
    expect(r.state.pending).toEqual([{ decisionId: "D-03", value: 300, decidedAt: 0, activateAt: 2 }]);
    s = engine.confirmEpoch(r.state).state;
    expect(s.model.capacity).toBe(200);
    r = engine.confirmEpoch(s);
    expect(r.state.model.capacity).toBe(300);
    expect(r.report.causal).toContainEqual(expect.objectContaining({ kind: "activation", id: "D-03" }));
    expect(engine.effectiveValue(g0, "D-03")).toBe(200);
  });

  it("una decisión nueva sustituye al proyecto pendiente de la misma decisión", () => {
    const s1 = engine.confirmEpoch(engine.stage(g0, { "D-03": 300 }).state).state;
    expect(engine.effectiveValue(s1, "D-03")).toBe(300);
    const s2 = engine.confirmEpoch(engine.stage(s1, { "D-03": 400 }).state).state;
    expect(s2.pending).toEqual([{ decisionId: "D-03", value: 400, decidedAt: 1, activateAt: 3 }]);
  });

  it("decisiones sin retraso se aplican en la época que se confirman y quedan en el log", () => {
    const r = engine.confirmEpoch(engine.stage(g0, { "D-01": 3 }).state);
    expect(r.state.model.freq).toBe(3);
    expect(r.state.decisionLog).toEqual([{ epoch: 0, changes: { "D-01": 3 } }]);
    expect(r.report.causal[0]).toMatchObject({ kind: "decision", id: "D-01", kpis: ["OSA", "WASTE"] });
  });

  it("confirmEpoch rechaza preparados que se volvieron inválidos", () => {
    const bad = structuredClone(g0);
    bad.staged = { "D-01": 9 };
    expect(() => engine.confirmEpoch(bad)).toThrow(/inválidas/);
  });
});

describe("reglas (REG genérico) y trazas", () => {
  it("la regla se dispara arriba del umbral, se registra y avisa una sola vez por época", () => {
    let s = engine.createGame(toyConfig(3, { events: "off", noise: 0 }));
    s = overrideState(s, "freq", 1); // reposición insuficiente ⇒ faltantes
    s = overrideState(s, "stock", 0);
    const r = engine.confirmEpoch(s).report;
    expect(r.rulesFired.length).toBeGreaterThan(1);
    expect(r.rulesFired.every((f) => f.id === "R-01")).toBe(true);
    expect(r.messages.filter((m) => m.source === "R-01")).toHaveLength(1);
    expect(r.causal.filter((c) => c.kind === "rule")).toHaveLength(r.rulesFired.length);
    expect(r.kpis.TRUST).toBeLessThan(1);
  });

  it("debajo del umbral la regla no se dispara", () => {
    let s = engine.createGame(toyConfig(3, { events: "off", noise: 0 }));
    s = overrideState(s, "freq", 3);
    expect(engine.confirmEpoch(s).report.rulesFired).toHaveLength(0);
  });

  it("overrideState valida la ruta", () => {
    const s = engine.createGame(toyConfig());
    expect(() => overrideState(s, "noExiste", 1)).toThrow();
    expect(() => overrideState(s, "stock.x", 1)).toThrow();
  });

  it("trace solo se guarda si config.test.trace está activo", () => {
    const off = engine.confirmEpoch(engine.createGame(toyConfig(1))).report;
    const on = engine.confirmEpoch(engine.createGame(toyConfig(1, { trace: true }))).report;
    expect(off.trace).toEqual([]);
    expect(on.trace).toHaveLength(5);
    expect(on.trace[0]).toHaveProperty("received");
  });
});

describe("tipos del estado", () => {
  it("el estado es serializable a JSON sin pérdida", () => {
    const { state } = playGame(engine, toyConfig(5), (_s, e) => (e === 0 ? { "D-02": true } : {}));
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    const m: ToyState = state.model;
    expect(m.fridge).toBe(true);
  });
});
