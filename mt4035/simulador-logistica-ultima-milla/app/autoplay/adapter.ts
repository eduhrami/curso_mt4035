/** Adaptador del simulador de última milla para las herramientas de auto-juego (export default). */
import type { AutoplayAdapter } from "@mt4035/sim-tools";
import { createLastMileEngine, lmConfig, params, scoreRun, type LmState, type Params, type Strategy, type TerritoryId } from "../src/index.ts";
import { baselineVector, bots, canonicalVector, searchSpace, type Vec } from "./bots.ts";
import { properties } from "./properties.ts";

const RATIOS = ["OTD", "OTD_P95", "OTIF", "FADS", "FADS_P95", "PERFECT", "ETA_ACC", "VEHICLE_UTIL", "NODE_UTIL", "SPOIL_RATE", "STORE_OSA", "BACKLOG", "REJECTED", "CANCELLED", "EXCEPTION_RATE", "ROUTE_EFF", "EMPTY_MILES", "FLEET_SHORT"];

const adapter: AutoplayAdapter<LmState, Params> = {
  sim: "mt4035-lastmile",
  createEngine: () => createLastMileEngine(),
  scenarios: ["megalopolis", "bajio", "norte"],
  strategies: ["speed", "reliability", "efficiency"],
  config: (scenario, seed) => lmConfig({ territory: scenario as TerritoryId, seed }),
  score: (reports, strategy, scenario) => scoreRun(reports, strategy as Strategy, params, scenario as TerritoryId).score,
  bots,
  check: (reports) => {
    const problems: string[] = [];
    if (reports.length !== 36) problems.push(`épocas jugadas: ${reports.length}`);
    for (const r of reports) {
      for (const [k, v] of Object.entries(r.kpis)) if (!Number.isFinite(v)) problems.push(`${r.label} ${k} no finito`);
      for (const k of RATIOS) if (!(r.kpis[k]! >= 0 && r.kpis[k]! <= 1 + 1e-12)) problems.push(`${r.label} ${k}=${r.kpis[k]} fuera de [0, 1]`);
      if (r.kpis.OTIF! > r.kpis.OTD! + 1e-12) problems.push(`${r.label} OTIF > OTD`);
      if (!(r.kpis.CSAT! >= 1 && r.kpis.CSAT! <= 5)) problems.push(`${r.label} CSAT=${r.kpis.CSAT}`);
      if (!(r.kpis.CPD! > 0)) problems.push(`${r.label} CPD ≤ 0`);
    }
    return problems.slice(0, 10);
  },
  coverage: {
    kpis: ["ORDERS", "OTD", "OTD_P95", "FADS", "CPD", "CSAT", "SPOIL_RATE", "BACKLOG", "VEHICLE_UTIL", "MARGIN_PCT", "CYCLE_HOURS", "EXCEPTION_RATE"],
    threshold: 0.1,
    minAbs: { OTD: 0.01, OTD_P95: 0.02, FADS: 0.01, CPD: 0.2, CSAT: 0.05, SPOIL_RATE: 0.005, BACKLOG: 0.01, VEHICLE_UTIL: 0.02, MARGIN_PCT: 0.01, CYCLE_HOURS: 1, EXCEPTION_RATE: 0.005, ORDERS: 500 },
  },
  trackKpis: ["OTD", "OTD_P95", "CPD", "CYCLE_HOURS", "VEHICLE_UTIL", "CSAT", "EXCEPTION_RATE", "BACKLOG"],
  properties,
  search: {
    bot: "I",
    space: searchSpace as unknown as Record<string, readonly (string | number | boolean)[]>,
    ordinal: ["zones", "window", "buffer", "sfsShare"],
    // Solo los extremos "activos" de cada palanca alertan; apagarla (0% SFS, sin holgura, ventana de
    // todo el día) es una respuesta legítima.
    bounds: { zones: [3, 30], window: ["1h"], buffer: [0.3], sfsShare: [1] },
    baseline: (scenario) => baselineVector(scenario),
    canonicalize: (v) => canonicalVector(v as Vec) as typeof v,
    groups: [
      ["window", "eta"],
      ["sfsShare", "assignment"],
      ["routing", "data"],
    ],
  },
};

export default adapter;
