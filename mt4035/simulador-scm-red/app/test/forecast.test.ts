/** SCM-FC: proceso de demanda oculto, datos históricos y pronóstico F-01 (casos de prueba §9.1). */
import { describe, expect, it } from "vitest";
import { demandCsv, forecastScore, params, scoreRun, serviceGuardrails, truthForecast, type DemandForecast } from "../src/index.ts";
import { det, engine, run, start, sumMetric, withOverrides } from "./helpers/run.ts";
import { scmConfig } from "../src/model.ts";

const scaled = (f: DemandForecast, k: number): DemandForecast => ({ ...f, level: f.level * k, p95: f.p95 * k });
const sto = (region: "kaigan" | "redriver" | "valle", seed: number) => scmConfig({ region, seed, test: { events: "off", noise: 1 } });

describe("SCM-FC (P1)", () => {
  it("FC-01 F-01 solo se captura en T1 y para el año en curso", () => {
    const g = start(det("valle"));
    const fc = truthForecast(g.model, params, 0);
    expect(engine.validate(g, { "F-01": fc }).ok).toBe(true);
    expect(engine.validate(g, { "F-01": { ...fc, year: 1 } }).errors[0]?.message).toMatch(/año A1/);
    const t2 = run(g, 1).state;
    expect(engine.validate(t2, { "F-01": { ...fc, level: fc.level * 1.1 } }).errors[0]?.message).toMatch(/T1/);
  });

  it("FC-03/04 el CSV trae 104 semanas de historia (+ lo jugado) y coincide con la demanda del mercado del motor", () => {
    const g = start(sto("valle", 7));
    const lines = demandCsv(g.model, params, g.config.seed, 0, g.model.noiseScale).trim().split("\n");
    expect(lines[0]).toBe("semana,anio,trimestre,semana_del_anio,frescos,refrigerado,ambiente,congelado,total");
    expect(lines).toHaveLength(1 + 104);
    const { state, reports } = run(g, 2);
    const rows = demandCsv(state.model, params, state.config.seed, state.model.week, state.model.noiseScale).trim().split("\n").slice(1 + 104);
    expect(rows).toHaveLength(26);
    const q1 = rows.slice(0, 13).reduce((a, r) => a + Number(r.split(",").at(-1)), 0);
    expect(q1).toBeCloseTo(reports[0]!.kpis.MARKET!, 0);
  });

  it("FC-05/06 pronosticar de menos baja la disponibilidad; de más, sube el inventario y la merma (pareadas)", () => {
    const g = start(det("kaigan"));
    const perfect = g.model.dec.demandForecast;
    const year = (k: number) => run(withOverrides(g, { "dec.demandForecast": scaled(perfect, k) }), 4).reports;
    const [low, ok, high] = [0.8, 1, 1.2].map(year);
    const mean = (rs: typeof ok, kpi: string) => rs!.reduce((a, r) => a + r.kpis[kpi]!, 0) / rs!.length;
    expect(mean(low, "OSA")).toBeLessThan(mean(ok, "OSA"));
    expect(mean(low, "LOST_SALES")).toBeGreaterThan(mean(ok, "LOST_SALES"));
    expect(mean(high, "WASTE")).toBeGreaterThan(mean(ok, "WASTE"));
    expect(mean(high, "ITR")).toBeLessThan(mean(ok, "ITR"));
    expect(sumMetric(high![0]!, "invValue")).toBeGreaterThan(sumMetric(ok![0]!, "invValue"));
  });

  it("FC-07 / SCO-06 el pronóstico perfecto califica ≥ 0.9 y uno sesgado 20% mucho menos; el índice pondera 70/30", () => {
    for (const region of ["kaigan", "redriver"] as const) {
      const play = (k: number) => {
        let s = engine.createGame(sto(region, 3));
        const reports = [];
        for (let e = 0; e < 20; e++) {
          if (e % 4 === 0) s.model.dec.demandForecast = scaled(truthForecast(s.model, params, e / 4), k);
          const r = engine.confirmEpoch(s);
          s = r.state;
          reports.push(r.report);
        }
        return reports;
      };
      expect(forecastScore(play(1), params).score, region).toBeGreaterThanOrEqual(0.9);
      expect(forecastScore(play(1.2), params).score, region).toBeLessThan(0.55);
      const sc = scoreRun(play(1), "freshness", params, region);
      expect(sc.score).toBeCloseTo(0.7 * sc.operational + 0.3 * sc.forecast, 9);
    }
  });

  it("MON-01/02 utilidad = EBITDA − inversión − penalizaciones; la penalización sigue los guardrails de la propuesta declarada", () => {
    const { reports } = run(start(det("redriver")), 4, (_s, e) => (e === 0 ? { "D-08": 50 } : {}));
    for (const r of reports) {
      const k = r.kpis;
      expect(k.EBITDA!).toBeCloseTo(k.GM_USD! - k.WASTE_COST! - k.OVERSTOCK_COST! - k.TRANSPORT_COST! - k.HANDLING_COST! - k.DC_FIXED_COST! - k.RECEIVING_COST! - k.CARRYING_COST! - k.IT_COST!, 0);
      expect(k.PROFIT!).toBeCloseTo(k.EBITDA! - k.CAPEX! - k.SERVICE_PENALTY!, 0);
      const broken = serviceGuardrails("freshness", params, "redriver").filter((g) => !(g.op === ">=" ? k[g.kpi]! >= g.value : k[g.kpi]! <= g.value)).length;
      expect(k.SERVICE_BREACHES).toBe(broken);
      expect(k.SERVICE_PENALTY!).toBeCloseTo(broken * params.money.servicePenaltyShare * k.SALES!, 0);
    }
    expect(reports.some((r) => r.kpis.CAPEX! > 0)).toBe(true);
  });
});
