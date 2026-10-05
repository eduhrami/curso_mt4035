/** Tipos del modelo de logística y última milla (especificación §4–§7). */
import type paramsJson from "../params/params.v1.json";

export type Params = typeof paramsJson;

/** "minicaso" es un escenario de prueba (fixture del ejemplo resuelto de S5), no se ofrece al jugador. */
export type TerritoryId = "megalopolis" | "bajio" | "norte" | "minicaso";
export type Strategy = "speed" | "reliability" | "efficiency";
export type ZoneKind = "urban" | "suburban" | "city2" | "rural";
export type Level = "express" | "sameday" | "nextday" | "standard";
export const LEVELS: Level[] = ["express", "sameday", "nextday", "standard"];
export type NodeKind = "cd" | "store" | "dark" | "mfc" | "hub";

export type Market = {
  growth: "slow" | "medium" | "explosive";
  speedSensitivity: "low" | "mid" | "high";
  feeSensitivity: "low" | "mid" | "high";
  freshMix: "low" | "mid" | "high";
  fuel: "stable" | "volatile";
  labor: "loose" | "tight";
  returns: "low" | "mid" | "fashion";
};

export const DEFAULT_MARKET: Market = {
  growth: "medium",
  speedSensitivity: "mid",
  feeSensitivity: "mid",
  freshMix: "mid",
  fuel: "stable",
  labor: "loose",
  returns: "low",
};

export type Scenario = {
  territory: TerritoryId;
  market: Market;
  /** Escenario de mercado predefinido (EM-xx, §4.3); ausente si el jugador armó su propio perfil. */
  preset?: string;
  strategy: Strategy;
};

export interface Decisions {
  strategy: Strategy;
  sfd: { active: boolean; capacity: "low" | "mid" | "high" };
  sfs: { share: number; pickers: "2" | "4" | "6" };
  bopis: boolean;
  darkStores: number;
  mfc: number;
  lockers: number;
  hubs: number;
  assignment: "nearest" | "lowest" | "threshold" | "ai";
  batching: "5" | "15" | "60" | "240";
  sfsCap: number;
  levels: Record<Level, boolean>;
  window: "1h" | "2h" | "4h" | "day";
  cutoff: "12" | "14" | "16";
  buffer: number;
  segmentation: "none" | "customer" | "category" | "zone";
  fee: { fee: number; freeThreshold: number };
  slotting: "none" | "100" | "110";
  fleetMix: "3pl" | "own" | "own_3pl" | "own_crowd" | "crowd";
  vehicle: "van" | "ev" | "moto" | "bike" | "reefer";
  cold: "none" | "coolers" | "reefer" | "multi";
  fleetBuffer: "lean" | "standard" | "ample";
  shifts: { two: boolean; weekends: boolean };
  pay: "fixed" | "per_stop" | "mixed";
  peakContract: "none" | "advance" | "spot";
  zones: number;
  zoning: "fixed" | "kmeans" | "balanced" | "capacitated" | "dynamic";
  rezoning: "never" | "quarterly" | "monthly" | "daily";
  routing: "manual" | "heuristic" | "vrptw" | "ai";
  costFn: "euclid" | "avgtime" | "timedep";
  loadSeq: "none" | "fresh_first";
  eta: "none" | "sms" | "live";
  address: "none" | "capture" | "geocode";
  absent: "retry_same" | "retry_next" | "divert" | "neighbor";
  cod: "allow" | "limit" | "remove";
  returnsChannel: "store" | "pickup" | "locker" | "mixed";
  returnsConsolidation: "dedicated" | "backhaul";
  data: "basic" | "gps" | "full";
  report: "mean" | "daily" | "p95";
  security: "none" | "gps" | "full";
  maintenance: "corrective" | "preventive";
}

export interface ZoneState {
  id: number;
  /** Confianza del cliente en la zona (memoria de la experiencia, multiplica la demanda). */
  trust: number;
  /** Multiplicador por competencia (X-11). */
  competition: number;
  /** Pedidos pendientes que pasan al día siguiente (llegarán tarde). */
  backlog: number;
}

export interface Shocks {
  demandMult: number;
  closedZones: number[];
  closedShare: number;
  timeMult: number;
  timeZones: number[];
  capacityCut: number;
  ownCut: number;
  crowdCut: number;
  routingDown: boolean;
  fuelMult: number;
  fadsHitZone: number;
  storeDownZone: number;
  coldBatch: number;
  heat: boolean;
  lostOrders: number;
  lostRoutes: number;
}

export interface LmState {
  territory: TerritoryId;
  strategy: Strategy;
  market: Market;
  epoch: number;
  /** Día absoluto desde el inicio (0 = 1 de enero del año 1). */
  day: number;
  zones: ZoneState[];
  dec: Decisions;
  /** Flota propia vigente (vehículos); se redimensiona cada mes según D-33. */
  ownFleet: number;
  /** Vehículos necesarios acumulados en el mes (para redimensionar la flota propia). */
  needAccum: number;
  needDays: number;
  /** Vehículos que se necesitan en un día típico (promedio del mes anterior): base del contrato con el 3PL. */
  baseNeed: number;
  /** Magnitud de cada pico por año (sorteada al inicio; se revela al ocurrir). */
  peakMagnitude: Record<string, number>;
  /** Contadores semanales para R-02 (spoilage de frescos). */
  weekFresh: number;
  weekSpoiled: number;
  flags: { r01: boolean; r02: boolean; r05: boolean; r06: boolean };
  lastCsat: number;
  shocks: Shocks;
  memo: Record<string, number | string>;
}
