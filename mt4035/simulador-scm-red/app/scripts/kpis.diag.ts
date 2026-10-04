import { it } from "vitest";
import { playGame } from "@mt4035/sim-core/testing";
import { createScmEngine, scmConfig, scoreRun, params } from "../src/index.ts";
import { adaptedDispersed, naiveTransplant } from "../test/helpers/policies.ts";

const KP = ["STORES", "DC_COUNT", "OSA", "OTIF", "OFR", "ITR", "CTS_PCT", "CTS_STORE", "WASTE", "WASTE_FRESH", "OSA_FRESH", "LOST_SALES", "BWR", "TRUCKS", "LT", "EBITDA_PCT"];
const fmt = (k: string, v: number) => (["STORES", "DC_COUNT", "CTS_STORE"].includes(k) ? v.toFixed(0) : v < 2 ? v.toFixed(3) : v.toFixed(1));

it("diagnóstico de KPIs", () => {
  const engine = createScmEngine();
  const runs: [string, ReturnType<typeof scmConfig>, any][] = [
    ["kaigan as-is", scmConfig({ region: "kaigan", test: { events: "off", noise: 0 } }), undefined],
    ["redriver as-is", scmConfig({ region: "redriver", test: { events: "off", noise: 0 } }), undefined],
    ["valle as-is", scmConfig({ region: "valle", test: { events: "off", noise: 0 } }), undefined],
    ["redriver naive", scmConfig({ region: "redriver", test: { events: "off", noise: 0 } }), naiveTransplant()],
    ["redriver adapted", scmConfig({ region: "redriver", test: { events: "off", noise: 0 } }), adaptedDispersed()],
  ];
  for (const [name, cfg, pol] of runs) {
    const { reports } = playGame(engine, cfg, pol);
    const pick = (i: number) => KP.map((k) => `${k}=${fmt(k, reports[i]!.kpis[k]!)}`).join(" ");
    console.log(`\n### ${name}\n E1  ${pick(0)}\n E8  ${pick(7)}\n E20 ${pick(19)}`);
    for (const st of ["freshness", "lowcost", "convenience"] as const) console.log(`  score ${st}: ${scoreRun(reports, st, params).score.toFixed(1)}`);
  }
});
