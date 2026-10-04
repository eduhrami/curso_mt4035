import { it } from "vitest";
import { playGame } from "@mt4035/sim-core/testing";
import { createLastMileEngine, lmConfig, params, scoreRun } from "../src/index.ts";

const KP = ["ORDERS", "OTD", "OTD_P95", "FADS", "CPD", "CPD_P95", "STOPS_ROUTE", "VEHICLE_UTIL", "SPOIL_RATE", "EXCEPTION_RATE", "CSAT", "CYCLE_HOURS", "MARGIN_PCT", "SHIP_PCT", "BACKLOG", "ETA_ACC", "OWN_FLEET"];
const f = (k: string, v: number) => (["ORDERS"].includes(k) ? v.toFixed(0) : Math.abs(v) < 2 ? v.toFixed(3) : v.toFixed(1));

it("diagnóstico", () => {
  const eng = createLastMileEngine();
  for (const territory of ["megalopolis", "bajio", "norte"] as const) {
    const t0 = performance.now();
    const { reports } = playGame(eng, lmConfig({ territory, test: { events: "off", noise: 0 } }));
    const ms = performance.now() - t0;
    const show = (i: number) => KP.map((k) => `${k}=${f(k, reports[i]!.kpis[k]!)}`).join(" ");
    console.log(`\n### ${territory} as-is (${ms.toFixed(0)} ms)\n M01 ${show(0)}\n M11 ${show(10)}\n M12 ${show(11)}`);
    for (const st of ["speed", "reliability", "efficiency"] as const) console.log(`  score ${st}: ${scoreRun(reports, st, params, territory).score.toFixed(1)}`);
  }
});
