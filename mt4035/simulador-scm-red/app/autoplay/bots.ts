/** Bots de referencia del simulador SCM (casos de prueba §11.1). */
import { createRng, type DecisionChanges, type GameState } from "@mt4035/sim-core";
import type { Policy } from "@mt4035/sim-core/testing";
import type { Bot } from "@mt4035/sim-tools";
import { createScmEngine, scmConfig } from "../src/model.ts";
import type { DcSpec, RegionId, ScmState } from "../src/types.ts";

type S = GameState<ScmState>;
const engine = createScmEngine();
const noop: Policy<ScmState> = () => ({});

const planned = (s: S) => engine.effectiveValue(s, "D-01") as DcSpec[];
const topZones = (s: S, n: number) =>
  [...s.model.zones]
    .filter((z) => z.stores > 0)
    .sort((a, b) => b.stores - a.stores || a.id - b.id)
    .slice(0, n)
    .map((z) => z.id);
const allDc = { fresh: "dc", chilled: "dc", ambient: "dc", frozen: "dc" } as const;
const csl = (v: number) => ({ fresh: v, chilled: v, ambient: v, frozen: v });

/** BOT-B · Trasplante del modelo Kaigan: 3×/día, cross-dock combinado, sin densificar. */
export function naiveTransplant(dcCount = 2): Policy<ScmState> {
  return (s, e) => {
    if (e !== 0) return {};
    const dcs: DcSpec[] = topZones(s, dcCount).map((zone, i) => ({ id: `N-${i + 1}`, zone, type: "combined", size: "medium" }));
    return { "D-01": dcs, "D-10": allDc, "D-11": { fresh: 21, chilled: 21, ambient: 7, frozen: 3 }, "D-12": "combined", "D-14": { type: "multi", telemetry: true } };
  };
}

/** BOT-C en Red River: CD regionales con inventario, frescos por DSD, información y consolidación. */
export function adaptedDispersed(): Policy<ScmState> {
  return (_s, e) => {
    if (e === 0) {
      const dcs: DcSpec[] = [7, 10, 25, 28].map((zone, i) => ({ id: `A-${i + 1}`, zone, type: "stocking", size: "medium" }));
      return { "D-01": dcs, "D-30": "pos_daily", "D-31": "weekly", "D-32": "seasonal", "D-23": "scan" };
    }
    if (e === 3) {
      return { "D-10": { fresh: "dsd", chilled: "dc", ambient: "dc", frozen: "dc" }, "D-11": { fresh: 7, chilled: 3, ambient: 2, frozen: 1 }, "D-24": 2, "D-20": "periodic", "D-16": "preventive" };
    }
    return {};
  };
}

/** BOT-C en Valle: CD convertidos a combinados por temperatura, frescos por CD, información y horas valle. */
export function adaptedValle(): Policy<ScmState> {
  return (s, e) => {
    if (e === 0) {
      return {
        "D-01": planned(s).map((d) => ({ ...d, type: "combined" as const })),
        "D-30": "pos_daily",
        "D-31": "weekly",
        "D-32": "seasonal",
        "D-23": "scan",
        "D-15": "offpeak",
        "D-16": "preventive",
        "D-24": 0,
      };
    }
    if (e === 1) return { "D-10": allDc, "D-12": "combined", "D-11": { fresh: 14, chilled: 7, ambient: 3, frozen: 2 } };
    return {};
  };
}

/** BOT-C en Kaigan: el modelo SEJ ya está alineado; solo profundiza la colaboración y el mantenimiento. */
export function adaptedKaigan(): Policy<ScmState> {
  return (_s, e) => (e === 0 ? { "D-33": "cpfr", "D-16": "predictive" } : {});
}

/** BOT-D · Maximalista: todo al máximo. */
export function maximalist(): Policy<ScmState> {
  return (s, e) => {
    if (e !== 0) return {};
    const cur = planned(s).map((d) => ({ ...d, type: "combined" as const, size: "large" as const }));
    const used = new Set(cur.map((d) => d.zone));
    const extra = topZones(s, 36)
      .filter((z) => !used.has(z))
      .slice(0, 20 - cur.length)
      .map((zone, i): DcSpec => ({ id: `M-${i + 1}`, zone, type: "combined", size: "large" }));
    return {
      "D-01": [...cur, ...extra],
      "D-10": allDc,
      "D-11": { fresh: 21, chilled: 21, ambient: 7, frozen: 7 },
      "D-12": "combined",
      "D-21": csl(0.99),
      "D-30": "pos_terminal",
      "D-31": "daily",
      "D-32": "causal",
      "D-33": "cpfr",
      "D-34": "high",
      "D-07": { fresh: true, chilled: true },
      "D-14": { type: "multi", telemetry: true },
      "D-16": "predictive",
      "D-23": "scan",
      "D-15": "offpeak",
      "D-13": "own",
      "D-20": "tanpin",
    };
  };
}

/** BOT-E · Minimalista: un CD, reposición mínima, CSL 85%, sin TI. */
export function minimalist(): Policy<ScmState> {
  return (s, e) => {
    if (e !== 0) return {};
    const cur = planned(s);
    const keep: DcSpec[] = cur.length ? [{ ...cur[0]!, type: "stocking" }] : [{ id: "MIN-1", zone: topZones(s, 1)[0]!, type: "stocking", size: "small" }];
    return {
      "D-01": keep,
      "D-10": allDc,
      "D-11": { fresh: 7, chilled: 3, ambient: 1, frozen: 1 },
      "D-12": "supplier",
      "D-21": csl(0.85),
      "D-30": "basic",
      "D-31": "no",
      "D-32": "moving_avg",
      "D-33": "arms",
      "D-34": "low",
      "D-20": "periodic",
      "D-16": "corrective",
      "D-13": "spot",
      "D-23": "manual",
      "D-15": "peak",
      "D-14": { type: "mono", telemetry: false },
      "D-07": { fresh: false, chilled: false },
    };
  };
}

/** BOT-F · Aleatorio: cada época prueba cambios al azar y conserva los que validan juntos. */
export function randomPolicy(seed: number): Policy<ScmState> {
  return (s, e): DecisionChanges => {
    const st = createRng(seed).stream("bot", e, 0);
    const pick = <T>(xs: readonly T[]) => xs[st.int(0, xs.length - 1)]!;
    const dcs = planned(s);
    const candidates: DecisionChanges[] = [
      { "D-11": { fresh: st.int(7, 21), chilled: st.int(3, 21), ambient: st.int(1, 7), frozen: st.int(1, 7) } },
      { "D-21": { fresh: st.uniform(0.85, 0.99), chilled: st.uniform(0.85, 0.99), ambient: st.uniform(0.85, 0.99), frozen: st.uniform(0.85, 0.99) } },
      { "D-31": pick(["no", "weekly", "daily"]) },
      { "D-32": pick(["moving_avg", "seasonal", "causal"]) },
      { "D-13": pick(["own", "dedicated", "spot"]) },
      { "D-14": { type: pick(["mono", "multi"]), telemetry: st.bernoulli(0.5) } },
      { "D-15": pick(["peak", "offpeak"]) },
      { "D-16": pick(["corrective", "preventive", "predictive"]) },
      { "D-22": { skus: st.int(2000, 4000), local: st.bernoulli(0.5) } },
      { "D-23": pick(["manual", "scan"]) },
      { "D-25": pick(["fifo", "discount"]) },
      { "D-34": pick(["low", "mid", "high"]) },
      { "D-05": pick(["dominance", "dispersed", "mixed"]) },
      { "D-06": st.uniform(-0.1, 0.15) },
      { "D-08": st.int(0, 60) },
      { "D-30": pick(["basic", "pos_daily", "pos_terminal"]) },
      { "D-33": pick(["arms", "vmi", "cpfr"]) },
      { "D-20": pick(["rop", "periodic", "tanpin"]) },
      { "D-24": st.uniform(0, 5) },
      { "D-12": pick(["supplier", "combined"]) },
      { "D-10": { fresh: pick(["dc", "dsd"]), chilled: pick(["dc", "dsd"]), ambient: pick(["dc", "dsd"]), frozen: pick(["dc", "dsd"]) } },
      {
        "D-01": [
          ...dcs,
          ...(st.bernoulli(0.3) && dcs.length < 20 ? [{ id: `R${e}`, zone: st.int(0, 35), type: pick(["stocking", "crossdock", "combined"] as const), size: pick(["small", "medium", "large"] as const) }] : []),
        ],
      },
    ];
    let changes: DecisionChanges = {};
    for (const c of candidates) {
      if (!st.bernoulli(0.25)) continue;
      const merged = { ...changes, ...c };
      if (engine.validate(s, merged).ok) changes = merged;
    }
    return changes;
  };
}

/** BOT-G · Reactivo: ajusta frecuencia y CSL con reglas simples sobre los KPIs de la época anterior. */
export function reactive(): Policy<ScmState> {
  return (s): DecisionChanges => {
    const last = s.history[s.history.length - 1]?.kpis;
    if (!last) return {};
    const freq = { ...(engine.effectiveValue(s, "D-11") as ScmState["dec"]["freq"]) };
    const c = { ...(engine.effectiveValue(s, "D-21") as ScmState["dec"]["csl"]) };
    const fresh = (engine.effectiveValue(s, "D-10") as ScmState["dec"]["flows"]).fresh;
    if ((last.OSA_FRESH! < 0.92 || last.WASTE_FRESH! > 0.08) && fresh === "dc") freq.fresh = Math.min(21, freq.fresh + 7);
    if (last.CTS_PCT! > 0.12) {
      freq.ambient = Math.max(1, freq.ambient - 1);
      freq.chilled = Math.max(3, freq.chilled - 2);
    }
    const step = last.OSA! < 0.93 ? 0.02 : last.WASTE! > 0.06 ? -0.02 : 0;
    if (step) for (const k of Object.keys(c) as (keyof typeof c)[]) c[k] = Math.min(0.99, Math.max(0.85, c[k] + step));
    return { "D-11": freq, "D-21": c };
  };
}

/** BOT-I · Solo información: POS diario y compartido con proveedores, nada más (SCM-AUT-11). */
export function infoOnly(): Policy<ScmState> {
  return (_s, e) => (e === 0 ? { "D-30": "pos_daily", "D-31": "daily" } : {});
}

export const bots: Bot<ScmState>[] = [
  { id: "A", label: "Estático", purpose: "Línea base por región", policy: () => noop },
  { id: "B", label: "Trasplante", purpose: "Debe perder fuera de Kaigan", policy: (_seed, scn) => (scn === "kaigan" ? noop : naiveTransplant()) },
  {
    id: "C",
    label: "Adaptado",
    purpose: "Debe ganar a A y B",
    policy: (_seed, scn) => (scn === "redriver" ? adaptedDispersed() : scn === "valle" ? adaptedValle() : adaptedKaigan()),
  },
  { id: "D", label: "Maximalista", purpose: "Detecta «gastar resuelve todo»", policy: () => maximalist() },
  { id: "E", label: "Minimalista", purpose: "Detecta «no hacer nada es barato y gana»", policy: () => minimalist() },
  { id: "F", label: "Aleatorio", purpose: "Robustez e invariantes", policy: (seed) => randomPolicy(seed) },
  { id: "G", label: "Reactivo", purpose: "Alumno táctico", policy: () => reactive() },
  { id: "I", label: "Solo información", purpose: "La información tarda (AUT-11)", policy: () => infoOnly() },
];

/** Espacio de búsqueda de BOT-H (casos de prueba §11.1). dcCount = −1 conserva la red actual. */
export const searchSpace = {
  dcCount: [-1, 0, 1, 2, 4, 6, 8, 12],
  dcType: ["stocking", "crossdock", "combined"],
  dcSize: ["small", "medium", "large"],
  flowFresh: ["dc", "dsd"],
  flowChilled: ["dc", "dsd"],
  flowAmbient: ["dc", "dsd"],
  flowFrozen: ["dc", "dsd"],
  freshFreq: [7, 14, 21],
  chilledFreq: [3, 7, 14, 21],
  ambientFreq: [1, 2, 3, 7],
  frozenFreq: [1, 2, 3, 7],
  csl: [0.85, 0.9, 0.93, 0.95, 0.97, 0.99],
  info: ["basic", "pos_daily", "pos_terminal"],
  sharing: ["no", "weekly", "daily"],
  forecast: ["moving_avg", "seasonal", "causal"],
  collaboration: ["arms", "vmi", "cpfr"],
  consolidation: ["supplier", "combined"],
  receiving: ["manual", "scan"],
  window: ["peak", "offpeak"],
  maintenance: ["corrective", "preventive", "predictive"],
  multiTemp: [false, true],
  telemetry: [false, true],
  dcSafetyDays: [0, 1, 2, 4],
  policy: ["rop", "periodic", "tanpin"],
  dedicatedFresh: [false, true],
} as const;

type Vec = { -readonly [K in keyof typeof searchSpace]: (typeof searchSpace)[K][number] };

/** Ubicación de n CD repartidos: la zona con más tiendas y luego las que maximizan tiendas × distancia al CD más cercano. */
function spreadZones(s: S, n: number): number[] {
  const zones = s.model.zones.filter((z) => z.stores > 0);
  const chosen: typeof zones = [];
  while (chosen.length < Math.min(n, zones.length)) {
    const next = zones
      .filter((z) => !chosen.includes(z))
      .reduce((a, b) => {
        const w = (z: (typeof zones)[number]) => z.stores * (chosen.length ? Math.min(...chosen.map((c) => Math.hypot(c.x - z.x, c.y - z.y))) : 1);
        return w(b) > w(a) ? b : a;
      });
    chosen.push(next);
  }
  return chosen.map((z) => z.id);
}

/** Tipos de CD que tendrá la red según el vector (−1 = la red as-is del escenario). */
function vectorDcTypes(v: Vec, scenario: string): string[] {
  if (v.dcCount === -1) return engine.createGame(scmConfig({ region: scenario as RegionId })).model.dcs.map((d) => d.type);
  return Array.from({ length: v.dcCount }, () => v.dcType);
}

/** Vector efectivo (lo que vectorPolicy aplica de verdad): flujos, consolidación, días de CD, colaboración y política coherentes. */
export function canonicalVector(v: Vec, scenario: string): Vec {
  const types = vectorDcTypes(v, scenario);
  const c: Vec = { ...v };
  if (v.dcCount !== -1 && v.dcCount === 0) Object.assign(c, { dcType: "stocking", dcSize: "medium" });
  if (!types.length) Object.assign(c, { flowFresh: "dsd", flowChilled: "dsd", flowAmbient: "dsd", flowFrozen: "dsd" });
  if (!types.includes("combined")) c.consolidation = "supplier";
  if (!types.includes("stocking")) c.dcSafetyDays = 0;
  if (v.sharing === "no") c.collaboration = "arms";
  if (v.policy === "tanpin" && v.info !== "pos_terminal") c.policy = "periodic";
  return c;
}

/** BOT-H · Política a partir de un vector del espacio de búsqueda (se sanea para que siempre valide). */
export function vectorPolicy(v: Vec): Policy<ScmState> {
  return (s, e) => {
    if (e !== 0) return {};
    const dcs: DcSpec[] =
      v.dcCount === -1 ? planned(s) : spreadZones(s, v.dcCount).map((zone, i) => ({ id: `H-${i + 1}`, zone, type: v.dcType, size: v.dcSize }));
    const hasDc = dcs.length > 0;
    const flow = (f: "dc" | "dsd") => (hasDc ? f : "dsd");
    const sharing = v.sharing;
    return {
      "D-01": dcs,
      "D-10": { fresh: flow(v.flowFresh), chilled: flow(v.flowChilled), ambient: flow(v.flowAmbient), frozen: flow(v.flowFrozen) },
      "D-11": { fresh: v.freshFreq, chilled: v.chilledFreq, ambient: v.ambientFreq, frozen: v.frozenFreq },
      "D-21": csl(v.csl),
      "D-30": v.info,
      "D-31": sharing,
      "D-32": v.forecast,
      "D-33": sharing === "no" ? "arms" : v.collaboration,
      "D-12": v.consolidation === "combined" && dcs.some((d) => d.type === "combined") ? "combined" : "supplier",
      "D-23": v.receiving,
      "D-15": v.window,
      "D-16": v.maintenance,
      "D-14": { type: v.multiTemp ? "multi" : "mono", telemetry: v.telemetry },
      "D-24": dcs.some((d) => d.type === "stocking") ? v.dcSafetyDays : 0,
      "D-20": v.policy === "tanpin" && v.info !== "pos_terminal" ? "periodic" : v.policy,
      "D-07": { fresh: v.dedicatedFresh, chilled: (engine.effectiveValue(s, "D-07") as { chilled: boolean }).chilled },
    };
  };
}

/** Vector que reproduce las decisiones as-is de una región (punto de partida del buscador). */
export function baselineVector(scenario: string): Vec {
  const d = engine.createGame(scmConfig({ region: scenario as RegionId })).model.dec;
  const nearest = <T extends number>(xs: readonly T[], x: number) => xs.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  return {
    dcCount: -1,
    dcType: "stocking",
    dcSize: "medium",
    flowFresh: d.flows.fresh,
    flowChilled: d.flows.chilled,
    flowAmbient: d.flows.ambient,
    flowFrozen: d.flows.frozen,
    freshFreq: nearest(searchSpace.freshFreq, d.freq.fresh),
    chilledFreq: nearest(searchSpace.chilledFreq, d.freq.chilled),
    ambientFreq: nearest(searchSpace.ambientFreq, d.freq.ambient),
    frozenFreq: nearest(searchSpace.frozenFreq, d.freq.frozen),
    csl: nearest(searchSpace.csl, (d.csl.fresh + d.csl.chilled + d.csl.ambient + d.csl.frozen) / 4),
    info: d.info,
    sharing: d.sharing,
    forecast: d.forecast,
    collaboration: d.collaboration,
    consolidation: d.consolidation,
    receiving: d.receiving,
    window: d.window,
    maintenance: d.maintenance,
    multiTemp: d.vehicle.type === "multi",
    telemetry: d.vehicle.telemetry,
    dcSafetyDays: nearest(searchSpace.dcSafetyDays, d.dcSafetyDays),
    policy: d.policy,
    dedicatedFresh: d.dedicated.fresh,
  };
}

bots.push({ id: "H", label: "Buscador", purpose: "Óptimos por región × estrategia; detecta explotaciones", policy: (_seed, _scn, args) => vectorPolicy(args as Vec) });
