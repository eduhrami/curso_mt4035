/**
 * Adaptador para refinar la red óptima (npm run network-optima): el escenario puede llevar un escenario de
 * mercado predefinido («valle@EM-04») y el puntaje de cada estrategia es la utilidad acumulada en M USD.
 * El bot «N» juega un vector del buscador con la lista de CD explícita (zonas fijas).
 */
import type { AutoplayAdapter } from "@mt4035/sim-tools";
import type { Policy } from "@mt4035/sim-core/testing";
import { params, PRESETS, profitFor, scmConfig, truthForecast, type DcSpec, type Params, type RegionId, type ScmState, type Strategy } from "../src/index.ts";
import base from "./adapter.ts";
import { bots, vectorPolicy } from "./bots.ts";
import { withBudget } from "./budget.ts";

export type Vec = Parameters<typeof vectorPolicy>[0];
export interface NetworkArgs {
  v: Vec;
  /** Lista explícita de CD; sin ella se usa la ubicación del buscador (spreadZones) o la red actual. */
  dcs?: DcSpec[];
  /** Factor del pronóstico (error de nivel): 0.9 / 1.1 como un equipo típico (AD-40). */
  k?: number;
}

export const regionOf = (scenario: string) => scenario.split("@")[0] as RegionId;

/** El vector del buscador con la red de CD reemplazada por una lista explícita (flujos y dependencias coherentes). */
export function explicitPolicy({ v, dcs }: NetworkArgs): Policy<ScmState> {
  const inner = vectorPolicy(v);
  return (s, e) => {
    const ch = inner(s, e);
    if (e !== 0 || !dcs) return ch;
    // Los CD que ya existen conservan su zona de la partida (depende de la semilla); solo los nuevos llevan zona fija.
    const current = new Map(s.model.dcs.map((d) => [d.id, d.zone]));
    const net = dcs.map((d) => (current.has(d.id) ? { ...d, zone: current.get(d.id)! } : d));
    const hasDc = net.length > 0;
    const flows = ch["D-10"] as Record<string, "dc" | "dsd">;
    return {
      ...ch,
      "D-01": net,
      "D-10": hasDc ? flows : { fresh: "dsd", chilled: "dsd", ambient: "dsd", frozen: "dsd" },
      "D-12": v.consolidation === "combined" && net.some((d) => d.type === "combined") ? "combined" : "supplier",
      "D-24": net.some((d) => d.type === "stocking") ? v.dcSafetyDays : 0,
    };
  };
}

const withForecast =
  (pol: Policy<ScmState>, k = 1): Policy<ScmState> =>
  (s, e) => {
    if (e % 4 !== 0) return pol(s, e);
    const f = truthForecast(s.model, params, e / 4);
    return { "F-01": { ...f, level: f.level * k, p95: f.p95 * k }, ...pol(s, e) };
  };

const adapter: AutoplayAdapter<ScmState, Params> = {
  ...base,
  config: (scenario, seed) => {
    const [region, preset] = scenario.split("@");
    const p = PRESETS.find((x) => x.id === preset);
    return scmConfig({ region: region as RegionId, seed, ...(p ? { market: p.market, preset: p.id } : {}) });
  },
  score: (reports, strategy, scenario) => profitFor(reports, strategy as Strategy, params, regionOf(scenario)) / 1e6,
  searchScore: undefined,
  bots: [
    // Los bots de referencia reciben la región (sin el escenario de mercado) y el mismo error de pronóstico (args.k).
    ...bots.map((b) => ({
      ...b,
      policy: (seed: number, scn: string, args?: unknown): Policy<ScmState> => {
        const inner = b.policy(seed, regionOf(scn), args);
        const k = (args as { k?: number } | undefined)?.k ?? 1;
        return (s, e) => {
          const ch = inner(s, e);
          const f = ch["F-01"] as { level: number; p95: number } | undefined;
          return f && k !== 1 ? { ...ch, "F-01": { ...f, level: f.level * k, p95: f.p95 * k } } : ch;
        };
      },
    })),
    { id: "N", label: "Red explícita", purpose: "Refinamiento de la ubicación de CD", policy: (_seed, _scn, args) => withForecast(withBudget(explicitPolicy(args as NetworkArgs)), (args as NetworkArgs).k ?? 1) },
  ],
};

export default adapter;
