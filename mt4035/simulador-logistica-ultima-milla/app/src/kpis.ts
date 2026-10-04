/**
 * KPIs mensuales (especificación §7.1). Cada KPI diario tiene promedio y "p95": el 5% de los peores
 * días (percentil 5 para lo que conviene alto, 95 para lo que conviene bajo). El puntaje usa
 * siempre la versión p95; D-61 solo decide qué ve el jugador (R-12).
 */
import { percentile, type EpochContext } from "@mt4035/sim-core";
import { familiarity, routingFactors, zoningKmMult } from "./tick.ts";
import type { LmState, Params } from "./types.ts";

export function aggregate(ctx: EpochContext<LmState, Params>): Record<string, number> {
  const ms = ctx.tickMetrics;
  const p = ctx.params;
  const s = ctx.state;
  const tot = (k: string) => ms.reduce((a, m) => a + (m[k] ?? 0), 0);
  const series = (k: string) => ms.map((m) => m[k] ?? NaN).filter(Number.isFinite);
  const ratio = (a: number, b: number, empty = 0) => (b > 0 ? a / b : empty);
  const handled = tot("handled");
  const revenue = tot("revenue");
  const lastMile = tot("lastMile");
  const csat = ratio(tot("csatW"), handled, 4);
  const t = p.territories[s.territory];
  // Eficiencia contra el mejor diseño posible (IA con datos completos y zonas óptimas).
  const routeEff = Math.min(p.routing.ai.kmMult * p.zoning.dynamic, 1) / (routingFactors(s, p).kmMult * zoningKmMult(s, p, t.ordersPerDay));
  void familiarity;
  return {
    ORDERS: tot("orders"),
    DELIVERED: handled,
    REVENUE: revenue,
    MARGIN: tot("margin"),
    MARGIN_PCT: ratio(tot("margin"), revenue),
    SHIP_PCT: ratio(lastMile, revenue),
    OTD: ratio(tot("onTime"), handled, 1),
    OTD_P95: percentile(series("dayOtd"), 0.05),
    OTIF: ratio(tot("onTime"), handled, 1) * ratio(tot("inFullW"), handled - 0, 1),
    FADS: ratio(tot("firstOk"), tot("attempts"), 1),
    FADS_P95: percentile(series("dayFads"), 0.05),
    PERFECT: ratio(tot("perfectW"), handled, 1),
    CPD: lastMile / Math.max(tot("successful"), 1),
    CPD_P95: percentile(series("dayCpd"), 0.95),
    CYCLE_HOURS: ratio(tot("cycleW"), handled),
    ETA_ACC: ratio(tot("etaW"), handled, 1),
    EXCEPTION_RATE: ratio(tot("exceptions"), handled),
    SPOIL_RATE: ratio(tot("spoiled"), tot("freshTotal")),
    RETURN_COST: ratio(tot("returnsCost"), handled * p.markets.returnRate[s.market.returns]),
    CSAT: csat,
    CSAT_P95: percentile(series("dayCsat"), 0.05),
    NPS: Math.max(-100, Math.min(100, (csat - 3.5) * 80)),
    ROUTE_EFF: Math.min(1, routeEff),
    VEHICLE_UTIL: ratio(tot("stops"), tot("capStops") + tot("idleCapStops")),
    STOPS_ROUTE: ratio(tot("stops"), tot("routes")),
    STOPS_HOUR: ratio(tot("stops"), tot("routeHours")),
    EMPTY_MILES: ratio(tot("emptyKm"), tot("km")),
    CO2: ratio(tot("co2"), handled),
    NODE_UTIL: Math.max(0, ...series("maxNodeUtil")),
    STORE_OSA: ms.length ? tot("storeOsa") / ms.length : 1,
    // Proporción de la carga del día (nuevos + atrasados) que no se entregó.
    BACKLOG: ratio(tot("backlogOut"), tot("orders") + tot("carried")),
    REJECTED: ratio(tot("rejected"), tot("orders") + tot("rejected")),
    CANCELLED: ratio(tot("cancelled"), tot("orders") + tot("backlogIni")),
    CPD_URBAN: ratio(tot("costUrban"), tot("delivUrban")),
    CPD_REMOTE: ratio(tot("costRemote"), tot("delivRemote")),
    CPD_RURAL: ratio(tot("costRural"), tot("delivRural")),
    STOPS_RURAL: ratio(tot("stopsRural"), tot("routesRural")),
    LINEHAUL_KM: ratio(tot("linehaulW"), handled),
    DARK_STORES: s.dec.darkStores,
    MFC_COUNT: s.dec.mfc,
    LOCKERS: s.dec.lockers,
    SFS_SHARE: s.dec.sfs.share,
    BOPIS: s.dec.bopis ? 1 : 0,
    FLEET_SHORT: ms.length ? tot("fleetShort") / ms.length : 0,
    OWN_FLEET: ms.length ? tot("ownFleet") / ms.length : 0,
    FRESH_ROUTE_HOURS: ms.length ? tot("freshRouteHours") / ms.length : 0,
    PEAK_DAYS: ms.filter((m) => (m.peak ?? 0) > 0).length,
  };
}
