import { it } from "vitest";
import { playGame } from "@mt4035/sim-core/testing";
import { createLastMileEngine, lmConfig } from "../src/index.ts";
it("kinds", () => {
  const eng = createLastMileEngine();
  for (const territory of ["megalopolis", "bajio", "norte"] as const) {
    const r = playGame(eng, lmConfig({ territory, test: { events: "off", noise: 0 } }), undefined, 1).reports[0]!.kpis;
    console.log(`${territory}: CPD=${r.CPD!.toFixed(2)} URBAN=${r.CPD_URBAN!.toFixed(2)} REMOTE=${r.CPD_REMOTE!.toFixed(2)} RURAL=${r.CPD_RURAL!.toFixed(2)} STOPS=${r.STOPS_ROUTE!.toFixed(1)} STOPS_RURAL=${r.STOPS_RURAL!.toFixed(1)} LH=${r.LINEHAUL_KM!.toFixed(1)}`);
  }
});
