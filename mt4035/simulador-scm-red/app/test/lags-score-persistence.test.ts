/** SCM-LAG, SCM-SCO y SCM-PER (P1): retrasos y dependencias, puntaje y persistencia (casos de prueba §8–§10). */
import { describe, expect, it } from "vitest";
import { buildExport, kpiRows, MemoryStorage, openStorage, parseExport, replay, RunRepository, toCSV, verifyChecksum } from "@mt4035/sim-core";
import { playGame } from "@mt4035/sim-core/testing";
import { capexBudget, createScmEngine, params, PARAMS_VERSION, scoreRun, scoreSpecs, SIM_VERSION } from "../src/index.ts";
import { det, engine, paramsWith, randomPolicy, run, start, sto } from "./helpers/run.ts";
import { effectiveCv } from "../src/tick.ts";

describe("SCM-LAG (P1)", () => {
  it("LAG-01 CD mediano decidido en A1-T1 opera desde A1-T4; el capex se carga en A1-T1", () => {
    const r = run(start(det("valle")), 4, (_s, e) => (e === 0 ? { "D-01": [...start(det("valle")).model.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size })), { id: "CD-N", zone: 0, type: "crossdock", size: "medium" }] } : {}));
    expect(r.reports.map((x) => x.kpis.DC_COUNT)).toEqual([4, 4, 4, 5]);
    expect(r.reports[0]!.ledger.find((l) => l.source === "D-01")!.amount).toBeCloseTo(params.dc.capex.medium * params.dc.typeMult.crossdock * params.regions.valle.realEstate, 6);
  });

  it("LAG-02 D-30: madurez 0 al implantarse y +1 por época (madura en un trimestre)", () => {
    const r = run(start(det("redriver")), 6, (_s, e) => (e === 0 ? { "D-30": "pos_daily" } : {}));
    expect(r.reports.map((x) => x.kpis.INFO_MATURITY)).toEqual([1, 0, 1, 1, 1, 1]); // retraso 1: opera desde la época 1
  });

  it("LAG-04 la propuesta de valor se fija en el setup y no se puede cambiar durante la partida", () => {
    expect(engine.model.decisions.some((d) => d.id === "D-00")).toBe(false);
    expect(engine.validate(start(det("kaigan")), { "D-00": "lowcost" }).ok).toBe(false);
    const { reports, state } = run(start(det("kaigan")), 4);
    expect(state.model.strategy).toBe("freshness");
    expect(reports.flatMap((r) => r.ledger).some((l) => l.source === "D-00")).toBe(false);
  });

  it("LAG-10 tope de inversión anual: el turno que lo excede se rechaza; lo invertido se acumula en el año, se renueva en T1 y los cierres también cuentan", () => {
    const capped = createScmEngine(paramsWith((p) => (p.money.capexBudgetPerYear.redriver = 10e6)));
    const lot = (n: number) => n * params.stores.capex * params.regions.redriver.storeCapexMult;
    const n = Math.floor(6e6 / lot(1));
    let s = capped.createGame(det("redriver", { test: { budget: "on" } }));
    expect(capexBudget(s, paramsWith((p) => (p.money.capexBudgetPerYear.redriver = 10e6)))!.remaining).toBe(10e6);
    expect(capped.validate(s, { "D-08": n }).ok).toBe(true);
    s = capped.confirmEpoch(capped.stage(s, { "D-08": n }).state).state; // A1-T1: ~6 M
    const over = capped.validate(s, { "D-08": n }); // A1-T2: otros ~6 M exceden el tope de 10 M
    expect(over.ok).toBe(false);
    expect(over.errors[0]!.message).toMatch(/Tope de inversión de A1/);
    expect(capped.validate(s, { "D-11": { fresh: 7, chilled: 3, ambient: 2, frozen: 1 } }).ok).toBe(true); // sin capex no hay restricción
    for (let e = 1; e < 4; e++) s = capped.confirmEpoch(s).state;
    expect(capped.validate(s, { "D-08": n }).ok).toBe(true); // A2-T1: el tope se renueva
    expect(capped.validate(capped.createGame(det("redriver")), { "D-08": 3 * n }).ok).toBe(true); // budget "off" en pruebas
    // Cerrar CD cuesta una indemnización (cargo en el ledger) que también consume el tope.
    const tight = createScmEngine(paramsWith((p) => (p.money.capexBudgetPerYear.valle = 1e6)));
    const v = tight.createGame(det("valle", { test: { budget: "on" } }));
    const keepOne = [v.model.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size }))[0]!];
    expect(tight.validate(v, { "D-01": keepOne }).ok).toBe(false);
    const open = createScmEngine(paramsWith((p) => (p.money.capexBudgetPerYear.valle = 50e6)));
    const closed = open.confirmEpoch(open.stage(open.createGame(det("valle", { test: { budget: "on" } })), { "D-01": keepOne }).state).report.ledger.filter((l) => l.source === "D-01");
    expect(closed.map((l) => l.kind)).toEqual(["penalty"]);
  });

  it("LAG-11 cierre manual de tiendas: cierran en la zona elegida el trimestre siguiente, con indemnización", () => {
    const s0 = start(det("redriver"));
    const zone = s0.model.zones.findIndex((z) => z.stores >= 10);
    const before = s0.model.zones[zone]!.stores;
    expect(engine.validate(s0, { "D-09": { zone, stores: before + 1 } }).ok).toBe(false);
    const r = run(s0, 2, (_s, e) => (e === 0 ? { "D-09": { zone, stores: 10 } } : {}));
    expect(r.reports[0]!.ledger).toContainEqual(expect.objectContaining({ kind: "penalty", source: "D-09", amount: 10 * params.stores.closureCost }));
    expect(r.state.model.zones[zone]!.stores).toBe(before - 10);
    expect(r.reports[1]!.kpis.STORES).toBeLessThan(r.reports[0]!.kpis.STORES!);
  });

  it("LAG-12 CPFR desde RMI: cobra la implementación, entra un trimestre después y su beneficio madura en tres", () => {
    const s0 = start(det("redriver"));
    expect(s0.model.dec.collaboration).toBe("rmi");
    const r = run(s0, 6, (_s, e) => (e === 0 ? { "D-31": "yes", "D-33": "cpfr" } : {}));
    expect(r.reports[0]!.ledger).toContainEqual(expect.objectContaining({ source: "D-33", amount: params.info.cpfr.implementation }));
    const m = r.reports.map((x) => Math.round(x.kpis.CPFR_MATURITY! * 100) / 100);
    expect(m).toEqual([0, 0, 0.33, 0.67, 1, 1]);
    // Con el CPFR maduro, el error de pronóstico efectivo baja respecto de RMI.
    expect(effectiveCv(r.state.model, params)).toBeLessThan(effectiveCv({ ...r.state.model, cpfrMaturity: 0 }, params));
  });

  it("LAG-05 CPFR sin compartir POS se rechaza; con el POS compartido preparado se acepta", () => {
    const s = start(det("redriver"));
    expect(engine.validate(s, { "D-33": "cpfr" }).errors[0]?.message).toMatch(/compartir POS/);
    expect(engine.validate(s, { "D-33": "cpfr", "D-31": "yes" }).ok).toBe(true);
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
      e === 0 ? { "D-11": { fresh: 14, chilled: 14, ambient: 7, frozen: 7 } } : {},
    ).reports;
    expect(scoreRun(pricey, "freshness", params, "kaigan").score).toBeGreaterThan(scoreRun(pricey, "lowcost", params, "kaigan").score);
  });

  it("SCO-03 el puntaje decrece de forma estricta con las violaciones de guardrail", () => {
    const { reports } = playGame(engine, det("kaigan"));
    // Parte de trimestres que cumplen el guardrail de OTIF, para que cada violación sea nueva.
    const ok = structuredClone(reports);
    for (const r of ok) r.kpis.OTIF = 0.99;
    const base = scoreRun(ok, "freshness", params).score;
    const worse = structuredClone(ok);
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

  it("PER-05 CSV con 12 filas y los mismos valores que el JSON", async () => {
    const { state } = playGame(engine, det("kaigan"));
    const exp = await buildExport(state, opts);
    const lines = toCSV(kpiRows(exp)).trim().split("\n");
    expect(lines).toHaveLength(13);
    const header = lines[0]!.split(",");
    expect(Number(lines[12]!.split(",")[header.indexOf("OSA")])).toBe(exp.kpis[11]!.values.OSA);
  });
});
