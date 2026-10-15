/**
 * Catálogo de decisiones (especificación §5). D-01 es la red completa de CD: cada CD trae su zona
 * (D-02), tipo (D-03) y tamaño (D-04), y el modelo gestiona el retraso de cada uno por separado.
 */
import { z } from "zod";
import type { DecisionSpec } from "@mt4035/sim-core";
import { CATEGORIES, type DcSpec, type DcState, type Params, type ScmState } from "./types.ts";

type Spec<V> = DecisionSpec<ScmState, Params, V>;

const perCatSchema = <T extends z.ZodType>(f: (c: (typeof CATEGORIES)[number]) => T) =>
  z.object({ fresh: f("fresh"), chilled: f("chilled"), ambient: f("ambient"), frozen: f("frozen") });

const dcSchema = z.object({
  id: z.string().min(1).max(20),
  zone: z.number().int().min(0).max(35),
  type: z.enum(["stocking", "crossdock", "combined"]),
  size: z.enum(["small", "medium", "large"]),
});

const SIZE_ORDER = { small: 0, medium: 1, large: 2 } as const;

const storeCount = (s: ScmState) => s.zones.reduce((a, zn) => a + zn.stores, 0);

/** Costo de pasar de la red vigente a la red planeada (construcción, conversión, ampliación, cierre). */
/**
 * Costo de pasar a la red planeada, separado en inversión (CD nuevos, conversiones, ampliaciones: cuenta para el tope
 * de inversión, AD-43) e indemnización por cierres (cargo, no inversión).
 */
export function networkCosts(next: readonly DcSpec[], s: ScmState, p: Params): { investment: number; closures: number } {
  const re = p.regions[s.region].realEstate;
  let investment = 0;
  let closures = 0;
  const cur = new Map(s.dcs.map((d) => [d.id, d]));
  for (const n of next) {
    const c = cur.get(n.id);
    if (!c) investment += p.dc.capex[n.size] * p.dc.typeMult[n.type] * re;
    else {
      if (c.type !== n.type) investment += 0.3 * p.dc.capex[n.size] * re;
      if (c.size !== n.size) investment += (p.dc.capex[n.size] - p.dc.capex[c.size]) * re;
    }
  }
  const ids = new Set(next.map((n) => n.id));
  for (const c of s.dcs) if (!ids.has(c.id)) closures += p.dc.closurePenaltyMult * p.dc.capex[c.size] * re;
  return { investment, closures };
}

export function networkCost(next: readonly DcSpec[], s: ScmState, p: Params): number {
  const { investment, closures } = networkCosts(next, s, p);
  return investment + closures;
}

/** Aplica la red planeada al estado con el retraso de cada CD (construir, convertir, ampliar o cerrar). */
export function applyNetwork(s: ScmState, next: readonly DcSpec[], p: Params): void {
  const e = s.epoch;
  const cur = new Map(s.dcs.map((d) => [d.id, d]));
  s.dcs = next.map((n): DcState => {
    const c = cur.get(n.id);
    if (!c) {
      return { ...n, activeFrom: e + p.dc.buildLagEpochs[n.size], prevType: n.type, prevSize: n.size, typeFrom: -1, sizeFrom: -1, downUntil: -1 };
    }
    const curType = e >= c.typeFrom ? c.type : c.prevType;
    const curSize = e >= c.sizeFrom ? c.size : c.prevSize;
    return {
      ...c,
      type: n.type,
      size: n.size,
      prevType: n.type !== c.type ? curType : c.prevType,
      typeFrom: n.type !== c.type ? e + p.dc.convertLagEpochs : c.typeFrom,
      prevSize: n.size !== c.size ? curSize : c.prevSize,
      sizeFrom: n.size !== c.size ? e + p.dc.expandLagEpochs : c.sizeFrom,
    };
  });
}

const plannedDcs = (v: unknown): DcSpec[] => (Array.isArray(v) ? (v as DcSpec[]) : []);

const positive = (max: number) => z.number().finite().positive().max(max);
const forecastSchema = z.object({
  year: z.number().int().min(-1).max(10),
  level: positive(1e6),
  growth: z.number().finite().min(-0.5).max(3),
  quarters: z.array(z.number().finite().min(0.2).max(3)).length(4),
  cv: z.number().finite().min(0).max(1),
  p95: positive(1e7),
});

export const decisions: Spec<any>[] = [
  {
    id: "F-01",
    label: "Pronóstico de demanda por tienda del año",
    tab: "Pronóstico",
    schema: forecastSchema,
    current: (s) => structuredClone(s.dec.demandForecast),
    apply: (s, v) => {
      s.dec.demandForecast = v;
    },
    validate: (v, view) => {
      const e = view.state.epoch;
      if (e % 4 !== 0) return "El pronóstico solo se captura al inicio de cada año (T1)";
      if (v.year !== Math.floor(e / 4)) return `El pronóstico debe ser del año A${Math.floor(e / 4) + 1}`;
      return null;
    },
    kpis: ["FC_SCORE", "FC_WAPE", "OSA", "LOST_SALES", "WASTE", "ITR", "EBITDA_PCT"],
  },
  {
    id: "D-01",
    label: "Red de CEDIS (zona, tipo y tamaño de cada CEDIS)",
    tab: "Red",
    schema: z.array(dcSchema).max(20),
    current: (s) => s.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size })),
    cost: (v, s, p) => networkCost(v, s, p),
    costs: (v, s, p) => {
      const { investment, closures } = networkCosts(v, s, p);
      return [
        { kind: "capex", amount: investment },
        { kind: "penalty", amount: closures, note: "indemnización por cierre de CEDIS" },
      ];
    },
    irreversible: true,
    validate: (v, view) => {
      const ids = new Set<string>();
      for (const dc of v) {
        if (ids.has(dc.id)) return `ID de CEDIS repetido: ${dc.id}`;
        ids.add(dc.id);
      }
      for (const prev of plannedDcs(view.previous("D-01"))) {
        const n = v.find((x) => x.id === prev.id);
        if (!n) continue;
        if (n.zone !== prev.zone) return `${prev.id}: no se puede mover un CEDIS de zona (ciérralo y abre otro)`;
        if (SIZE_ORDER[n.size] < SIZE_ORDER[prev.size]) return `${prev.id}: solo se permite ampliar la capacidad`;
      }
      // Todo pasa por un CEDIS: con tiendas abiertas, la red no puede quedarse vacía.
      if (v.length === 0 && view.state.zones.some((z) => z.stores > 0)) return "La red necesita al menos un CEDIS: sin CEDIS las tiendas no reciben mercancía";
      return null;
    },
    apply: (s, v, p) => applyNetwork(s, v, p),
    kpis: ["CTS_PCT", "CTS_STORE", "OTIF", "OSA", "WASTE", "LT", "ITR", "EBITDA_PCT", "LOST_SALES", "SALES", "TRUCKS", "BWR"],
  } satisfies Spec<DcSpec[]>,
  {
    id: "D-05",
    label: "Estrategia de apertura de tiendas",
    tab: "Red",
    schema: z.enum(["dominance", "dispersed", "mixed"]),
    current: (s) => s.dec.openingStrategy,
    apply: (s, v) => {
      s.dec.openingStrategy = v;
    },
    kpis: ["CTS_STORE", "SALES", "EBITDA_PCT"],
  },
  {
    id: "D-08",
    label: "Lote de apertura de tiendas (abre la época siguiente)",
    tab: "Red",
    schema: z.number().int().min(0).max(500),
    current: () => 0,
    cost: (v, s, p) => v * p.stores.capex * p.regions[s.region].storeCapexMult,
    validate: (v, view) => (v > 0 && plannedDcs(view.effective("D-01")).length === 0 ? "Antes de abrir tiendas necesitas al menos un CEDIS que las surta" : null),
    apply: (s, v, p) => {
      if (v > 0) s.pendingOpenings.push({ stores: v, epoch: s.epoch + p.stores.lagEpochs });
    },
    kpis: ["SALES", "CTS_STORE", "EBITDA_PCT"],
  },
  {
    id: "D-09",
    label: "Cierre de tiendas (cierran la época siguiente)",
    tab: "Red",
    schema: z.object({ zone: z.number().int().min(0).max(35), stores: z.number().int().min(0).max(100) }),
    current: () => ({ zone: 0, stores: 0 }),
    validate: (v, view) => {
      const pending = view.state.pendingClosures.filter((c) => c.zone === v.zone).reduce((a, c) => a + c.stores, 0);
      const have = (view.state.zones[v.zone]?.stores ?? 0) - pending;
      return v.stores > have ? `La zona ${v.zone} solo tiene ${have} tiendas por cerrar` : null;
    },
    cost: (v, _s, p) => v.stores * p.stores.closureCost,
    costKind: "penalty",
    apply: (s, v, p) => {
      if (v.stores > 0) s.pendingClosures.push({ zone: v.zone, stores: v.stores, epoch: s.epoch + p.stores.lagEpochs });
    },
    kpis: ["SALES", "CTS_STORE", "EBITDA_PCT"],
  },
  {
    id: "D-11",
    label: "Frecuencia de reposición a tienda (entregas por semana)",
    tab: "Flujo",
    schema: z.object({
      fresh: z.number().int().min(7).max(14),
      chilled: z.number().int().min(3).max(14),
      ambient: z.number().int().min(1).max(7),
      frozen: z.number().int().min(1).max(7),
    }),
    current: (s) => ({ ...s.dec.freq }),
    apply: (s, v) => {
      s.dec.freq = { ...v };
    },
    kpis: ["CTS_PCT", "CTS_STORE", "WASTE", "OSA", "ITR", "TRUCKS", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-12",
    label: "Consolidación de carga",
    tab: "Flujo",
    schema: z.enum(["supplier", "combined"]),
    current: (s) => s.dec.consolidation,
    validate: (v, view) =>
      v === "combined" && !plannedDcs(view.effective("D-01")).some((dc) => dc.type === "combined") ? "La consolidación combinada requiere un CEDIS combinado por temperatura" : null,
    apply: (s, v) => {
      s.dec.consolidation = v;
    },
    kpis: ["TRUCKS", "CTS_PCT", "EBITDA_PCT"],
  },
  {
    id: "D-20",
    label: "Política de inventario en tienda",
    tab: "Inventario",
    schema: z.enum(["rop", "periodic", "tanpin"]),
    current: (s) => s.dec.policy,
    validate: (v, view) => (v === "tanpin" && view.effective("D-30") !== "pos_terminal" ? "Tanpin kanri requiere POS + terminal gráfica de pedido" : null),
    apply: (s, v) => {
      s.dec.policy = v;
    },
    kpis: ["OSA", "WASTE", "ITR", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-22",
    label: "Surtido por tienda",
    tab: "Inventario",
    schema: z.object({ skus: z.number().int().min(2000).max(4000), local: z.boolean() }),
    current: (s) => ({ ...s.dec.assortment }),
    apply: (s, v) => {
      s.dec.assortment = { ...v };
    },
    kpis: ["SALES", "WASTE", "ITR", "OSA", "EBITDA_PCT", "LOST_SALES"],
  },
  {
    id: "D-23",
    label: "Recepción en tienda",
    tab: "Inventario",
    schema: z.enum(["manual", "scan"]),
    current: (s) => s.dec.receiving,
    cost: (v, s) => (v === "scan" && s.dec.receiving !== "scan" ? 1500 * storeCount(s) : 0),
    apply: (s, v) => {
      s.dec.receiving = v;
    },
    kpis: ["OSA", "CTS_PCT", "OTIF", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-24",
    label: "Inventario de seguridad en CEDIS (días)",
    tab: "Inventario",
    schema: z.number().min(0).max(7),
    current: (s) => s.dec.dcSafetyDays,
    validate: (v, view) =>
      v > 0 && !plannedDcs(view.effective("D-01")).some((dc) => dc.type === "stocking") ? "El inventario en CEDIS requiere un CEDIS con inventario" : null,
    apply: (s, v) => {
      s.dec.dcSafetyDays = v;
    },
    kpis: ["OSA", "ITR", "WASTE", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-30",
    label: "Sistema de información de tienda",
    tab: "Información",
    schema: z.enum(["basic", "pos_daily", "pos_terminal"]),
    current: (s) => s.dec.info,
    lag: (v, _s, p) => p.info.lagEpochs[v as keyof typeof p.info.lagEpochs],
    cost: (v, s, p) => p.info.capexPerStore[v as keyof typeof p.info.capexPerStore] * storeCount(s),
    apply: (s, v) => {
      if (s.dec.info !== v) {
        s.dec.info = v;
        s.infoSince = s.epoch;
        s.infoMaturity = v === "basic" ? 1 : 0;
      }
    },
    kpis: ["OSA", "ITR", "WASTE", "LOST_SALES", "EBITDA_PCT", "SALES"],
  },
  {
    id: "D-31",
    label: "Compartir POS con proveedores",
    tab: "Información",
    schema: z.enum(["no", "yes"]),
    current: (s) => s.dec.sharing,
    lag: () => 1,
    // Implementación: integración con los proveedores (costo fijo por región + por tienda); luego opex semanal.
    cost: (v, s, p) => (v === "yes" && s.dec.sharing !== "yes" ? p.info.sharing.implementation.fixed + p.info.sharing.implementation.perStore * storeCount(s) : 0),
    apply: (s, v) => {
      s.dec.sharing = v;
    },
    kpis: ["BWR", "OTIF", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-32",
    label: "Método de pronóstico del sistema de tiendas",
    tab: "Información",
    schema: z.enum(["basic", "advanced"]),
    current: (s) => s.dec.forecast,
    lag: (_v, _s, p) => p.info.forecast.lagEpochs,
    // Avanzado: implementación del modelo y del equipo de analítica; luego costo fijo del equipo cada semana.
    cost: (v, s, p) => (v === "advanced" && s.dec.forecast !== "advanced" ? p.info.forecast.implementation : 0),
    apply: (s, v) => {
      s.dec.forecast = v;
    },
    kpis: ["OSA", "ITR", "BWR", "WASTE", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-33",
    label: "Colaboración con proveedores: implementar CPFR",
    tab: "Información",
    schema: z.enum(["rmi", "cpfr"]),
    current: (s) => s.dec.collaboration,
    lag: (_v, _s, p) => p.info.cpfr.lagEpochs,
    // Implementación del CPFR (procesos, equipo y acuerdos con proveedores); luego opex semanal del equipo.
    cost: (v, s, p) => (v === "cpfr" && s.dec.collaboration !== "cpfr" ? p.info.cpfr.implementation : 0),
    validate: (v, view) => (v === "cpfr" && view.effective("D-31") === "no" ? "CPFR requiere compartir POS con proveedores" : null),
    apply: (s, v) => {
      if (s.dec.collaboration !== v) {
        s.dec.collaboration = v;
        s.cpfrSince = s.epoch;
        s.cpfrMaturity = 0;
      }
    },
    kpis: ["LT", "OTIF", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-34",
    label: "Capacitación de tienda",
    tab: "Información",
    schema: z.enum(["low", "mid", "high"]),
    current: (s) => s.dec.training,
    lag: () => 1,
    apply: (s, v) => {
      s.dec.training = v;
    },
    kpis: ["OSA", "WASTE", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
];
