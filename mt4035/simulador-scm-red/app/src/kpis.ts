/** KPIs por época (especificación §7.1). Siglas en inglés; proporciones en [0, 1]. */
import type { EpochContext } from "@mt4035/sim-core";
import { activeDcs } from "./network.ts";
import { CATEGORIES, type Params, type ScmState } from "./types.ts";

export function aggregate(ctx: EpochContext<ScmState, Params>): Record<string, number> {
  const ms = ctx.tickMetrics;
  const weeks = ms.length;
  const tot = (k: string) => ms.reduce((a, m) => a + (m[k] ?? 0), 0);
  const avg = (k: string) => (weeks ? tot(k) / weeks : 0);
  const ratio = (a: number, b: number, empty = 0) => (b > 0 ? a / b : empty);

  const demand = tot("demand");
  const revenue = tot("revenue");
  const cogs = tot("cogs");
  const gm = tot("gm");
  const cts = tot("transport") + tot("handling") + tot("dcFixed") + tot("receivingCost") + tot("carrying");
  const avgInv = avg("invValue") + avg("dcInvValue");
  const annual = 52 / Math.max(weeks, 1);
  const itr = ratio(cogs * annual, avgInv);
  const stores = avg("stores");

  const k: Record<string, number> = {
    STORES: stores,
    DC_COUNT: activeDcs(ctx.state, ctx.epoch).length,
    DEMAND: demand,
    SALES: revenue,
    OSA: ratio(tot("sold"), demand, 1),
    OTIF: ratio(tot("otifDeliveries"), tot("deliveries"), 1),
    OFR: weeks ? ms.reduce((a, m) => a + (m.ofrProduct ?? 1), 0) / weeks : 1,
    ITR: itr,
    DOI: itr > 0 ? 365 / itr : 0,
    CTS: cts,
    CTS_PCT: ratio(cts, revenue),
    CTS_STORE: ratio(cts, stores * Math.max(weeks, 1)),
    WASTE: ratio(tot("waste") + tot("excursion"), tot("received")),
    LOST_SALES: ratio(tot("lost"), demand),
    BWR: ratio(tot("bwrWeighted"), demand, 1),
    TRUCKS: avg("trucksPerStoreDay"),
    GMROI: ratio(gm * annual, avgInv),
    LT: ratio(tot("ltWeighted"), demand),
    LT_SD: ratio(tot("ltSdWeighted"), demand),
    EBITDA: tot("ebitda"),
    EBITDA_PCT: ratio(tot("ebitda"), revenue),
    INFO_MATURITY: ctx.state.infoMaturity,
    TRUST: ratio(tot("trustW"), tot("stores"), 1),
    DC_DIST_KM: ratio(tot("dcDistKmW"), tot("dcDeliveries")),
    STOPS_PER_ROUTE: ratio(tot("dcDeliveries"), tot("dcRoutes")),
  };
  for (const c of CATEGORIES) {
    const key = c.toUpperCase();
    k[`OSA_${key}`] = ratio(tot(`sold_${c}`), tot(`demand_${c}`), 1);
    k[`WASTE_${key}`] = ratio(tot(`waste_${c}`), tot(`received_${c}`));
  }
  return k;
}
