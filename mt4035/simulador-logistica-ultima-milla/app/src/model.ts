/** Ensamblado del modelo de última milla como ModelDef de sim-core. */
import { createEngine, monthLabel, type EpochContext, type GameConfig, type ModelDef } from "@mt4035/sim-core";
import paramsJson from "../params/params.v1.json" with { type: "json" };
import { decisions } from "./decisions.ts";
import { events } from "./events.ts";
import { aggregate } from "./kpis.ts";
import { isPeakMonth, monthOf } from "./network.ts";
import { rules } from "./rules.ts";
import { initialState } from "./scenario.ts";
import { lmTick } from "./tick.ts";
import { DEFAULT_MARKET, type LmState, type Params, type Scenario } from "./types.ts";

export const SIM_ID = "mt4035-lastmile";
export const SIM_VERSION = "0.1.0";
export const params: Params = paramsJson;
export const PARAMS_VERSION = params.version;

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const epochName = (e: number) => `${monthLabel(e)} (${MONTHS[e % 12]})`;

/** Redimensiona la flota propia, registra tendencias del mercado y los picos programados del mes. */
function onEpochStart(ctx: EpochContext<LmState, Params>): void {
  const s = ctx.state;
  const p = ctx.params;
  const e = ctx.epoch;
  const mix = p.fleet.mixes[s.dec.fleetMix];
  if (mix.own > 0 && s.needDays > 0) {
    const next = Math.ceil((s.needAccum / s.needDays) * mix.own * p.fleet.ownBuffer[s.dec.fleetBuffer]);
    if (next !== s.ownFleet) ctx.log({ kind: "trend", id: "D-33", kpis: ["VEHICLE_UTIL", "BACKLOG", "CPD", "CPD_P95", "OTD_P95", "MARGIN_PCT"], drivers: [{ label: "flota propia redimensionada (vehículos)", value: next, ref: "D-33" }] });
    s.ownFleet = next;
  }
  if (mix.own === 0) s.ownFleet = 0;
  if (s.needDays > 0) s.baseNeed = s.needAccum / s.needDays;
  s.needAccum = 0;
  s.needDays = 0;

  const growth = p.markets.growth[s.market.growth];
  const peaks = p.peaks.filter((pk) => pk.month === monthOf(e));
  ctx.log({
    kind: "trend",
    id: "E-20",
    kpis: ["ORDERS", "DELIVERED", "REVENUE", "CPD", "CPD_P95", "MARGIN_PCT", "SHIP_PCT", "VEHICLE_UTIL", "STOPS_ROUTE", "BACKLOG", "NODE_UTIL", "OWN_FLEET"],
    drivers: [{ label: `crecimiento anual del canal en línea ${Math.round(growth * 100)}%`, ref: "E-20" }, ...peaks.map((pk) => ({ label: `pico programado: ${pk.name}`, ref: "E-21" }))],
  });
  // El mes siguiente a un pico el servicio se recupera: se registra para explicar el cambio.
  if (e > 0 && isPeakMonth(p, e - 1)) {
    const prev = p.peaks.filter((pk) => pk.month === monthOf(e - 1));
    ctx.log({ kind: "trend", id: "E-21", kpis: ["OTD", "OTD_P95", "FADS", "FADS_P95", "BACKLOG", "CSAT", "CSAT_P95", "CYCLE_HOURS", "EXCEPTION_RATE", "FLEET_SHORT", "PERFECT", "OTIF", "VEHICLE_UTIL", "CPD", "CPD_P95", "ORDERS"], drivers: prev.map((pk) => ({ label: `termina ${pk.name}: la demanda vuelve a su nivel y se limpia el backlog`, ref: "E-21" })) });
  }
  if (isPeakMonth(p, e)) {
    ctx.log({ kind: "trend", id: "E-21", kpis: ["OTD", "OTD_P95", "FADS", "FADS_P95", "BACKLOG", "CSAT", "CSAT_P95", "CYCLE_HOURS", "EXCEPTION_RATE", "FLEET_SHORT", "PERFECT", "OTIF", "SPOIL_RATE", "ETA_ACC"], drivers: peaks.map((pk) => ({ label: `${pk.name}: demanda ×1.3–×2.5 durante ${pk.days} días`, ref: "E-21" })) });
  }
}

export const lastMileModel: ModelDef<LmState, Params, Scenario> = {
  id: SIM_ID,
  version: SIM_VERSION,
  calendar: { epochs: params.epochs, ticksPerEpoch: (e) => params.daysPerMonth[e % 12]!, label: monthLabel },
  decisions,
  init: (config, p, rng) => initialState(config as GameConfig<Scenario>, p, rng),
  onEpochStart,
  tick: lmTick,
  rules,
  events,
  aggregate,
  onEpochEnd: (ctx) => {
    ctx.state.epoch = ctx.epoch + 1;
  },
};

export const createLastMileEngine = (p: Params = params) => createEngine(lastMileModel, p);

export interface LmConfigOptions {
  seed?: number;
  territory?: Scenario["territory"];
  strategy?: Scenario["strategy"];
  market?: Partial<Scenario["market"]>;
  preset?: string;
  test?: GameConfig["test"];
  player?: GameConfig["player"];
}

export function lmConfig(o: LmConfigOptions = {}): GameConfig<Scenario> {
  return {
    simId: SIM_ID,
    simVersion: SIM_VERSION,
    paramsVersion: PARAMS_VERSION,
    seed: o.seed ?? 1,
    scenario: { territory: o.territory ?? "megalopolis", strategy: o.strategy ?? "reliability", market: { ...DEFAULT_MARKET, ...(o.market ?? {}) }, ...(o.preset ? { preset: o.preset } : {}) },
    ...(o.test ? { test: o.test } : {}),
    ...(o.player ? { player: o.player } : {}),
  };
}
