/** LOG-FC: proceso de demanda oculto, datos históricos y pronóstico F-01 (casos de prueba §9.1). */
import { describe, expect, it } from "vitest";
import { calendarDays, demandCsv, forecastScore, params, scoreRun, truthForecast, type Forecast } from "../src/index.ts";
import { det, engine, run, start, sto, sumMetric, withOverrides } from "./helpers/run.ts";

const scaled = (f: Forecast, k: number): Forecast => ({ ...f, level: f.level * k, p95: f.p95 * k, peaks: Object.fromEntries(Object.entries(f.peaks).map(([id, m]) => [id, 1 + (m - 1) * k])) as Forecast["peaks"] });

describe("LOG-FC (P1)", () => {
  it("FC-01 F-01 solo se captura en enero y para el año en curso", () => {
    const g = start(det("bajio"));
    const fc = truthForecast(g.model, params, 0);
    expect(engine.validate(g, { "F-01": fc }).ok).toBe(true);
    expect(engine.validate(g, { "F-01": { ...fc, year: 1 } }).errors[0]?.message).toMatch(/año A1/);
    const feb = run(g, 1).state;
    expect(engine.validate(feb, { "F-01": { ...fc, level: fc.level * 1.1 } }).errors[0]?.message).toMatch(/enero/);
  });

  it("FC-03/04 el CSV trae 730 días de historia (+ lo jugado) y coincide con la demanda del mercado del motor", () => {
    const g = start(sto("bajio", 7));
    const t = params.territories.bajio;
    const lines = demandCsv(g.model, params, g.config.seed, t.zones, 0, g.model.noiseScale).trim().split("\n");
    expect(lines[0]).toMatch(/^dia,anio,mes,dia_mes,dia_semana,evento,.*,total$/);
    expect(lines).toHaveLength(1 + 730);
    const { state, reports } = run(g, 2);
    const rows = demandCsv(state.model, params, state.config.seed, t.zones, 2, state.model.noiseScale).trim().split("\n").slice(1 + 730);
    expect(rows).toHaveLength(31 + 28);
    const jan = rows.slice(0, 31).reduce((a, r) => a + Number(r.split(",").at(-1)), 0);
    // El CSV redondea por zona: la suma coincide con MARKET salvo el redondeo.
    expect(Math.abs(jan - reports[0]!.kpis.MARKET!)).toBeLessThan(31 * t.zones.length);
  });

  it("FC-03b el calendario de un año jugado empieza en su día absoluto y el p95 perfecto crece con la demanda", () => {
    const g = start(det("megalopolis"));
    expect(calendarDays(params, 12, 13)[0]!.day).toBe(365);
    expect(calendarDays(params, -1, 0)[0]!.day).toBe(-31);
    const [a1, a2, a3] = [0, 1, 2].map((y) => truthForecast(g.model, params, y).p95);
    expect(a2!).toBeGreaterThan(a1!);
    expect(a3!).toBeGreaterThan(a2!);
  });

  it("FC-05/06 pronosticar de menos deja flota faltante; de más, paga capacidad ociosa (pareadas)", () => {
    const g = start(det("megalopolis"));
    const perfect = g.model.dec.forecast;
    const month = (k: number) => run(withOverrides(g, { "dec.forecast": scaled(perfect, k) }), 3).reports;
    const [low, ok, high] = [0.8, 1, 1.2].map(month);
    const sum = (rs: typeof ok, k: string) => rs!.reduce((a, r) => a + sumMetric(r, k), 0);
    expect(sum(low, "fleetShort")).toBeGreaterThan(sum(ok, "fleetShort"));
    expect(low!.at(-1)!.kpis.OTD!).toBeLessThan(ok!.at(-1)!.kpis.OTD!);
    expect(sum(high, "idleCost")).toBeGreaterThan(sum(ok, "idleCost"));
    expect(high!.at(-1)!.kpis.CPD!).toBeGreaterThan(ok!.at(-1)!.kpis.CPD!);
  });

  it("FC-07 / SCO-06 el pronóstico perfecto califica ≥ 0.9 y uno sesgado 20% mucho menos; el final pondera 70/30", () => {
    for (const t of ["megalopolis", "norte"] as const) {
      const play = (k: number) => {
        let s = engine.createGame(sto(t, 3, { test: { events: "off" } }));
        const reports = [];
        for (let e = 0; e < 36; e++) {
          if (e % 12 === 0) s.model.dec.forecast = scaled(truthForecast(s.model, params, e / 12), k);
          const r = engine.confirmEpoch(s);
          s = r.state;
          reports.push(r.report);
        }
        return reports;
      };
      const perfect = forecastScore(play(1), params).score;
      const biased = forecastScore(play(1.2), params).score;
      expect(perfect, t).toBeGreaterThanOrEqual(0.9);
      expect(biased, t).toBeLessThan(0.55);
      const sc = scoreRun(play(1), "reliability", params, t);
      expect(sc.score).toBeCloseTo(0.7 * sc.operational + 0.3 * sc.forecast, 9);
    }
  });

  it("MON-01 el estado de resultados cierra: utilidad = margen + tarifas − última milla − reembolsos − retrasos − capex", () => {
    const g = start(det("megalopolis"));
    const { reports } = run(g, 4, (_s, e) => (e === 0 ? { "D-04": 1 } : {}));
    for (const r of reports) {
      const k = r.kpis;
      expect(k.PROFIT_OP!).toBeCloseTo(k.GROSS_MARGIN! + k.FEES! - k.LAST_MILE_COST! - k.REFUNDS! - k.LATE_COST!, 4);
      expect(k.PROFIT!).toBeCloseTo(k.PROFIT_OP! - k.CAPEX!, 6);
      expect(k.LATE_COST!).toBeCloseTo(k.LATE_ORDERS! * params.money.lateCoupon, 6);
    }
    // La dark store se paga en el mes en que se decide.
    expect(reports[0]!.kpis.CAPEX).toBe(params.nodes.dark.capex);
    expect(reports[1]!.kpis.CAPEX).toBe(0);
  });
});
