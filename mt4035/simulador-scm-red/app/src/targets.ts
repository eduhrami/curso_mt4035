/** Meta de utilidad para autoevaluarse (src/targets.json, generado por autoplay/targets.ts). */
import data from "./targets.json" with { type: "json" };
import { presetOf } from "./presets.ts";
import type { Scenario, Strategy } from "./types.ts";

export interface ProfitTarget {
  /** Utilidad acumulada de 3 años en USD. */
  value: number;
  /** Escenario de mercado predefinido al que corresponde, o null si es la referencia del mercado base. */
  preset: string | null;
  /** La corrida usa la semilla del escenario predefinido (si no, la meta es solo orientativa). */
  sameSeed: boolean;
}

type Table = Record<string, Record<string, Record<string, number>>>;

export function profitTarget(scenario: Scenario, strategy: Strategy, seed: number): ProfitTarget | null {
  const t = data.targets as Table;
  const p = presetOf(scenario);
  const m = t[p?.id ?? "base"]?.[scenario.region]?.[strategy];
  if (m === undefined || scenario.greenfield) return null;
  return { value: m * 1e6, preset: p?.id ?? null, sameSeed: p ? p.seed === seed : false };
}
