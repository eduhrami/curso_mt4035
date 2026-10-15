/** Bots de referencia del simulador SCM (casos de prueba §11.1). */
import { createRng, type DecisionChanges, type GameState } from "@mt4035/sim-core";
import type { Policy } from "@mt4035/sim-core/testing";
import type { Bot } from "@mt4035/sim-tools";
import { truthForecast } from "../src/forecast.ts";
import { withBudget } from "./budget.ts";
import { createScmEngine, params, scmConfig } from "../src/model.ts";
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

/** BOT-B · Trasplante del modelo Kaigan: 2×/día, cross-dock combinado, sin densificar. */
export function naiveTransplant(dcCount = 2): Policy<ScmState> {
  return (s, e) => {
    if (e !== 0) return {};
    const dcs: DcSpec[] = topZones(s, dcCount).map((zone, i) => ({ id: `N-${i + 1}`, zone, type: "combined", size: "medium" }));
    return { "D-01": [...planned(s), ...dcs], "D-11": { fresh: 14, chilled: 14, ambient: 7, frozen: 3 }, "D-12": "combined" };
  };
}

/** BOT-C en Red River: conserva el CEDIS central y suma CEDIS regionales combinados chicos (caben en el tope de inversión en dos años), información y consolidación combinada. */
export function adaptedDispersed(): Policy<ScmState> {
  return (s, e) => {
    if (e === 0) {
      const dcs: DcSpec[] = [7, 10, 25, 28].map((zone, i) => ({ id: `A-${i + 1}`, zone, type: "combined", size: "small" }));
      return { "D-01": [...planned(s), ...dcs], "D-12": "combined", "D-30": "pos_daily", "D-31": "yes", "D-32": "advanced", "D-23": "scan" };
    }
    if (e === 3) {
      return { "D-11": { fresh: 7, chilled: 3, ambient: 2, frozen: 1 }, "D-24": 2, "D-20": "periodic" };
    }
    return {};
  };
}

/** BOT-C en Valle: convierte sus CEDIS con inventario a combinados (los frescos dejan de envejecer en el CEDIS) con
 * consolidación combinada, frescos 2×/día, POS con terminal y tanpin kanri, POS compartido. */
export function adaptedValle(): Policy<ScmState> {
  return (s, e) => {
    if (e === 0) {
      return {
        "D-01": planned(s).map((d) => ({ ...d, type: "combined" as const })),
        "D-12": "combined",
        "D-11": { fresh: 14, chilled: 3, ambient: 1, frozen: 1 },
        "D-30": "pos_terminal",
        "D-31": "yes",
        "D-23": "scan",
      };
    }
    // Tanpin kanri cuando la terminal ya está implantada.
    if (e === 4) return { "D-20": "tanpin" };
    return {};
  };
}

/** BOT-C en Kaigan: convierte el CEDIS central a combinado y construye tres combinados a lo largo de la costa, con
 * consolidación combinada, frescos 2×/día y CPFR desde el inicio (el tope reparte la red en dos años). */
export function adaptedKaigan(): Policy<ScmState> {
  return (s, e) =>
    e === 0
      ? {
          "D-01": [
            ...planned(s).map((d) => ({ ...d, type: "combined" as const })),
            { id: "K-1", zone: 0, type: "combined", size: "medium" },
            { id: "K-2", zone: 24, type: "combined", size: "medium" },
            { id: "K-3", zone: 30, type: "combined", size: "medium" },
          ],
          "D-12": "combined",
          "D-11": { fresh: 14, chilled: 3, ambient: 2, frozen: 1 },
          "D-33": "cpfr",
        }
      : {};
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
      "D-11": { fresh: 14, chilled: 14, ambient: 7, frozen: 7 },
      "D-12": "combined",
      "D-30": "pos_terminal",
      "D-31": "yes",
      "D-32": "advanced",
      "D-33": "cpfr",
      "D-34": "high",
      "D-23": "scan",
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
      "D-11": { fresh: 7, chilled: 3, ambient: 1, frozen: 1 },
      "D-12": "supplier",
      "D-30": "basic",
      "D-31": "no",
      "D-32": "basic",
      "D-33": "rmi",
      "D-34": "low",
      "D-20": "periodic",
      "D-23": "manual",
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
      { "D-31": pick(["no", "yes"]) },
      { "D-32": pick(["basic", "advanced"]) },
      { "D-22": { skus: st.int(2000, 4000), local: st.bernoulli(0.5) } },
      { "D-23": pick(["manual", "scan"]) },
      { "D-34": pick(["low", "mid", "high"]) },
      { "D-05": pick(["dominance", "dispersed", "mixed"]) },
      { "D-08": st.int(0, 60) },
      { "D-30": pick(["basic", "pos_daily", "pos_terminal"]) },
      { "D-33": pick(["rmi", "cpfr"]) },
      { "D-20": pick(["rop", "periodic", "tanpin"]) },
      { "D-24": st.uniform(0, 5) },
      { "D-12": pick(["supplier", "combined"]) },
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

/** BOT-G · Reactivo: ajusta la frecuencia con reglas simples sobre los KPIs de la época anterior (el CSL lo fija la estrategia). */
export function reactive(): Policy<ScmState> {
  return (s): DecisionChanges => {
    const last = s.history[s.history.length - 1]?.kpis;
    if (!last) return {};
    const freq = { ...(engine.effectiveValue(s, "D-11") as ScmState["dec"]["freq"]) };
    if (last.OSA_FRESH! < 0.92 || last.WASTE_FRESH! > 0.08) freq.fresh = Math.min(14, freq.fresh + 7);
    if (last.CTS_PCT! > 0.12) {
      freq.ambient = Math.max(1, freq.ambient - 1);
      freq.chilled = Math.max(3, freq.chilled - 2);
    }
    return { "D-11": freq };
  };
}

/** BOT-I · Solo información: POS diario y compartido con proveedores, nada más (SCM-AUT-11). */
export function infoOnly(): Policy<ScmState> {
  return (_s, e) => (e === 0 ? { "D-30": "pos_daily", "D-31": "yes" } : {});
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
  dcCount: [-1, 1, 2, 4, 6, 8, 12],
  dcType: ["stocking", "crossdock", "combined"],
  dcSize: ["small", "medium", "large"],
  freshFreq: [7, 14],
  chilledFreq: [3, 7, 14],
  ambientFreq: [1, 2, 3, 7],
  frozenFreq: [1, 2, 3, 7],
  info: ["basic", "pos_daily", "pos_terminal"],
  sharing: ["no", "yes"],
  forecast: ["basic", "advanced"],
  // Momento de implantar CPFR (desde RMI): el beneficio madura en varios trimestres, así que tarde ya no se paga.
  cpfrAt: ["never", "A1", "A2", "A3"],
  consolidation: ["supplier", "combined"],
  receiving: ["manual", "scan"],
  dcSafetyDays: [0, 1, 2, 4],
  policy: ["rop", "periodic", "tanpin"],
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

/** Vector efectivo (lo que vectorPolicy aplica de verdad): consolidación, días de CD, colaboración y política coherentes. */
export function canonicalVector(v: Vec, scenario: string): Vec {
  const types = vectorDcTypes(v, scenario);
  const c: Vec = { ...v };
  if (!types.includes("combined")) c.consolidation = "supplier";
  if (!types.includes("stocking")) c.dcSafetyDays = 0;
  if (v.sharing === "no") c.cpfrAt = "never";
  if (v.policy === "tanpin" && v.info !== "pos_terminal") c.policy = "periodic";
  return c;
}

/** BOT-H · Política a partir de un vector del espacio de búsqueda (se sanea para que siempre valide). */
export function vectorPolicy(v: Vec): Policy<ScmState> {
  const cpfrEpoch = { never: -1, A1: 0, A2: 4, A3: 8 }[v.cpfrAt];
  return (s, e) => {
    if (e !== 0) return e === cpfrEpoch && v.sharing === "yes" ? { "D-33": "cpfr" } : {};
    const dcs: DcSpec[] =
      v.dcCount === -1 ? planned(s) : spreadZones(s, v.dcCount).map((zone, i) => ({ id: `H-${i + 1}`, zone, type: v.dcType, size: v.dcSize }));
    const sharing = v.sharing;
    return {
      "D-01": dcs,
      "D-11": { fresh: v.freshFreq, chilled: v.chilledFreq, ambient: v.ambientFreq, frozen: v.frozenFreq },
      "D-30": v.info,
      "D-31": sharing,
      "D-32": v.forecast,
      ...(cpfrEpoch === 0 && sharing === "yes" ? { "D-33": "cpfr" } : {}),
      "D-12": v.consolidation === "combined" && dcs.some((d) => d.type === "combined") ? "combined" : "supplier",
      "D-23": v.receiving,
      "D-24": dcs.some((d) => d.type === "stocking") ? v.dcSafetyDays : 0,
      "D-20": v.policy === "tanpin" && v.info !== "pos_terminal" ? "periodic" : v.policy,
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
    freshFreq: nearest(searchSpace.freshFreq, d.freq.fresh),
    chilledFreq: nearest(searchSpace.chilledFreq, d.freq.chilled),
    ambientFreq: nearest(searchSpace.ambientFreq, d.freq.ambient),
    frozenFreq: nearest(searchSpace.frozenFreq, d.freq.frozen),
    info: d.info,
    sharing: d.sharing,
    forecast: d.forecast,
    cpfrAt: d.collaboration === "cpfr" ? "A1" : "never",
    consolidation: d.consolidation,
    receiving: d.receiving,
    dcSafetyDays: nearest(searchSpace.dcSafetyDays, d.dcSafetyDays),
    policy: d.policy,
  };
}

bots.push({ id: "H", label: "Buscador", purpose: "Óptimos por región × estrategia; detecta explotaciones", policy: (_seed, _scn, args) => vectorPolicy(args as Vec) });

/** Los bots de referencia pronostican bien (F-01 = proceso verdadero cada T1): la operación se calibra aparte del pronóstico. */
const withForecast =
  (pol: Policy<ScmState>, k = 1): Policy<ScmState> =>
  (s, e) => ({ ...(e % 4 === 0 ? { "F-01": scaledForecast(truthForecast(s.model, params, e / 4), k) } : {}), ...pol(s, e) });
const scaledForecast = <F extends { level: number; p95: number }>(f: F, k: number): F => (k === 1 ? f : { ...f, level: f.level * k, p95: f.p95 * k });
/**
 * Error de pronóstico del buscador (BOT-H): ±10% según la paridad de la semilla, como un equipo típico. Con pronóstico
 * perfecto el POS (D-30) no tiene qué corregir y nunca se pagaría; con error, el POS diario amortigua el error (AD-40).
 */
export const searchForecastError = (seed: number) => (seed % 2 ? 1.1 : 0.9);
for (const b of bots) {
  const inner = b.policy;
  // Todos los bots respetan el tope de inversión anual (AD-43): lo que no cabe se difiere al año siguiente.
  b.policy = (seed, scn, args) => withForecast(withBudget(inner(seed, scn, args)), b.id === "H" ? searchForecastError(seed) : 1);
}
