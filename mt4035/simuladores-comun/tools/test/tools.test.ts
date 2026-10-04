import { describe, expect, it } from "vitest";
import { makeTasks, parseArgs, parseSeeds, Results, type RunRecord } from "../src/index.ts";

const rec = (bot: string, seed: number, score: number): RunRecord => ({
  bot, scenario: "x", seed, ok: true, problems: [], scores: { s: score }, kpiMeans: {}, series: {}, coverage: 1, changes: 0, unexplained: [], ms: 1,
});

describe("sim-tools", () => {
  it("parseSeeds acepta conteo y rango", () => {
    expect(parseSeeds("3")).toEqual([1, 2, 3]);
    expect(parseSeeds("10-12")).toEqual([10, 11, 12]);
  });
  it("parseArgs separa banderas y posicionales", () => {
    expect(parseArgs(["a.json", "--seeds", "5", "--search", "--out=r"])).toEqual({ positional: ["a.json"], flags: { seeds: "5", search: "true", out: "r" } });
  });
  it("makeTasks genera escenario × semilla × bot", () => {
    expect(makeTasks({ bots: ["A", "B"], scenarios: ["k"], seeds: [1, 2] })).toHaveLength(4);
  });
  it("Results: resumen, posición con empates, porción de semillas y diferencia pareada", () => {
    const r = new Results([rec("A", 1, 10), rec("B", 1, 20), rec("A", 2, 30), rec("B", 2, 20)], ["s"]);
    expect(r.summary("A", "x", "s").mean).toBe(20);
    expect(Results.rank({ A: 1, B: 2, C: 2 }, "B")).toBe(1.5);
    expect(r.shareOfSeeds("x", ["A", "B"], (s) => s("B").scores.s! > s("A").scores.s!)).toBe(0.5);
    expect(r.pairedDiff("B", "A", "x", "s")).toEqual([10, -10]);
  });
});
