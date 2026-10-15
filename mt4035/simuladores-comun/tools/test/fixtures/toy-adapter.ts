/** Adaptador mínimo sobre el modelo de juguete de sim-core: el puntaje es −OSA y el objetivo de búsqueda, +OSA. */
import { createEngine } from "@mt4035/sim-core";
import type { AutoplayAdapter } from "../../src/index.ts";
import { makeToyModel, toyConfig, toyParams } from "../../../core/test/fixtures/toy-model.ts";

const osa = (reports: readonly { kpis: Record<string, number> }[]) => reports.reduce((a, r) => a + (r.kpis.OSA ?? 0), 0) / Math.max(1, reports.length);

const adapter: AutoplayAdapter = {
  sim: "toy",
  createEngine: () => createEngine(makeToyModel(), toyParams),
  scenarios: ["x"],
  strategies: ["s"],
  config: (_scenario, seed) => toyConfig(seed),
  score: (reports) => -osa(reports),
  searchScore: (reports) => osa(reports),
  searchScoreLabel: "OSA",
  bots: [{ id: "H", label: "Buscador", purpose: "prueba", policy: (_seed, _scn, args) => (_s, e) => (e === 0 ? { "D-01": (args as { freq: number }).freq } : {}) }],
  check: () => [],
  coverage: { kpis: [], threshold: 0.1, minAbs: {} },
  trackKpis: [],
  properties: [],
  search: { bot: "H", space: { freq: [1, 2, 3] }, ordinal: ["freq"] },
};
export default adapter;
