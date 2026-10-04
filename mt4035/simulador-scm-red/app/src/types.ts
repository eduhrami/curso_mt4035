/** Tipos del modelo SCM (especificación §4–§7). */
import type paramsJson from "../params/params.v1.json";

export type Params = typeof paramsJson;

export const CATEGORIES = ["fresh", "chilled", "ambient", "frozen"] as const;
export type Category = (typeof CATEGORIES)[number];
export type PerCat<T> = Record<Category, T>;

export type RegionId = "kaigan" | "redriver" | "valle";
export type Strategy = "freshness" | "lowcost" | "convenience";
export type DcType = "stocking" | "crossdock" | "combined";
export type DcSize = "small" | "medium" | "large";
export type Flow = "dc" | "dsd";
export type Info = "basic" | "pos_daily" | "pos_terminal";
export type Sharing = "no" | "weekly" | "daily";
export type Forecast = "moving_avg" | "seasonal" | "causal";
export type Collaboration = "arms" | "vmi" | "cpfr";
export type Level = "low" | "mid" | "high";
export type Policy = "rop" | "periodic" | "tanpin";
export type Maintenance = "corrective" | "preventive" | "predictive";
export type Fleet = "own" | "dedicated" | "spot";
export type OpeningStrategy = "dominance" | "dispersed" | "mixed";

export type MarketProfile = {
  growth: "stagnant" | "moderate" | "boom";
  seasonality: "soft" | "marked";
  volatility: "low" | "mid" | "high";
  fuel: "stable" | "volatile" | "rising";
  competition: "passive" | "aggressive";
  labor: "loose" | "tight";
  demographics: "aging" | "stable";
  supplierReliability: "high" | "mid" | "low";
};

export type Scenario = {
  region: RegionId;
  /** Región elegida con cero tiendas (§4.1 escenario greenfield). */
  greenfield?: boolean;
  market: MarketProfile;
  strategy: Strategy;
};

export const DEFAULT_MARKET: MarketProfile = {
  growth: "moderate",
  seasonality: "soft",
  volatility: "mid",
  fuel: "stable",
  competition: "passive",
  labor: "loose",
  demographics: "stable",
  supplierReliability: "mid",
};

/** Un CD de la red (D-01) con su zona (D-02), tipo (D-03) y tamaño (D-04). */
export interface DcSpec {
  id: string;
  zone: number;
  type: DcType;
  size: DcSize;
}

/** CD en el estado: lo planeado más la época desde la que opera cada atributo. */
export interface DcState extends DcSpec {
  activeFrom: number;
  /** Tipo y tamaño anteriores, vigentes mientras una conversión o ampliación está en obra. */
  prevType: DcType;
  prevSize: DcSize;
  typeFrom: number;
  sizeFrom: number;
  /** Semana absoluta hasta la que el CD está fuera de servicio (X-03). */
  downUntil: number;
}

export interface Zone {
  id: number;
  x: number;
  y: number;
  stores: number;
  /** Fracción del área de la zona que ocupan las tiendas (1 = dispersas, <1 = concentradas). */
  spread: number;
  trust: number;
  competition: number;
  lowOsaWeeks: number;
}

export interface Decisions {
  strategy: Strategy;
  openingStrategy: OpeningStrategy;
  openingRate: number;
  dedicated: { fresh: boolean; chilled: boolean };
  flows: PerCat<Flow>;
  freq: PerCat<number>;
  consolidation: "supplier" | "combined";
  fleet: Fleet;
  vehicle: { type: "mono" | "multi"; telemetry: boolean };
  window: "peak" | "offpeak";
  maintenance: Maintenance;
  policy: Policy;
  csl: PerCat<number>;
  assortment: { skus: number; local: boolean };
  receiving: "manual" | "scan";
  dcSafetyDays: number;
  retirement: "fifo" | "discount";
  info: Info;
  sharing: Sharing;
  forecast: Forecast;
  collaboration: Collaboration;
  training: Level;
}

/** Choques transitorios que los eventos fijan antes de model.tick() y el tick limpia al final. */
export interface Shocks {
  closedZones: number[];
  closedShare: number;
  demandMult: PerCat<number>;
  supplierFrMult: PerCat<number>;
  fuelMult: number;
  congestionMult: number;
  cvMult: number;
  capacityCut: number;
  stopMult: number;
  excursionZone: number;
  excursionLoss: number;
}

export interface ScmState {
  region: RegionId;
  strategy: Strategy;
  market: MarketProfile;
  /** Época en curso (se actualiza en onEpochEnd a la siguiente). */
  epoch: number;
  week: number;
  zones: Zone[];
  dcs: DcState[];
  dec: Decisions;
  /** Madurez 0–1 del sistema de información vigente (D-30). */
  infoMaturity: number;
  /** Época desde la que opera el sistema de información vigente (para la curva de aprendizaje). */
  infoSince: number;
  /** Lotes de apertura pendientes (D-08): tiendas y época en que abren. */
  pendingOpenings: { stores: number; epoch: number }[];
  inventory: PerCat<number[]>;
  /** Merma de la semana anterior por categoría y zona (para R-02). */
  lastWaste: PerCat<number[]>;
  flags: { r01: boolean; r02: PerCat<boolean[]>; r04: boolean; r07: boolean };
  shocks: Shocks;
  mixShift: number;
  lastEpochOsa: number;
  /** Datos de eventos en curso (categoría afectada, zona, etc.). */
  memo: Record<string, number | string>;
}

export const perCat = <T>(f: (c: Category) => T): PerCat<T> =>
  Object.fromEntries(CATEGORIES.map((c) => [c, f(c)])) as PerCat<T>;
