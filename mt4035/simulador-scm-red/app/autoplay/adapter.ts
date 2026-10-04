/** Adaptador del simulador SCM para las herramientas de auto-juego (export default). */
import type { AutoplayAdapter } from "@mt4035/sim-tools";
import { CATEGORIES, createScmEngine, params, scmConfig, scoreRun, type Params, type RegionId, type ScmState, type Strategy } from "../src/index.ts";
import { baselineVector, bots, canonicalVector, searchSpace } from "./bots.ts";
import { properties } from "./properties.ts";

const RATIOS = ["OSA", "OTIF", "OFR", "WASTE", "LOST_SALES", "INFO_MATURITY", "TRUST", ...CATEGORIES.flatMap((c) => [`OSA_${c.toUpperCase()}`, `WASTE_${c.toUpperCase()}`])];

const adapter: AutoplayAdapter<ScmState, Params> = {
  sim: "mt4035-scm",
  createEngine: () => createScmEngine(),
  scenarios: ["kaigan", "redriver", "valle"],
  strategies: ["freshness", "lowcost", "convenience"],
  config: (scenario, seed) => scmConfig({ region: scenario as RegionId, seed }),
  score: (reports, strategy, scenario) => scoreRun(reports, strategy as Strategy, params, scenario as RegionId).score,
  bots,
  check: (reports) => {
    const problems: string[] = [];
    if (reports.length !== 20) problems.push(`épocas jugadas: ${reports.length}`);
    for (const r of reports) {
      for (const [k, v] of Object.entries(r.kpis)) if (!Number.isFinite(v)) problems.push(`${r.label} ${k} no finito`);
      for (const k of RATIOS) if (!(r.kpis[k]! >= 0 && r.kpis[k]! <= 1)) problems.push(`${r.label} ${k}=${r.kpis[k]} fuera de [0, 1]`);
      if (!(r.kpis.ITR! > 0)) problems.push(`${r.label} ITR ≤ 0`);
    }
    return problems.slice(0, 10);
  },
  coverage: {
    kpis: ["OSA", "OTIF", "WASTE", "CTS_PCT", "ITR", "LOST_SALES", "EBITDA_PCT", "TRUCKS", "BWR", "SALES"],
    threshold: 0.1,
    minAbs: { OSA: 0.01, OTIF: 0.01, WASTE: 0.005, CTS_PCT: 0.005, LOST_SALES: 0.005, EBITDA_PCT: 0.01, ITR: 2, TRUCKS: 0.3, BWR: 0.1 },
  },
  trackKpis: ["OSA", "BWR", "CTS_PCT", "WASTE", "OTIF"],
  properties,
  search: {
    bot: "H",
    space: searchSpace as unknown as Record<string, readonly (string | number | boolean)[]>,
    ordinal: ["dcCount", "csl", "freshFreq", "ambientFreq"],
    notBound: { dcCount: [-1] },
    baseline: (scenario) => baselineVector(scenario),
    canonicalize: (v, scenario) => canonicalVector(v as Parameters<typeof canonicalVector>[0], scenario) as typeof v,
    groups: [
      ["dcCount", "dcType", "flowFresh", "flowAmbient"],
      ["dcCount", "flowChilled", "flowFrozen"],
      ["flowFresh", "freshFreq"],
    ],
  },
};

export default adapter;
