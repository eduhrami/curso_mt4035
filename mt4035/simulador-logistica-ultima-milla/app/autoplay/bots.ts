/** Bots de referencia del simulador de última milla (casos de prueba §11.1). */
import { createRng, type DecisionChanges, type GameState } from "@mt4035/sim-core";
import type { Policy } from "@mt4035/sim-core/testing";
import type { Bot } from "@mt4035/sim-tools";
import { createLastMileEngine, lmConfig, params } from "../src/model.ts";
import { isPeakMonth } from "../src/network.ts";
import type { Decisions, LmState, TerritoryId } from "../src/types.ts";

type S = GameState<LmState>;
const engine = createLastMileEngine();
const noop: Policy<LmState> = () => ({});
const ordersPerDay = (scn: string) => params.territories[scn as TerritoryId].ordersPerDay;
/** Lockers para un territorio: ~1 por cada 100 pedidos diarios. */
const lockersFor = (scn: string) => Math.max(2, Math.round(ordersPerDay(scn) / 100));

const LEVEL_SETS = {
  nextday: { express: false, sameday: false, nextday: true, standard: false },
  sameday_nextday: { express: false, sameday: true, nextday: true, standard: false },
  express_sameday_nextday: { express: true, sameday: true, nextday: true, standard: false },
  nextday_standard: { express: false, sameday: false, nextday: true, standard: true },
  sameday_nextday_standard: { express: false, sameday: true, nextday: true, standard: true },
} as const;

/** BOT-B · Velocidad a toda costa: express y mismo día, ventanas de 1 h, motos, crowdsourced, dark stores. */
export function speedAtAllCost(): Policy<LmState> {
  return (_s, e) =>
    e === 0
      ? { "D-04": 4, "D-20": { express: true, sameday: true, nextday: false, standard: false }, "D-21": "1h", "D-31": "moto", "D-30": "crowd", "D-11": "5", "D-22": "16", "D-50": "live" }
      : {};
}

/** BOT-C · Segmentado (mini-caso S5): SFS en zonas con tiendas + SFD en periferia, umbral dinámico, 2 h, ETA en vivo, geocodificación. */
export function segmented(variant: { routing?: Decisions["routing"]; data?: Decisions["data"] } = {}): Policy<LmState> {
  return (_s, e) =>
    e === 0
      ? {
          "D-02": { share: 0.3, pickers: "4" },
          "D-10": "threshold",
          "D-21": "2h",
          "D-50": "live",
          "D-51": "geocode",
          ...(variant.routing ? { "D-43": variant.routing } : {}),
          ...(variant.data ? { "D-60": variant.data } : {}),
        }
      : {};
}

/** BOT-D · Eficiencia: día siguiente, ventanas de 4 h, lockers, backhaul, zonas balanceadas, VRPTW. */
export function efficiency(scn: string): Policy<LmState> {
  return (_s, e) =>
    e === 0 ? { "D-20": LEVEL_SETS.nextday, "D-21": "4h", "D-06": lockersFor(scn), "D-56": "backhaul", "D-41": "balanced", "D-43": "vrptw", "D-55": "pickup" } : {};
}

/** BOT-E · Express rural ingenuo: express < 2 h en todo el territorio, sin micro-hubs ni nodos de cercanía. */
export function naiveExpress(): Policy<LmState> {
  return (_s, e) => (e === 0 ? { "D-20": LEVEL_SETS.express_sameday_nextday, "D-07": 0, "D-11": "5" } : {});
}

/** BOT-F · Aleatorio: cada mes prueba cambios al azar y conserva los que validan juntos. */
export function randomPolicy(seed: number, eng = engine): Policy<LmState> {
  return (s: S, e: number): DecisionChanges => {
    const st = createRng(seed).stream("bot", e, 0);
    const pick = <T>(xs: readonly T[]) => xs[st.int(0, xs.length - 1)]!;
    const candidates: DecisionChanges[] = [
      { "D-01": { active: st.bernoulli(0.85), capacity: pick(["low", "mid", "high"]) } },
      { "D-02": { share: st.uniform(0, 1), pickers: pick(["2", "4", "6"]) } },
      { "D-03": st.bernoulli(0.5) },
      { "D-04": st.int(0, 4) },
      { "D-05": st.int(0, 2) },
      { "D-06": st.int(0, 120) },
      { "D-07": st.int(0, 4) },
      { "D-10": pick(["nearest", "lowest", "threshold", "ai"]) },
      { "D-11": pick(["5", "15", "60", "240"]) },
      { "D-12": st.uniform(0.05, 0.5) },
      { "D-20": { express: st.bernoulli(0.3), sameday: st.bernoulli(0.5), nextday: true, standard: st.bernoulli(0.3) } },
      { "D-21": pick(["1h", "2h", "4h", "day"]) },
      { "D-22": pick(["12", "14", "16"]) },
      { "D-23": st.uniform(0, 0.3) },
      { "D-24": pick(["none", "customer", "category", "zone"]) },
      { "D-25": { fee: st.uniform(0, 8), freeThreshold: st.int(0, 100) } },
      { "D-26": pick(["none", "100", "110"]) },
      { "D-30": pick(["3pl", "own", "own_3pl", "own_crowd", "crowd"]) },
      { "D-31": pick(["van", "ev", "moto", "bike", "reefer"]) },
      { "D-32": pick(["none", "coolers", "reefer", "multi"]) },
      { "D-33": pick(["lean", "standard", "ample"]) },
      { "D-34": { two: st.bernoulli(0.4), weekends: st.bernoulli(0.7) } },
      { "D-35": pick(["fixed", "per_stop", "mixed"]) },
      { "D-36": pick(["none", "advance", "spot"]) },
      { "D-40": st.int(3, 30) },
      { "D-41": pick(["fixed", "kmeans", "balanced", "capacitated", "dynamic"]) },
      { "D-42": pick(["never", "quarterly", "monthly", "daily"]) },
      { "D-43": pick(["manual", "heuristic", "vrptw", "ai"]) },
      { "D-44": pick(["euclid", "avgtime", "timedep"]) },
      { "D-45": pick(["none", "fresh_first"]) },
      { "D-50": pick(["none", "sms", "live"]) },
      { "D-51": pick(["none", "capture", "geocode"]) },
      { "D-52": pick(["retry_same", "retry_next", "divert", "neighbor"]) },
      { "D-53": pick(["allow", "limit", "remove"]) },
      { "D-55": pick(["store", "pickup", "locker", "mixed"]) },
      { "D-56": pick(["dedicated", "backhaul"]) },
      { "D-60": pick(["basic", "gps", "full"]) },
      { "D-61": pick(["mean", "daily", "p95"]) },
      { "D-62": pick(["none", "gps", "full"]) },
      { "D-63": pick(["corrective", "preventive"]) },
    ];
    let changes: DecisionChanges = {};
    for (const c of candidates) {
      if (!st.bernoulli(0.2)) continue;
      const merged = { ...changes, ...c };
      if (eng.validate(s, merged).ok) changes = merged;
    }
    return changes;
  };
}

/** BOT-G · Reactivo: reglas simples sobre los KPIs del mes anterior. */
export function reactive(): Policy<LmState> {
  return (s): DecisionChanges => {
    const h = s.history;
    const last = h[h.length - 1]?.kpis;
    if (!last) return {};
    const prev = h[h.length - 2]?.kpis;
    const c: DecisionChanges = {};
    const mix = engine.effectiveValue(s, "D-30") as Decisions["fleetMix"];
    if (last.VEHICLE_UTIL! > 0.9 && (mix === "3pl" || mix === "own")) c["D-30"] = mix === "own" ? "own_crowd" : "crowd";
    if (last.OTD! < 0.9) c["D-23"] = Math.min(0.3, (engine.effectiveValue(s, "D-23") as number) + 0.1);
    if (prev && last.CPD! > prev.CPD! * 1.05) {
      const lv = { ...(engine.effectiveValue(s, "D-20") as Decisions["levels"]) };
      const on = (Object.keys(lv) as (keyof typeof lv)[]).filter((k) => lv[k]);
      if (on.length > 1) {
        lv[on[0]!] = false; // quita el más rápido
        c["D-20"] = lv;
      }
    }
    return engine.validate(s, c).ok ? c : {};
  };
}

/**
 * BOT-H · Aprendiz: igual que A el año 1; desde el año 2 contrata flota de pico con anticipación,
 * publica un tope de capacidad y sube la holgura de la promesa en los meses pico. Al iniciar el año 3,
 * si el CD pasó de 85% de utilización en el año 2, suma surtido desde tienda para liberar capacidad.
 */
export function learner(): Policy<LmState> {
  return (s, e): DecisionChanges => {
    if (e < 12) return {};
    const peak = isPeakMonth(params, e);
    const c: DecisionChanges = { "D-23": peak ? 0.1 : 0, "D-26": peak ? "110" : "none" };
    if (e === 12) c["D-36"] = "advance";
    if (e === 24 && Math.max(...s.history.slice(12, 24).map((r) => r.kpis.NODE_UTIL!)) > 0.85) Object.assign(c, { "D-02": { share: 0.3, pickers: "4" }, "D-10": "threshold" });
    return c;
  };
}

/** Espacio de búsqueda de BOT-I (casos de prueba §11.1). */
export const searchSpace = {
  zones: [3, 4, 6, 8, 10, 12, 16, 20, 30],
  window: ["1h", "2h", "4h", "day"],
  buffer: [0, 0.05, 0.1, 0.2, 0.3],
  sfsShare: [0, 0.15, 0.3, 0.5, 0.75, 1],
  levels: Object.keys(LEVEL_SETS) as (keyof typeof LEVEL_SETS)[],
  assignment: ["nearest", "lowest", "threshold", "ai"],
  fleetMix: ["3pl", "own", "own_3pl", "own_crowd", "crowd"],
  vehicle: ["van", "ev", "moto", "reefer"],
  cold: ["none", "coolers", "reefer"],
  routing: ["manual", "heuristic", "vrptw", "ai"],
  data: ["basic", "gps", "full"],
  costFn: ["euclid", "avgtime", "timedep"],
  eta: ["none", "sms", "live"],
  address: ["none", "capture", "geocode"],
  lockersPer1000: [0, 2, 5, 10, 20],
  hubs: [0, 1, 2, 4, 6],
  darkStores: [0, 1, 2, 4],
  mfc: [0, 1],
  cod: ["allow", "limit", "remove"],
  slotting: ["none", "100", "110"],
  peakContract: ["none", "advance", "spot"],
  pay: ["fixed", "per_stop", "mixed"],
  zoning: ["fixed", "kmeans", "balanced", "capacitated", "dynamic"],
  segmentation: ["none", "zone"],
  loadSeq: ["none", "fresh_first"],
} as const;

export type Vec = { -readonly [K in keyof typeof searchSpace]: (typeof searchSpace)[K] extends readonly (infer T)[] ? T : never };

/** Vector que realmente se aplica: el tiempo dependiente de la hora requiere datos completos. */
export function canonicalVector(v: Vec): Vec {
  const c = { ...v };
  if (c.costFn === "timedep" && c.data !== "full") c.costFn = "avgtime";
  return c;
}

/** BOT-I · Política a partir de un vector del espacio de búsqueda (todo se decide en el mes 1). */
export function vectorPolicy(raw: Vec, scn: string): Policy<LmState> {
  const v = canonicalVector(raw);
  return (_s, e) =>
    e === 0
      ? {
          "D-40": v.zones,
          "D-21": v.window,
          "D-23": v.buffer,
          "D-02": { share: v.sfsShare, pickers: "4" },
          "D-20": LEVEL_SETS[v.levels],
          "D-10": v.assignment,
          "D-30": v.fleetMix,
          "D-31": v.vehicle,
          "D-32": v.cold,
          "D-43": v.routing,
          "D-60": v.data,
          "D-44": v.costFn,
          "D-50": v.eta,
          "D-51": v.address,
          "D-06": Math.round((v.lockersPer1000 * ordersPerDay(scn)) / 1000),
          "D-07": v.hubs,
          "D-04": v.darkStores,
          "D-05": v.mfc,
          "D-53": v.cod,
          "D-26": v.slotting,
          "D-36": v.peakContract,
          "D-35": v.pay,
          "D-41": v.zoning,
          "D-24": v.segmentation,
          "D-45": v.loadSeq,
        }
      : {};
}

/** Vector con las decisiones as-is (punto de partida del buscador). */
export function baselineVector(scenario: string): Vec {
  const d = engine.createGame(lmConfig({ territory: scenario as TerritoryId })).model.dec;
  return {
    zones: d.zones as Vec["zones"],
    window: d.window,
    buffer: d.buffer as Vec["buffer"],
    sfsShare: d.sfs.share as Vec["sfsShare"],
    levels: "nextday",
    assignment: d.assignment,
    fleetMix: d.fleetMix,
    vehicle: d.vehicle as Vec["vehicle"],
    cold: d.cold as Vec["cold"],
    routing: d.routing,
    data: d.data,
    costFn: d.costFn,
    eta: d.eta,
    address: d.address,
    lockersPer1000: 0,
    hubs: 0,
    darkStores: 0,
    mfc: 0,
    cod: d.cod,
    slotting: d.slotting,
    peakContract: d.peakContract,
    pay: d.pay,
    zoning: d.zoning,
    segmentation: "none",
    loadSeq: d.loadSeq,
  };
}

export const bots: Bot<LmState>[] = [
  { id: "A", label: "Estático", purpose: "Línea base por territorio", policy: () => noop },
  { id: "B", label: "Velocidad a toda costa", purpose: "Debe perder bajo eficiencia y confiabilidad", policy: () => speedAtAllCost() },
  { id: "C", label: "Segmentado (mini-caso S5)", purpose: "Debe ganar a A en Megalópolis", policy: () => segmented() },
  { id: "D", label: "Eficiencia", purpose: "Debe tener el mejor CPD", policy: (_seed, scn) => efficiency(scn) },
  { id: "E", label: "Express rural ingenuo", purpose: "Debe perder en Norte", policy: () => naiveExpress() },
  { id: "F", label: "Aleatorio", purpose: "Robustez e invariantes", policy: (seed) => randomPolicy(seed) },
  { id: "G", label: "Reactivo", purpose: "Alumno táctico", policy: () => reactive() },
  { id: "H", label: "Aprendiz", purpose: "Se aprende de un ciclo de picos al siguiente", policy: () => learner() },
  { id: "J", label: "Segmentado + IA con datos básicos", purpose: "La IA necesita datos (AUT-13)", policy: () => segmented({ routing: "ai", data: "basic" }) },
  { id: "K", label: "Segmentado + VRPTW con datos completos", purpose: "La IA necesita datos (AUT-13)", policy: () => segmented({ routing: "vrptw", data: "full" }) },
  { id: "I", label: "Buscador", purpose: "Óptimos por territorio × estrategia; detecta explotaciones", policy: (_seed, scn, args) => vectorPolicy(args as Vec, scn) },
];

