/**
 * Generador de la demanda histórica para el Modelador de series de tiempo (mt4035/modelador-series-tiempo/).
 * Reproduce en el navegador el CSV de la pestaña «Pronóstico» del simulador a partir de región, escenario y semilla,
 * con el mismo código del motor (drawTruth + demandCsv). Se empaqueta con esbuild (ver construir.py).
 */
import { createRng } from "@mt4035/sim-core";
import paramsJson from "../params/params.v1.json" with { type: "json" };
import { demandCsv, drawTruth } from "../src/forecast.ts";
import { PRESETS } from "../src/presets.ts";
import type { Params, RegionId } from "../src/types.ts";

const params = paramsJson as Params;

/**
 * CSV igual al que descarga el simulador: la historia (104 semanas) y las semanas anteriores a `untilWeek`
 * (0 = A1-T1, 52 = A2-T1, 104 = A3-T1). Es la demanda del mercado: no depende de las decisiones del equipo.
 */
export function historyCsv(region: RegionId, presetId: string, seed: number, untilWeek = 0): string {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`Escenario desconocido: ${presetId}`);
  const truth = drawTruth(createRng(seed), params, region, preset.market);
  return demandCsv({ truth, region, market: preset.market }, params, seed, untilWeek, 1);
}

export const presets = PRESETS.map((p) => ({ id: p.id, title: p.title, seed: p.seed }));
