/** SCM-LAG, SCM-SCO y SCM-PER (P1): retrasos y dependencias, puntaje y persistencia (casos de prueba §8–§10). */
import { describe, expect, it } from "vitest";
import { buildExport, kpiRows, MemoryStorage, openStorage, parseExport, replay, RunRepository, toCSV, verifyChecksum } from "@mt4035/sim-core";
import { playGame } from "@mt4035/sim-core/testing";
import { params, PARAMS_VERSION, scoreRun, scoreSpecs, SIM_VERSION } from "../src/index.ts";
import { det, engine, randomPolicy, run, start, sto } from "./helpers/run.ts";

describe("SCM-LAG (P1)", () => {
  it("LAG-01 CD mediano decidido en A1-T1 opera desde A1-T4; el capex se carga en A1-T1", () => {
    const r = run(start(det("valle")), 4, (_s, e) => (e === 0 ? { "D-01": [...start(det("valle")).model.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size })), { id: "CD-N", zone: 0, type: "crossdock", size: "medium" }] } : {}));
    expect(r.reports.map((x) => x.kpis.DC_COUNT)).toEqual([2, 2, 2, 3]);
    expect(r.reports[0]!.ledger.find((l) => l.source === "D-01")!.amount).toBeCloseTo(params.dc.capex.medium * params.dc.typeMult.crossdock * params.regions.valle.realEstate, 6);
  });

  it("LAG-02 D-30: madurez 0 al implantarse y +0.5 por época hasta 1", () => {
    const r = run(start(det("redriver")), 6, (_s, e) => (e === 0 ? { "D-30": "pos_daily" } : {}));
    expect(r.reports.map((x) => x.kpis.INFO_MATURITY)).toEqual([1, 1, 0, 0.5, 1, 1]); // retraso 2: opera desde la época 2
  });

  it("LAG-04 la estrategia se cambia una vez con penalización; el segundo cambio se rechaza", () => {
    const s1 = engine.confirmEpoch(engine.stage(start(det("kaigan")), { "D-00": "lowcost" }).state);
    expect(s1.report.ledger).toContainEqual(expect.objectContaining({ kind: "penalty", source: "D-00", amount: params.strategyChangePenalty }));
    expect(engine.validate(s1.state, { "D-00": "convenience" }).ok).toBe(false);
  });

  it("LAG-05 CPFR/VMI sin compartir POS se rechaza; con D-31 preparado se acepta", () => {
    const s = start(det("redriver"));
    expect(engine.validate(s, { "D-33": "cpfr" }).errors[0]?.message).toMatch(/D-31/);
    expect(engine.validate(s, { "D-33": "cpfr", "D-31": "daily" }).ok).toBe(true);
  });

  it("LAG-06 tanpin kanri sin terminal gráfica se rechaza", () => {
    expect(engine.validate(start(det("redriver")), { "D-20": "tanpin" }).ok).toBe(false);
    expect(engine.validate(start(det("redriver")), { "D-20": "tanpin", "D-30": "pos_terminal" }).ok).toBe(true);
  });

  it("LAG-07 consolidación combinada sin CD combinado se rechaza", () => {
    expect(engine.validate(start(det("valle")), { "D-12": "combined" }).ok).toBe(false);
    expect(engine.validate(start(det("kaigan")), { "D-12": "supplier" }).ok).toBe(true);
  });
});

describe("SCM-SCO (P1)", () => {
  it("SCO-01 los pesos suman 1 por estrategia", () => {
    for (const st of ["freshness", "lowcost", "convenience"] as const) expect(scoreSpecs(st, params).reduce((a, s) => a + s.weight, 0)).toBeCloseTo(1, 12);
  });

  it("SCO-02 una corrida de OSA alta y costo alto puntúa más bajo frescura que bajo bajo costo", () => {
    const pricey = playGame(engine, det("kaigan"), (_s, e) =>
      e === 0 ? { "D-21": { fresh: 0.99, chilled: 0.99, ambient: 0.99, frozen: 0.99 }, "D-11": { fresh: 21, chilled: 21, ambient: 7, frozen: 7 }, "D-13": "spot" } : {},
    ).reports;
    expect(scoreRun(pricey, "freshness", params).score).toBeGreaterThan(scoreRun(pricey, "lowcost", params).score);
  });

  it("SCO-03 el puntaje decrece de forma estricta con las violaciones de guardrail", () => {
    const { reports } = playGame(engine, det("kaigan"));
    const base = scoreRun(reports, "freshness", params).score;
    const worse = structuredClone(reports);
    worse[0]!.kpis.OTIF = 0.5;
    const worse2 = structuredClone(worse);
    worse2[1]!.kpis.OTIF = 0.5;
    const s1 = scoreRun(worse, "freshness", params).score;
    const s2 = scoreRun(worse2, "freshness", params).score;
    expect(s1).toBeLessThan(base);
    expect(s2).toBeLessThan(s1);
  });

  it("SCO-04 el puntaje está en [0, 100]", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { reports } = playGame(engine, sto("redriver", seed), randomPolicy(seed));
      for (const st of ["freshness", "lowcost", "convenience"] as const) {
        const sc = scoreRun(reports, st, params).score;
        expect(sc).toBeGreaterThanOrEqual(0);
        expect(sc).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("SCM-PER (P1)", () => {
  const versions = { simVersion: SIM_VERSION, paramsVersion: PARAMS_VERSION };
  const opts = { runId: "r1", createdAt: "2026-10-15T00:00:00.000Z" };

  it("PER-01 guardar y recargar una corrida devuelve el mismo objeto", async () => {
    const { state } = playGame(engine, sto("kaigan", 3), randomPolicy(3));
    const exp = await buildExport(state, opts);
    const repo = new RunRepository<unknown>(openStorage(() => new MemoryStorage()), "mt4035.scm.runs.v1", 1);
    repo.save({ id: "r1", savedAt: opts.createdAt, title: "Kaigan", data: exp });
    expect(repo.get("r1")!.data).toEqual(exp);
  });

  it("PER-02 si localStorage falla, el juego sigue en memoria", () => {
    const h = openStorage(() => {
      throw new Error("SecurityError");
    });
    expect(h.persistent).toBe(false);
    expect(new RunRepository<number>(h, "mt4035.scm.runs.v1", 1).save({ id: "a", savedAt: "", title: "", data: 1 })).toBe(true);
  });

  it("PER-03 exportar y repetir (replay) reproduce KPIs y eventos", async () => {
    const { state } = playGame(engine, sto("valle", 11), randomPolicy(11));
    const r = await replay(engine, await buildExport(state, opts), versions);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("PER-04 una corrida alterada a mano se detecta", async () => {
    const { state } = playGame(engine, sto("kaigan", 5));
    const exp = await buildExport(state, opts);
    const bad = structuredClone(exp);
    bad.kpis[3]!.values.OSA = 0.999;
    expect(await verifyChecksum(bad)).toBe(false);
    expect((await replay(engine, bad, versions)).ok).toBe(false);
    expect(parseExport(JSON.stringify(exp), "mt4035-lastmile").ok).toBe(false);
  });

  it("PER-05 CSV con 20 filas y los mismos valores que el JSON", async () => {
    const { state } = playGame(engine, det("kaigan"));
    const exp = await buildExport(state, opts);
    const lines = toCSV(kpiRows(exp)).trim().split("\n");
    expect(lines).toHaveLength(21);
    const header = lines[0]!.split(",");
    expect(Number(lines[20]!.split(",")[header.indexOf("OSA")])).toBe(exp.kpis[19]!.values.OSA);
  });
});
