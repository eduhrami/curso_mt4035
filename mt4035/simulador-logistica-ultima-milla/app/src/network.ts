/** Calendario, ubicación de nodos por zona y aproximación continua de rutas (especificación §6.3). */
import type { Decisions, Level, LmState, Params } from "./types.ts";
import { LEVELS } from "./types.ts";

export const monthOf = (epoch: number) => epoch % 12;
export const yearOf = (epoch: number) => Math.floor(epoch / 12);
export const weekdayOf = (day: number) => day % 7; // el día 0 es lunes

/** Magnitud del pico programado que cae en (época, día del mes), o 1 si no hay. */
export function peakOn(s: LmState, p: Params, epoch: number, dayOfMonth: number): { id: string; name: string; mult: number } | null {
  const m = monthOf(epoch);
  for (const pk of p.peaks) {
    if (pk.month === m && dayOfMonth >= pk.startDay - 1 && dayOfMonth < pk.startDay - 1 + pk.days) {
      return { id: pk.id, name: pk.name, mult: s.peakMagnitude[`${yearOf(epoch)}:${pk.id}`] ?? 1 };
    }
  }
  return null;
}

export const isPeakMonth = (p: Params, epoch: number) => p.peaks.some((pk) => pk.month === monthOf(epoch));

/** Zonas ordenadas por participación de demanda (urbanas primero): ahí se ubican MFC, dark stores y lockers. */
export function denseZoneOrder(s: LmState, p: Params): number[] {
  const t = p.territories[s.territory];
  return [...t.zones].sort((a, b) => Number(b.kind === "urban") - Number(a.kind === "urban") || b.share - a.share || a.id - b.id).map((z) => z.id);
}

/** Zona atendida por un nodo de cercanía: qué nodo (índice) y a qué distancia está. */
export interface Coverage {
  node: number;
  distKm: number;
}

export interface Placement {
  /** Zonas donde se ubica cada MFC / dark store (índice = nodo). */
  mfc: number[];
  dark: number[];
  /** Zona → nodo que la atiende (el nodo surte su zona y las zonas densas vecinas). */
  mfcCover: Map<number, Coverage>;
  darkCover: Map<number, Coverage>;
  hubs: Set<number>;
  lockersByZone: number[];
}

export function placeNodes(s: LmState, p: Params, d: Decisions): Placement {
  const t = p.territories[s.territory];
  const order = denseZoneOrder(s, p);
  const free = [...order];
  const cover = (count: number, cfg: { coverZones: number; neighborKm: number }) => {
    const hosts: number[] = [];
    const map = new Map<number, Coverage>();
    for (let n = 0; n < count && free.length > 0; n++) {
      const zones = free.splice(0, cfg.coverZones);
      hosts.push(zones[0]!);
      zones.forEach((z, i) => map.set(z, { node: n, distKm: i === 0 ? 2 : cfg.neighborKm }));
    }
    return { hosts, map };
  };
  const m = cover(d.mfc, p.nodes.mfc);
  const k = cover(d.darkStores, p.nodes.dark);
  const hubs = new Set([...t.zones].sort((a, b) => b.distCd - a.distCd || a.id - b.id).slice(0, d.hubs).map((z) => z.id));
  const totalShare = t.zones.reduce((a, z) => a + z.share, 0);
  const lockersByZone = t.zones.map((z) => Math.round((d.lockers * z.share) / totalShare));
  return { mfc: m.hosts, dark: k.hosts, mfcCover: m.map, darkCover: k.map, hubs, lockersByZone };
}

/** Puntaje de velocidad de la oferta (0 = estándar, 1 = solo express), ponderado por preferencia del cliente. */
export function speedScore(d: Decisions, p: Params): number {
  let w = 0;
  let sum = 0;
  for (const l of LEVELS) if (d.levels[l]) {
    w += p.levels[l].pref;
    sum += p.levels[l].pref * p.levels[l].speed;
  }
  return w > 0 ? sum / w : 0;
}

/** Participación de cada nivel en los pedidos (preferencias renormalizadas entre los niveles ofrecidos). */
export function levelShares(d: Decisions, p: Params): Record<Level, number> {
  const w = LEVELS.reduce((a, l) => a + (d.levels[l] ? p.levels[l].pref : 0), 0);
  return Object.fromEntries(LEVELS.map((l) => [l, d.levels[l] && w > 0 ? p.levels[l].pref / w : 0])) as Record<Level, number>;
}

export interface RouteInput {
  stops: number;
  areaKm2: number;
  /** Fragmentación: pedidos que no se pueden rutear juntos por ventana y nivel de servicio. */
  fragmentation: number;
  linehaulKm: number;
  linehaulSpeed: number;
  localSpeed: number;
  stopHours: number;
  capacity: number;
  shiftHours: number;
  kmMult: number;
  kTsp: number;
  /** Tope de paradas por ruta (p. ej. express: lo que cabe en la promesa). */
  maxStops?: number;
}

export interface RouteResult {
  stopsPerRoute: number;
  routes: number;
  oneWayHours: number;
  routeHours: number;
  kmPerRoute: number;
  deltaKm: number;
  avgInVehicleHours: number;
}

/** Aproximación continua (Daganzo): distancia entre paradas δ = k·√(A/n_efectivo). */
export function route(i: RouteInput): RouteResult {
  const nEff = Math.max(1, i.stops / Math.max(1, i.fragmentation));
  const deltaKm = i.kTsp * Math.sqrt(i.areaKm2 / nEff);
  const oneWayHours = i.linehaulKm / i.linehaulSpeed;
  // El método de ruteo (kmMult) alarga o acorta el recorrido local; la troncal es directa.
  const perStop = i.stopHours + (deltaKm * i.kmMult) / i.localSpeed;
  const available = Math.max(perStop, i.shiftHours - 2 * oneWayHours);
  const s = Math.max(1, Math.floor(Math.min(i.capacity, available / perStop, i.maxStops ?? Infinity)));
  const stopsPerRoute = Math.min(s, Math.max(1, i.stops));
  const routes = i.stops > 0 ? i.stops / stopsPerRoute : 0;
  return {
    stopsPerRoute,
    routes,
    oneWayHours,
    routeHours: 2 * oneWayHours + stopsPerRoute * perStop,
    kmPerRoute: 2 * i.linehaulKm + stopsPerRoute * deltaKm * i.kmMult,
    deltaKm,
    avgInVehicleHours: oneWayHours + (stopsPerRoute / 2) * perStop,
  };
}
