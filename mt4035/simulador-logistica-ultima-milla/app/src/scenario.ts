/** Estado inicial por territorio: operación as-is de Mercado Alba (especificación §2 y §4.1). */
import type { GameConfig, Rng } from "@mt4035/sim-core";
import { DEFAULT_MARKET, type Decisions, type LmState, type Params, type Scenario, type Shocks } from "./types.ts";

export function emptyShocks(): Shocks {
  return {
    demandMult: 1,
    closedZones: [],
    closedShare: 0,
    timeMult: 1,
    timeZones: [],
    capacityCut: 0,
    ownCut: 0,
    crowdCut: 0,
    routingDown: false,
    fuelMult: 1,
    fadsHitZone: -1,
    storeDownZone: -1,
    coldBatch: 0,
    heat: false,
    lostOrders: 0,
    lostRoutes: 0,
  };
}

/** As-is: solo SFD desde el CD con camionetas de un 3PL, día siguiente con ventana de todo el día, sin ETA ni validación. */
export function asIsDecisions(scn: Scenario, p: Params): Decisions {
  return {
    strategy: scn.strategy,
    sfd: { active: true, capacity: p.territories[scn.territory].cdCapacity as Decisions["sfd"]["capacity"] },
    sfs: { share: 0, pickers: "2" },
    bopis: false,
    darkStores: 0,
    mfc: 0,
    lockers: 0,
    hubs: 0,
    assignment: "nearest",
    batching: "60",
    sfsCap: 0.2,
    levels: { express: false, sameday: false, nextday: true, standard: false },
    window: "day",
    cutoff: "16",
    buffer: 0,
    segmentation: "none",
    fee: { fee: 3, freeThreshold: 0 },
    slotting: "none",
    fleetMix: "3pl",
    vehicle: "van",
    cold: "none",
    fleetBuffer: "standard",
    shifts: { two: false, weekends: true },
    pay: "fixed",
    peakContract: "none",
    zones: 6,
    zoning: "fixed",
    rezoning: "never",
    routing: "manual",
    costFn: "euclid",
    loadSeq: "none",
    eta: "none",
    address: "none",
    absent: "retry_next",
    cod: "allow",
    returnsChannel: "store",
    returnsConsolidation: "dedicated",
    data: "basic",
    report: "mean",
    security: "none",
    maintenance: "corrective",
  };
}

export function initialState(config: GameConfig<Scenario>, p: Params, rng: Rng): LmState {
  const scn: Scenario = { ...config.scenario, market: { ...DEFAULT_MARKET, ...(config.scenario.market ?? {}) } };
  const t = p.territories[scn.territory];
  if (!t) throw new Error(`Territorio desconocido: ${scn.territory}`);
  const peakMagnitude: Record<string, number> = {};
  const s = rng.stream("peaks", 0, 0);
  for (let year = 0; year < Math.ceil(p.epochs / 12); year++) {
    for (const pk of p.peaks) peakMagnitude[`${year}:${pk.id}`] = s.uniform(p.peakMagnitude.min, p.peakMagnitude.max);
  }
  return {
    territory: scn.territory,
    strategy: scn.strategy,
    market: scn.market,
    epoch: 0,
    day: 0,
    zones: t.zones.map((z) => ({ id: z.id, trust: p.trust.start, competition: 1, backlog: 0 })),
    dec: asIsDecisions(scn, p),
    ownFleet: 0,
    needAccum: 0,
    needDays: 0,
    baseNeed: 0,
    peakMagnitude,
    weekFresh: 0,
    weekSpoiled: 0,
    flags: { r01: false, r02: false, r05: false, r06: false },
    lastCsat: 4,
    shocks: emptyShocks(),
    memo: {},
  };
}
