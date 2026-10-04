/** Mide el tiempo medio de una partida completa (npm run perf). */
import { playGame } from "@mt4035/sim-core/testing";
import { createScmEngine, scmConfig } from "../src/index.ts";
const eng = createScmEngine();
const t0 = performance.now();
for (let s = 1; s <= 40; s++) playGame(eng, scmConfig({ region: "valle", seed: s }));
console.log(`${((performance.now() - t0) / 40).toFixed(1)} ms/partida`);
