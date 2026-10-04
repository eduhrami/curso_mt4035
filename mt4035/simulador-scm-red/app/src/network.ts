/** Geometría de la región, red de CD y rutas (especificación §6.3, "Geometría de la red"). */
import type { DcSize, DcState, DcType, Params, ScmState, Zone } from "./types.ts";

export const zoneSide = (p: Params, sideKm: number): number => sideKm / p.grid;

export interface ActiveDc {
  dc: DcState;
  type: DcType;
  size: DcSize;
}

/** CD que operan en la época dada (construidos, con conversiones vigentes y no caídos). */
export function activeDcs(state: ScmState, epoch: number, week = state.week): ActiveDc[] {
  return state.dcs
    .filter((dc) => epoch >= dc.activeFrom && week >= dc.downUntil)
    .map((dc) => ({ dc, type: epoch >= dc.typeFrom ? dc.type : dc.prevType, size: epoch >= dc.sizeFrom ? dc.size : dc.prevSize }));
}

export interface Assignment {
  dc: ActiveDc;
  distKm: number;
}

/** CD más cercano a la zona; la distancia incluye circuito vial y acceso local. */
export function assignDc(zone: Zone, dcs: readonly ActiveDc[], zones: readonly Zone[], p: Params, sideKm: number): Assignment | null {
  let best: Assignment | null = null;
  const zs = zoneSide(p, sideKm);
  for (const d of dcs) {
    const home = zones[d.dc.zone]!;
    const dist = p.circuity * Math.hypot(home.x - zone.x, home.y - zone.y) + 0.3 * zs;
    if (!best || dist < best.distKm) best = { dc: d, distKm: dist };
  }
  return best;
}

export interface ZoneGeometry {
  areaKm2: number;
  clusterAreaKm2: number;
  /** Tiendas por km² dentro del área que ocupan. */
  rho: number;
  /** Distancia media entre tiendas consecutivas de una ruta: δ = 0.7 / √ρ. */
  deltaKm: number;
}

export function zoneGeometry(zone: Zone, p: Params, sideKm: number, densityMult = 1): ZoneGeometry {
  const zs = zoneSide(p, sideKm);
  const areaKm2 = zs * zs;
  const clusterAreaKm2 = Math.max(1, areaKm2 * zone.spread);
  const rho = (Math.max(zone.stores, 1) / clusterAreaKm2) * densityMult;
  return { areaKm2, clusterAreaKm2, rho, deltaKm: 0.7 / Math.sqrt(rho) };
}

export interface RouteInput {
  /** Tope operativo de paradas (ventanas de entrega por categoría). */
  maxStops?: number;
  distKm: number;
  deltaKm: number;
  dropCases: number;
  capacityCases: number;
  speedKmh: number;
  stopHours: number;
  shiftHours: number;
}

export interface RouteResult {
  stops: number;
  oneWayHours: number;
  /** Lazo local de reparto dentro de la zona (siempre ≤ turno). */
  localHours: number;
  /** Duración total: troncal ida y vuelta + lazo local. */
  routeHours: number;
  /** Tiempo medio que pasa el producto en el vehículo (horas). */
  avgInVehicleHours: number;
  /** true si la troncal no cabe en medio turno: se hace con relevo y el lazo local usa un turno completo. */
  relay: boolean;
  km: number;
}

/**
 * Paradas por ruta: s = min(Cap/drop, tiempo disponible / (t_parada + δ/v)).
 * Si la troncal ida y vuelta cabe en medio turno, todo es una sola ruta; si no, la troncal va con
 * relevo de chofer y el reparto local dispone de un turno completo (INV-11: el lazo local ≤ turno).
 */
export function route(i: RouteInput): RouteResult {
  const oneWayHours = i.distKm / i.speedKmh;
  const relay = 2 * oneWayHours > 0.5 * i.shiftHours;
  const available = relay ? i.shiftHours : i.shiftHours - 2 * oneWayHours;
  const perStop = i.stopHours + i.deltaKm / i.speedKmh;
  const byCapacity = i.capacityCases / Math.max(i.dropCases, 1e-9);
  const byTime = available / perStop;
  const stops = Math.max(1, Math.floor(Math.min(byCapacity, byTime, i.maxStops ?? Infinity)));
  const localHours = stops * perStop;
  return {
    stops,
    oneWayHours,
    localHours,
    routeHours: 2 * oneWayHours + localHours,
    avgInVehicleHours: oneWayHours + (stops / 2) * perStop,
    relay,
    km: 2 * i.distKm + stops * i.deltaKm,
  };
}

/** Multiplicador de demanda por densidad del cluster: reconocimiento de marca (+) y canibalización (−). */
export function densityDemandMult(rho: number, p: Params): number {
  const d = p.density;
  return (1 + d.brandGain * (1 - Math.exp(-rho / d.brandRho))) / (1 + d.cannibalK * rho);
}
