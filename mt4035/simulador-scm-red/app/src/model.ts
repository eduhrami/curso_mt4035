/** Ensamblado del modelo SCM como ModelDef de sim-core. */
import { createEngine, quarterLabel, type EpochContext, type GameConfig, type GameState, type ModelDef } from "@mt4035/sim-core";
import paramsJson from "../params/params.v1.json" with { type: "json" };
import { decisions } from "./decisions.ts";
import { events } from "./events.ts";
import { aggregate } from "./kpis.ts";
import { rules } from "./rules.ts";
import { allocate, initialState } from "./scenario.ts";
import { scmTick } from "./tick.ts";
import { DEFAULT_MARKET, type Params, type RegionId, type Scenario, type ScmState } from "./types.ts";

export const SIM_ID = "mt4035-scm";
export const SIM_VERSION = "0.6.0";
export const params: Params = paramsJson;
export const PARAMS_VERSION = params.version;
/** Horizonte de la partida: 3 años × 4 trimestres (AD-37, igual que última milla). */
export const EPOCHS = params.epochs;
export const YEARS = EPOCHS / 4;

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

  // Madurez del CPFR (D-33): el pronóstico conjunto mejora durante varios trimestres después de implantarse.
  const cpfr = s.dec.collaboration === "cpfr" ? Math.min(1, Math.max(0, (e - s.cpfrSince) * p.info.cpfr.maturityPerEpoch)) : 0;
  if (cpfr !== s.cpfrMaturity) ctx.log({ kind: "trend", id: "D-33", kpis: ["OSA", "ITR", "WASTE", "LT", "OTIF", "LOST_SALES", "SALES", "EBITDA_PCT"], drivers: [{ label: "madurez del CPFR", value: Math.round(cpfr * 100) / 100, ref: "D-33" }] });
  s.cpfrMaturity = cpfr;

  // Tiendas: cierres manuales por zona (D-09) que vencen esta época.
  const closing = s.pendingClosures.filter((c) => c.epoch <= e);
  s.pendingClosures = s.pendingClosures.filter((c) => c.epoch > e);
  for (const c of closing) {
    const z = s.zones[c.zone]!;
    const n = Math.min(c.stores, z.stores);
    z.stores -= n;
    ctx.log({ kind: "trend", id: "D-09", kpis: ["SALES", "DEMAND", "STORES", "CTS_STORE", "CTS_PCT", "EBITDA_PCT", "TRUCKS", "ITR"], drivers: [{ label: `tiendas cerradas en la zona ${c.zone}`, value: n }] });
  }

  // Tiendas: lotes de apertura (D-08) que vencen esta época, ubicados según la estrategia de apertura (D-05).
  const lots = s.pendingOpenings.filter((o) => o.epoch <= e).reduce((a, o) => a + o.stores, 0);
  s.pendingOpenings = s.pendingOpenings.filter((o) => o.epoch > e);
  const delta = lots;
  if (delta > 0) {
    const weights = s.zones.map((z) => {
      switch (s.dec.openingStrategy) {
        case "dominance":
          return z.stores > 0 ? z.stores ** 1.5 : 0;
        case "dispersed":
          return 1;
        default:
          return z.stores + 1;
      }
    });
    const alloc = allocate(delta, weights.every((w) => w === 0) ? s.zones.map(() => 1) : weights);
    s.zones.forEach((z, i) => {
      z.stores += alloc[i]!;
    });
    ctx.log({ kind: "trend", id: "D-08", kpis: ["SALES", "DEMAND", "STORES", "CTS_STORE", "CTS_PCT", "EBITDA_PCT", "TRUCKS", "ITR"], drivers: [{ label: "tiendas abiertas", value: delta }] });
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
  // Los mensajes citan el pronóstico del equipo (F-01), nunca el proceso verdadero (§4.4).
  const fc = s.dec.demandForecast;
  const quarter = ["T1", "T2", "T3", "T4"][e % 4];
  ctx.log({
    kind: "trend",
    id: "E-20",
    kpis: ["DEMAND", "SALES", "CTS_PCT", "CTS_STORE", "EBITDA_PCT", "ITR", "LOST_SALES", "OSA", "WASTE"],
    drivers: [
      { label: `estacionalidad de ${quarter} (tu índice pronosticado: ×${(fc.quarters[e % 4]! / (fc.quarters.reduce((a, b) => a + b, 0) / 4)).toFixed(2)})`, ref: "E-21" },
      { label: `inventario planeado con tu pronóstico: crecimiento ${Math.round(fc.growth * 100)}% anual`, ref: "F-01" },
    ],
  });
}

export const scmModel: ModelDef<ScmState, Params, Scenario> = {
  id: SIM_ID,
  version: SIM_VERSION,
  calendar: { epochs: params.epochs, ticksPerEpoch: () => params.weeksPerEpoch, label: quarterLabel },
  decisions,
  init: (config, p, rng) => initialState(config as GameConfig<Scenario>, p, rng),
  onEpochStart,
  tick: scmTick,
  rules,
  events,
  aggregate,
  validateTurn: (state, costs, p) => {
    const b = capexBudget(state, p);
    // Todas las decisiones con costo consumen el tope: inversión e indemnizaciones por cierre.
    const capex = costs.filter((c) => c.amount > 0);
    const total = capex.reduce((a, c) => a + c.amount, 0);
    if (!b || total <= b.remaining + 1e-6) return [];
    const usd = (x: number) => `US$ ${(x / 1e6).toFixed(1)} M`;
    const message = `Tope de inversión de A${b.year + 1}: te quedan ${usd(Math.max(0, b.remaining))} de ${usd(b.budget)} y este trimestre suma ${usd(total)}. Prioriza o difiere alguna inversión al año siguiente.`;
    return capex.map((c) => ({ id: c.id, message }));
  },
  onEpochEnd: (ctx, kpis) => {
    ctx.state.epoch = ctx.epoch + 1;
    ctx.state.lastEpochOsa = kpis.OSA ?? 1;
  },
};

export const createScmEngine = (p: Params = params) => createEngine(scmModel, p);

/** Presupuesto de inversión del año en curso (AD-43): tope, lo ya gastado en decisiones (inversión e indemnizaciones por cierre) y lo que queda. */
export function capexBudget(state: GameState<ScmState>, p: Params = params): { budget: number; spent: number; remaining: number; year: number } | null {
  const budget = p.money.capexBudgetPerYear[state.model.region as RegionId] ?? 0;
  if (!budget || state.config.test?.budget === "off") return null;
  const year = Math.floor(state.epoch / 4);
  const spent = state.history
    .filter((h) => Math.floor(h.epoch / 4) === year)
    .flatMap((h) => h.ledger)
    .filter((l) => l.source.startsWith("D-"))
    .reduce((a, l) => a + l.amount, 0);
  return { budget, spent, remaining: budget - spent, year };
}

export interface ScmConfigOptions {
  seed?: number;
  region?: Scenario["region"];
  strategy?: Scenario["strategy"];
  market?: Partial<Scenario["market"]>;
  greenfield?: boolean;
  preset?: string;
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
      ...(o.preset ? { preset: o.preset } : {}),
    },
    ...(o.test ? { test: o.test } : {}),
    ...(o.player ? { player: o.player } : {}),
  };
}
