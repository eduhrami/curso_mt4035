import { it } from "vitest";
import { overrideState } from "@mt4035/sim-core/testing";
import { createLastMileEngine, lmConfig } from "../src/index.ts";
it("minicaso", () => {
  const eng = createLastMileEngine();
  const base = (o: Record<string, unknown>) => {
    let s = eng.createGame(lmConfig({ territory: "minicaso", market: { returns: "fashion", growth: "slow" }, test: { events: "off", noise: 0 } }));
    for (const [k, v] of Object.entries({ "dec.returnsChannel": "pickup", ...o })) s = overrideState(s, k, v);
    const r = eng.confirmEpoch(s).report;
    return r.kpis;
  };
  const sfs = base({ "dec.sfd": { active: false, capacity: "low" }, "dec.sfs": { share: 1, pickers: "6" }, "dec.sfsCap": 0.5 });
  const sfd = base({});
  for (const [n, k] of [["SFS", sfs], ["SFD", sfd]] as const) console.log(`${n}: CPD_URBAN=${k.CPD_URBAN!.toFixed(2)} CPD=${k.CPD!.toFixed(2)} FADS=${k.FADS!.toFixed(3)} OTD=${k.OTD!.toFixed(3)} STOPS=${k.STOPS_ROUTE!.toFixed(1)}`);
});
