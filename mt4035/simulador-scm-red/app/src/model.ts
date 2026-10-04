/** Ensamblado del modelo SCM como ModelDef de sim-core. */
import { createEngine, quarterLabel, type EpochContext, type GameConfig, type ModelDef } from "@mt4035/sim-core";
import paramsJson from "../params/params.v1.json";
import { decisions } from "./decisions.ts";
import { events } from "./events.ts";
import { aggregate } from "./kpis.ts";
import { rules } from "./rules.ts";
import { allocate, initialState } from "./scenario.ts";
import { scmTick } from "./tick.ts";
import { DEFAULT_MARKET, type Params, type Scenario, type ScmState } from "./types.ts";

export const SIM_ID = "mt4035-scm";
export const SIM_VERSION = "0.1.0";
export const params: Params = paramsJson;
export const PARAMS_VERSION = params.version;

/** Aperturas/cierres, evolución de la dispersión, madurez de TI y activaciones de CD al inicio de la época. */
function onEpochStart(ctx: EpochContext<ScmState, Params>): void {
  const s = ctx.state;
  const p = ctx.params;
  const e = ctx.epoch;
  const r = p.regions[s.region];

  for (const dc of s.dcs) {
    if (dc.activeFrom === e) ctx.log({ kind: "activation", id: "D-01", kpis: ["CTS_PCT", "CTS_STORE", "OTIF", "OSA", "WASTE", "LT", "TRUCKS", "ITR", "BWR", "LOST_SALES", "SALES", "EBITDA_PCT"], drivers: [{ label: `${dc.id} entra en operación (${dc.type}, ${dc.size})`, ref: "D-01" }] });
    if (dc.typeFrom === e) ctx.log({ kind: "activation", id: "D-03", kpis: ["WASTE", "OSA", "ITR", "CTS_PCT", "TRUCKS", "LOST_SALES", "EBITDA_PCT"], drivers: [{ label: `${dc.id} opera como ${dc.type}`, ref: "D-03" }] });
    if (dc.sizeFrom === e) ctx.log({ kind: "activation", id: "D-04", kpis: ["OTIF", "WASTE", "OSA", "CTS_PCT", "EBITDA_PCT"], drivers: [{ label: `${dc.id} amplía a ${dc.size}`, ref: "D-04" }] });
  }

  // Madurez del sistema de información (D-30): 0 al implantarse, +0.5 por época.
  const maturity = s.dec.info === "basic" ? 1 : Math.min(1, Math.max(0, (e - s.infoSince) * p.info.maturityPerEpoch));
  if (maturity !== s.infoMaturity) ctx.log({ kind: "trend", id: "D-30", kpis: ["OSA", "ITR", "WASTE", "LOST_SALES", "SALES", "EBITDA_PCT"], drivers: [{ label: "madurez del sistema de información", value: maturity, ref: "D-30" }] });
  s.infoMaturity = maturity;

  // Tiendas: ritmo anual (D-06) + lotes (D-08) que vencen esta época.
  const total = s.zones.reduce((a, z) => a + z.stores, 0);
  const byRate = Math.round((total * s.dec.openingRate) / 4);
  const lots = s.pendingOpenings.filter((o) => o.epoch <= e).reduce((a, o) => a + o.stores, 0);
  s.pendingOpenings = s.pendingOpenings.filter((o) => o.epoch > e);
  const delta = byRate + lots;
  if (delta !== 0) {
    const weights = s.zones.map((z) => {
      if (delta < 0) return z.stores;
      switch (s.dec.openingStrategy) {
        case "dominance":
          return z.stores > 0 ? z.stores ** 1.5 : 0;
        case "dispersed":
          return 1;
        default:
          return z.stores + 1;
      }
    });
    const alloc = allocate(Math.abs(delta), weights.every((w) => w === 0) ? s.zones.map(() => 1) : weights);
    s.zones.forEach((z, i) => {
      z.stores = Math.max(0, z.stores + Math.sign(delta) * alloc[i]!);
    });
    if (byRate > 0) ctx.charge("capex", byRate * p.stores.capex * r.storeCapexMult, "D-06", "aperturas por ritmo anual");
    if (byRate < 0) ctx.charge("opex", -byRate * p.stores.closureCost, "D-06", "cierres por ritmo anual");
    ctx.log({ kind: "trend", id: delta === lots ? "D-08" : "D-06", kpis: ["SALES", "DEMAND", "STORES", "CTS_STORE", "CTS_PCT", "EBITDA_PCT", "TRUCKS", "ITR"], drivers: [{ label: "tiendas abiertas/cerradas", value: delta }] });
  }

  // Dispersión (D-05): solo cambia con aperturas; las tiendas nuevas se ubican según la estrategia.
  if (delta > 0) {
    const target = p.density.spreadTarget[s.dec.openingStrategy];
    const after = s.zones.reduce((a, z) => a + z.stores, 0);
    const frac = Math.min(1, (2 * delta) / Math.max(after, 1));
    for (const z of s.zones) z.spread += (target - z.spread) * frac;
    ctx.log({ kind: "trend", id: "D-05", kpis: ["CTS_STORE", "SALES", "DEMAND"], drivers: [{ label: "dispersión media de tiendas", value: Math.round((s.zones.reduce((a, z) => a + z.spread, 0) / s.zones.length) * 100) / 100, ref: "D-05" }] });
  }

  if (s.market.demographics === "aging") s.mixShift += p.markets.agingFreshShiftPerYear / 4;
  // Estacionalidad y crecimiento mueven la demanda y, con costos fijos, los KPIs relativos a ventas.
  const amp = p.markets.seasonality[s.market.seasonality];
  const growth = p.markets.growth[s.market.growth];
  if (amp > 0 || growth > 0) {
    const quarter = ["T1", "T2", "T3", "T4"][e % 4];
    ctx.log({
      kind: "trend",
      id: "E-20",
      kpis: ["DEMAND", "SALES", "CTS_PCT", "CTS_STORE", "EBITDA_PCT", "ITR", "LOST_SALES", "OSA", "WASTE"],
      drivers: [
        { label: `estacionalidad (${quarter}, amplitud ±${Math.round(amp * 100)}%)`, ref: "E-21" },
        { label: `crecimiento anual de la demanda ${Math.round(growth * 100)}%`, ref: "E-20" },
      ],
    });
  }
}

export const scmModel: ModelDef<ScmState, Params, Scenario> = {
  id: SIM_ID,
  version: SIM_VERSION,
  calendar: { epochs: 20, ticksPerEpoch: () => params.weeksPerEpoch, label: quarterLabel },
  decisions,
  init: (config, p, rng) => initialState(config as GameConfig<Scenario>, p, rng),
  onEpochStart,
  tick: scmTick,
  rules,
  events,
  aggregate,
  onEpochEnd: (ctx, kpis) => {
    ctx.state.epoch = ctx.epoch + 1;
    ctx.state.lastEpochOsa = kpis.OSA ?? 1;
  },
};

export const createScmEngine = (p: Params = params) => createEngine(scmModel, p);

export interface ScmConfigOptions {
  seed?: number;
  region?: Scenario["region"];
  strategy?: Scenario["strategy"];
  market?: Partial<Scenario["market"]>;
  greenfield?: boolean;
  test?: GameConfig["test"];
  player?: GameConfig["player"];
}

export function scmConfig(o: ScmConfigOptions = {}): GameConfig<Scenario> {
  return {
    simId: SIM_ID,
    simVersion: SIM_VERSION,
    paramsVersion: PARAMS_VERSION,
    seed: o.seed ?? 1,
    scenario: {
      region: o.region ?? "kaigan",
      strategy: o.strategy ?? "freshness",
      market: { ...DEFAULT_MARKET, ...(o.market ?? {}) },
      ...(o.greenfield ? { greenfield: true } : {}),
    },
    ...(o.test ? { test: o.test } : {}),
    ...(o.player ? { player: o.player } : {}),
  };
}
