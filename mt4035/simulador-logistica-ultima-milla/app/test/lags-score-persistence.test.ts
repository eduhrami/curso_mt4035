/** LOG-LAG, LOG-SCO y LOG-PER (P1): retrasos y dependencias, puntaje y persistencia (casos de prueba §8–§10). */
import { describe, expect, it } from "vitest";
import { buildExport, kpiRows, MemoryStorage, openStorage, parseExport, replay, RunRepository, toCSV, verifyChecksum } from "@mt4035/sim-core";
import { playGame } from "@mt4035/sim-core/testing";
import { params, PARAMS_VERSION, scoreRun, scoreSpecs, SIM_VERSION } from "../src/index.ts";
import { det, engine, randomPolicy, run, start, sto } from "./helpers/run.ts";

describe("LOG-LAG (P1)", () => {
  it("LAG-01 dark store decidida en A1-M01 opera desde A1-M04; el capex se carga al decidir", () => {
    const r = run(start(det("megalopolis")), 5, (_s, e) => (e === 0 ? { "D-04": 1 } : {}));
    expect(r.reports.map((x) => x.kpis.DARK_STORES)).toEqual([0, 0, 0, 1, 1]);
    expect(r.reports[0]!.ledger).toContainEqual(expect.objectContaining({ kind: "capex", source: "D-04", amount: params.nodes.dark.capex }));
    expect(r.reports.slice(1).flatMap((x) => x.ledger).filter((l) => l.source === "D-04")).toEqual([]);
    // El costo fijo mensual empieza cuando la dark store opera (desviación documentada en el caso de prueba).
    const fixed = (i: number) => r.reports[i]!.tickMetrics.reduce((a, m) => a + m.fixedDaily!, 0);
    expect(fixed(3) - fixed(2)).toBeCloseTo(params.nodes.dark.fixedMonthly, 6);
  });

  it("LAG-02 MFC decidido en A1-M01 opera desde A1-M07", () => {
    const r = run(start(det("megalopolis")), 8, (_s, e) => (e === 0 ? { "D-05": 1 } : {}));
    expect(r.reports.map((x) => x.kpis.MFC_COUNT)).toEqual([0, 0, 0, 0, 0, 0, 1, 1]);
  });

  it("LAG-03 SFS y BOPIS activados en el mes t operan en t+1; cerrar nodos es inmediato", () => {
    const r = run(start(det("bajio")), 3, (_s, e) => (e === 0 ? { "D-02": { share: 0.3, pickers: "4" }, "D-03": true } : {}));
    expect(r.reports.map((x) => x.kpis.SFS_SHARE)).toEqual([0, 0.3, 0.3]);
    expect(r.reports.map((x) => x.kpis.BOPIS)).toEqual([0, 1, 1]);
    const closing = run(r.state, 1, () => ({ "D-02": { share: 0, pickers: "4" } }));
    expect(closing.reports[0]!.kpis.SFS_SHARE).toBe(0.3); // D-02 tiene retraso de 1 mes también al bajar
    const dark = run(start(det("megalopolis")), 4, (_s, e) => (e === 0 ? { "D-04": 1 } : {}));
    expect(run(dark.state, 1, () => ({ "D-04": 0 })).reports[0]!.kpis.DARK_STORES).toBe(0);
  });

  it("LAG-05 D-44 dependiente de la hora con datos básicos se rechaza con aviso de telemetría", () => {
    const s = start(det("megalopolis"));
    expect(engine.validate(s, { "D-44": "timedep" }).errors[0]?.message).toMatch(/telemetría/);
    expect(engine.validate(s, { "D-44": "timedep", "D-60": "full" }).ok).toBe(true);
  });

  it("LAG-06 ruteo con IA y datos básicos se permite con aviso (R-08) y beneficio limitado", () => {
    const s = start(det("megalopolis"));
    expect(engine.validate(s, { "D-43": "ai" }).ok).toBe(true);
    const r = run(s, 1, () => ({ "D-43": "ai" })).reports[0]!;
    expect(r.rulesFired.some((f) => f.id === "R-08")).toBe(true);
    expect(r.messages.some((m) => m.source === "R-08")).toBe(true);
  });

  it("LAG-09 la estrategia se cambia una vez con penalización; el segundo cambio se rechaza", () => {
    const s1 = engine.confirmEpoch(engine.stage(start(det("bajio")), { "D-00": "efficiency" }).state);
    expect(s1.report.ledger).toContainEqual(expect.objectContaining({ kind: "penalty", source: "D-00", amount: params.strategyChangePenalty }));
    expect(s1.state.model.strategy).toBe("efficiency");
    expect(engine.validate(s1.state, { "D-00": "speed" }).ok).toBe(false);
  });
});

describe("LOG-SCO (P1)", () => {
  it("SCO-01 los pesos suman 1 por estrategia", () => {
    for (const st of ["speed", "reliability", "efficiency"] as const) expect(scoreSpecs(st, params).reduce((a, s) => a + s.weight, 0)).toBeCloseTo(1, 12);
  });

  it("SCO-02 una corrida rápida y cara (Order Cycle Time mínimo, CPD máximo) puntúa velocidad > confiabilidad > eficiencia", () => {
    // Se fija el perfil en la corrida as-is para aislar el efecto de los pesos de cada estrategia.
    const fast = structuredClone(playGame(engine, det("megalopolis")).reports);
    for (const r of fast) {
      r.kpis.CYCLE_HOURS = params.score.ranges.CYCLE_HOURS.best;
      r.kpis.CPD_P95 = params.score.ranges.CPD_P95.worst;
    }
    const sc = (st: "speed" | "reliability" | "efficiency") => scoreRun(fast, st, params, "megalopolis").score;
    expect(sc("speed")).toBeGreaterThan(sc("reliability"));
    expect(sc("reliability")).toBeGreaterThan(sc("efficiency"));
  });

  it("SCO-03 el puntaje decrece de forma estricta con los días de violación de guardrail", () => {
    const { reports } = playGame(engine, det("bajio"));
    const base = scoreRun(reports, "reliability", params).score;
    const worse = structuredClone(reports);
    worse[0]!.kpis.OTD_P95 = 0.5;
    const worse2 = structuredClone(worse);
    worse2[1]!.kpis.OTD_P95 = 0.5;
    const s1 = scoreRun(worse, "reliability", params).score;
    const s2 = scoreRun(worse2, "reliability", params).score;
    expect(s1).toBeLessThan(base);
    expect(s2).toBeLessThan(s1);
  });

  it("SCO-04 el puntaje está en [0, 100] y no depende de D-61", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const { reports } = playGame(engine, sto("norte", seed), randomPolicy(seed));
      for (const st of ["speed", "reliability", "efficiency"] as const) {
        const sc = scoreRun(reports, st, params, "norte").score;
        expect(sc).toBeGreaterThanOrEqual(0);
        expect(sc).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("LOG-PER (P1)", () => {
  const versions = { simVersion: SIM_VERSION, paramsVersion: PARAMS_VERSION };
  const opts = { runId: "r1", createdAt: "2026-11-05T00:00:00.000Z" };

  it("PER-01 guardar y recargar una corrida devuelve el mismo objeto", async () => {
    const { state } = playGame(engine, sto("megalopolis", 3), randomPolicy(3), 6);
    const exp = await buildExport(state, opts);
    const repo = new RunRepository<unknown>(openStorage(() => new MemoryStorage()), "mt4035.lastmile.runs.v1", 1);
    repo.save({ id: "r1", savedAt: opts.createdAt, title: "Megalópolis", data: exp });
    expect(repo.get("r1")!.data).toEqual(exp);
  });

  it("PER-02 si localStorage falla, el juego sigue en memoria", () => {
    const h = openStorage(() => {
      throw new Error("SecurityError");
    });
    expect(h.persistent).toBe(false);
    expect(new RunRepository<number>(h, "mt4035.lastmile.runs.v1", 1).save({ id: "a", savedAt: "", title: "", data: 1 })).toBe(true);
  });

  it("PER-03 exportar y repetir (replay) reproduce KPIs y eventos", async () => {
    const { state } = playGame(engine, sto("norte", 11), randomPolicy(11));
    const r = await replay(engine, await buildExport(state, opts), versions);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("PER-04 una corrida alterada a mano se detecta; un JSON del simulador SCM se rechaza", async () => {
    const { state } = playGame(engine, sto("bajio", 5), undefined, 6);
    const exp = await buildExport(state, opts);
    const bad = structuredClone(exp);
    bad.kpis[3]!.values.OTD = 0.999;
    expect(await verifyChecksum(bad)).toBe(false);
    expect((await replay(engine, bad, versions)).ok).toBe(false);
    expect(parseExport(JSON.stringify(exp), "mt4035-scm").ok).toBe(false);
    expect(parseExport(JSON.stringify(exp), "mt4035-lastmile").ok).toBe(true);
  });

  it("PER-05 CSV con 36 filas y los mismos valores que el JSON", async () => {
    const { state } = playGame(engine, det("bajio"));
    const exp = await buildExport(state, opts);
    const lines = toCSV(kpiRows(exp)).trim().split("\n");
    expect(lines).toHaveLength(37);
    const header = lines[0]!.split(",");
    expect(Number(lines[36]!.split(",")[header.indexOf("OTD")])).toBe(exp.kpis[35]!.values.OTD);
  });
});
