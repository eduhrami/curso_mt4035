/** Construcción del estado inicial por región (especificación §4.1, red as-is). */
import type { GameConfig, Rng } from "@mt4035/sim-core";
import { zoneSide } from "./network.ts";
import { CATEGORIES, DEFAULT_MARKET, perCat, type DcState, type Decisions, type Params, type Scenario, type ScmState, type Zone } from "./types.ts";

function zoneWeight(pattern: string, x: number, y: number, side: number, jitter: number): number {
  switch (pattern) {
    case "coastal": // costa en x = 0: la población cae con la distancia a la costa
      return Math.exp(-x / (side * 0.22)) * (0.8 + 0.4 * jitter);
    case "core-periphery": {
      const d = Math.hypot(x - side / 2, y - side / 2);
      return Math.exp(-(d * d) / (2 * (side * 0.18) ** 2)) + 0.12 * (0.5 + jitter);
    }
    default:
      return 0.7 + 0.6 * jitter;
  }
}

/** Reparte un total entero proporcional a pesos (método del mayor residuo; suma exacta). */
export function allocate(total: number, weights: readonly number[]): number[] {
  const w = weights.map((x) => Math.max(0, x));
  const sum = w.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return w.map(() => 0);
  const raw = w.map((x) => (total * x) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    out[i]!++;
    rest--;
  }
  return out;
}

export function buildZones(p: Params, scn: Scenario, rng: Rng): Zone[] {
  const r = p.regions[scn.region];
  const g = p.grid;
  const zs = zoneSide(p, r.sideKm);
  const geo = rng.stream("geo", 0, 0);
  const cells = Array.from({ length: g * g }, (_, id) => {
    const col = id % g;
    const row = Math.floor(id / g);
    const x = (col + 0.5) * zs;
    const y = (row + 0.5) * zs;
    return { id, x, y, w: zoneWeight(r.pattern, x, y, r.sideKm, geo.next()) };
  });
  const stores = allocate(scn.greenfield ? 0 : r.stores, cells.map((c) => c.w));
  return cells.map((c, i) => {
    const core = r.pattern === "core-periphery" && Math.hypot(c.x - r.sideKm / 2, c.y - r.sideKm / 2) < r.sideKm * 0.22;
    return {
      id: c.id,
      x: c.x,
      y: c.y,
      stores: stores[i]!,
      spread: r.pattern === "core-periphery" ? (core ? 0.3 : 0.8) : r.spread,
      trust: 1,
      competition: 1,
      lowOsaWeeks: 0,
    };
  });
}

/** CD iniciales en las zonas con más tiendas. */
function initialDcs(zones: Zone[], count: number, type: DcState["type"], size: DcState["size"]): DcState[] {
  return [...zones]
    .sort((a, b) => b.stores - a.stores || a.id - b.id)
    .slice(0, count)
    .map((z, i) => ({
      id: `CD-${i + 1}`,
      zone: z.id,
      type,
      size,
      activeFrom: -1,
      prevType: type,
      prevSize: size,
      typeFrom: -1,
      sizeFrom: -1,
      downUntil: -1,
    }));
}

export function initialState(config: GameConfig<Scenario>, p: Params, rng: Rng): ScmState {
  const scn: Scenario = { ...config.scenario, market: { ...DEFAULT_MARKET, ...(config.scenario.market ?? {}) } };
  const r = p.regions[scn.region];
  if (!r) throw new Error(`Región desconocida: ${scn.region}`);
  const ini = r.initial;
  const zones = buildZones(p, scn, rng);
  const dcs = scn.greenfield ? [] : initialDcs(zones, ini.dcs.count, ini.dcs.type as DcState["type"], ini.dcs.size as DcState["size"]);
  const dec: Decisions = {
    strategy: scn.strategy,
    openingStrategy: "mixed",
    openingRate: 0,
    dedicated: { ...ini.dedicated },
    flows: scn.greenfield ? perCat(() => "dsd" as const) : (ini.flows as Decisions["flows"]),
    freq: { ...ini.freq },
    consolidation: ini.consolidation as Decisions["consolidation"],
    fleet: ini.fleet as Decisions["fleet"],
    vehicle: { ...(ini.vehicle as Decisions["vehicle"]) },
    window: ini.window as Decisions["window"],
    maintenance: ini.maintenance as Decisions["maintenance"],
    policy: ini.policy as Decisions["policy"],
    csl: { ...ini.csl },
    assortment: { ...ini.assortment },
    receiving: ini.receiving as Decisions["receiving"],
    dcSafetyDays: ini.dcSafetyDays,
    retirement: ini.retirement as Decisions["retirement"],
    info: ini.info as Decisions["info"],
    sharing: ini.sharing as Decisions["sharing"],
    forecast: ini.forecast as Decisions["forecast"],
    collaboration: ini.collaboration as Decisions["collaboration"],
    training: ini.training as Decisions["training"],
  };
  return {
    region: scn.region,
    strategy: scn.strategy,
    market: scn.market,
    epoch: 0,
    week: 0,
    zones,
    dcs,
    dec,
    infoMaturity: 1,
    infoSince: -10,
    pendingOpenings: [],
    inventory: perCat(() => zones.map(() => -1)), // -1: se inicializa al nivel objetivo en el primer tick
    lastWaste: perCat(() => zones.map(() => 0)),
    flags: { r01: false, r02: perCat(() => zones.map(() => false)), r04: false, r07: false },
    shocks: emptyShocks(),
    mixShift: 0,
    lastEpochOsa: 1,
    memo: {},
  };
}

export function emptyShocks(): ScmState["shocks"] {
  return {
    closedZones: [],
    closedShare: 0,
    demandMult: perCat(() => 1),
    supplierFrMult: perCat(() => 1),
    fuelMult: 1,
    congestionMult: 1,
    cvMult: 1,
    capacityCut: 0,
    stopMult: 1,
    excursionZone: -1,
    excursionLoss: 0,
  };
}

export { CATEGORIES };
