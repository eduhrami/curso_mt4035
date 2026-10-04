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
export function networkCost(next: readonly DcSpec[], s: ScmState, p: Params): number {
  const re = p.regions[s.region].realEstate;
  let cost = 0;
  const cur = new Map(s.dcs.map((d) => [d.id, d]));
  for (const n of next) {
    const c = cur.get(n.id);
    if (!c) cost += p.dc.capex[n.size] * p.dc.typeMult[n.type] * re;
    else {
      if (c.type !== n.type) cost += 0.3 * p.dc.capex[n.size] * re;
      if (c.size !== n.size) cost += (p.dc.capex[n.size] - p.dc.capex[c.size]) * re;
    }
  }
  const ids = new Set(next.map((n) => n.id));
  for (const c of s.dcs) if (!ids.has(c.id)) cost += p.dc.closurePenaltyMult * p.dc.capex[c.size] * re;
  return cost;
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

export const decisions: Spec<any>[] = [
  {
    id: "D-00",
    label: "Propuesta de valor declarada",
    tab: "Estrategia",
    schema: z.enum(["freshness", "lowcost", "convenience"]),
    current: (s) => s.strategy,
    maxChanges: 1,
    cost: (_v, _s, p) => p.strategyChangePenalty,
    costKind: "penalty",
    apply: (s, v) => {
      s.strategy = v;
      s.dec.strategy = v;
    },
  } satisfies Spec<ScmState["strategy"]>,
  {
    id: "D-01",
    label: "Red de CD (zona D-02, tipo D-03, tamaño D-04)",
    tab: "Red",
    schema: z.array(dcSchema).max(20),
    current: (s) => s.dcs.map(({ id, zone, type, size }) => ({ id, zone, type, size })),
    cost: (v, s, p) => networkCost(v, s, p),
    irreversible: true,
    validate: (v, view) => {
      const ids = new Set<string>();
      for (const dc of v) {
        if (ids.has(dc.id)) return `ID de CD repetido: ${dc.id}`;
        ids.add(dc.id);
      }
      for (const prev of plannedDcs(view.previous("D-01"))) {
        const n = v.find((x) => x.id === prev.id);
        if (!n) continue;
        if (n.zone !== prev.zone) return `${prev.id}: no se puede mover un CD de zona (ciérralo y abre otro)`;
        if (SIZE_ORDER[n.size] < SIZE_ORDER[prev.size]) return `${prev.id}: solo se permite ampliar la capacidad (D-04)`;
      }
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
    id: "D-06",
    label: "Ritmo de apertura/cierre de tiendas (% anual)",
    tab: "Red",
    schema: z.number().min(-0.1).max(0.15),
    current: (s) => s.dec.openingRate,
    lag: (_v, _s, p) => p.stores.lagEpochs,
    apply: (s, v) => {
      s.dec.openingRate = v;
    },
    kpis: ["SALES", "CTS_STORE", "EBITDA_PCT"],
  },
  {
    id: "D-07",
    label: "Proveedores dedicados cerca de los CD",
    tab: "Red",
    schema: z.object({ fresh: z.boolean(), chilled: z.boolean() }),
    current: (s) => ({ ...s.dec.dedicated }),
    lag: () => 3,
    cost: (v, s, p) => p.supplier.dedicatedCapex * ((v.fresh && !s.dec.dedicated.fresh ? 1 : 0) + (v.chilled && !s.dec.dedicated.chilled ? 1 : 0)),
    apply: (s, v) => {
      s.dec.dedicated = { ...v };
    },
    kpis: ["WASTE", "LT", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-08",
    label: "Lote de apertura de tiendas (abre la época siguiente)",
    tab: "Red",
    schema: z.number().int().min(0).max(500),
    current: () => 0,
    cost: (v, s, p) => v * p.stores.capex * p.regions[s.region].storeCapexMult,
    apply: (s, v, p) => {
      if (v > 0) s.pendingOpenings.push({ stores: v, epoch: s.epoch + p.stores.lagEpochs });
    },
    kpis: ["SALES", "CTS_STORE", "EBITDA_PCT"],
  },
  {
    id: "D-10",
    label: "Flujo por categoría: por CD o entrega directa (DSD)",
    tab: "Flujo",
    schema: perCatSchema(() => z.enum(["dc", "dsd"])),
    current: (s) => ({ ...s.dec.flows }),
    validate: (v, view) =>
      Object.values(v).includes("dc") && plannedDcs(view.effective("D-01")).length === 0 ? "El flujo por CD requiere al menos un CD en la red (D-01)" : null,
    apply: (s, v) => {
      s.dec.flows = { ...v };
    },
    kpis: ["TRUCKS", "CTS_PCT", "OSA", "OTIF", "LT", "WASTE", "ITR", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-11",
    label: "Frecuencia de reposición a tienda (entregas por semana)",
    tab: "Flujo",
    schema: z.object({
      fresh: z.number().int().min(7).max(21),
      chilled: z.number().int().min(3).max(21),
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
      v === "combined" && !plannedDcs(view.effective("D-01")).some((dc) => dc.type === "combined") ? "La consolidación combinada requiere un CD combinado por temperatura (D-03)" : null,
    apply: (s, v) => {
      s.dec.consolidation = v;
    },
    kpis: ["TRUCKS", "CTS_PCT", "EBITDA_PCT"],
  },
  {
    id: "D-13",
    label: "Flota",
    tab: "Flujo",
    schema: z.enum(["own", "dedicated", "spot"]),
    current: (s) => s.dec.fleet,
    apply: (s, v) => {
      s.dec.fleet = v;
    },
    kpis: ["CTS_PCT", "OTIF", "EBITDA_PCT"],
  },
  {
    id: "D-14",
    label: "Tipo de vehículo y telemetría",
    tab: "Flujo",
    schema: z.object({ type: z.enum(["mono", "multi"]), telemetry: z.boolean() }),
    current: (s) => ({ ...s.dec.vehicle }),
    apply: (s, v) => {
      s.dec.vehicle = { ...v };
    },
    kpis: ["WASTE", "CTS_PCT", "EBITDA_PCT"],
  },
  {
    id: "D-15",
    label: "Ventana de entrega en tienda",
    tab: "Flujo",
    schema: z.enum(["peak", "offpeak"]),
    current: (s) => s.dec.window,
    apply: (s, v) => {
      s.dec.window = v;
    },
    kpis: ["CTS_PCT", "OTIF", "WASTE", "EBITDA_PCT"],
  },
  {
    id: "D-16",
    label: "Mantenimiento de flota",
    tab: "Flujo",
    schema: z.enum(["corrective", "preventive", "predictive"]),
    current: (s) => s.dec.maintenance,
    apply: (s, v) => {
      s.dec.maintenance = v;
    },
    kpis: ["WASTE", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-20",
    label: "Política de inventario en tienda",
    tab: "Inventario",
    schema: z.enum(["rop", "periodic", "tanpin"]),
    current: (s) => s.dec.policy,
    validate: (v, view) => (v === "tanpin" && view.effective("D-30") !== "pos_terminal" ? "Tanpin kanri requiere POS + terminal gráfica de pedido (D-30)" : null),
    apply: (s, v) => {
      s.dec.policy = v;
    },
    kpis: ["OSA", "WASTE", "ITR", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-21",
    label: "Nivel de servicio objetivo (CSL) por categoría",
    tab: "Inventario",
    schema: perCatSchema(() => z.number().min(0.85).max(0.99)),
    current: (s) => ({ ...s.dec.csl }),
    apply: (s, v) => {
      s.dec.csl = { ...v };
    },
    kpis: ["OSA", "ITR", "WASTE", "LOST_SALES", "EBITDA_PCT", "SALES"],
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
    label: "Inventario de seguridad en CD (días)",
    tab: "Inventario",
    schema: z.number().min(0).max(7),
    current: (s) => s.dec.dcSafetyDays,
    validate: (v, view) =>
      v > 0 && !plannedDcs(view.effective("D-01")).some((dc) => dc.type === "stocking") ? "El inventario en CD requiere un CD con inventario (D-03)" : null,
    apply: (s, v) => {
      s.dec.dcSafetyDays = v;
    },
    kpis: ["OSA", "ITR", "WASTE", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-25",
    label: "Retiro de frescos",
    tab: "Inventario",
    schema: z.enum(["fifo", "discount"]),
    current: (s) => s.dec.retirement,
    apply: (s, v) => {
      s.dec.retirement = v;
    },
    kpis: ["WASTE", "EBITDA_PCT"],
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
    schema: z.enum(["no", "weekly", "daily"]),
    current: (s) => s.dec.sharing,
    lag: () => 1,
    apply: (s, v) => {
      s.dec.sharing = v;
    },
    kpis: ["BWR", "OTIF", "OSA", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-32",
    label: "Pronóstico",
    tab: "Información",
    schema: z.enum(["moving_avg", "seasonal", "causal"]),
    current: (s) => s.dec.forecast,
    lag: () => 1,
    apply: (s, v) => {
      s.dec.forecast = v;
    },
    kpis: ["OSA", "ITR", "BWR", "WASTE", "EBITDA_PCT", "LOST_SALES", "SALES"],
  },
  {
    id: "D-33",
    label: "Colaboración con proveedores",
    tab: "Información",
    schema: z.enum(["arms", "vmi", "cpfr"]),
    current: (s) => s.dec.collaboration,
    lag: () => 2,
    validate: (v, view) => (v !== "arms" && view.effective("D-31") === "no" ? "VMI y CPFR requieren compartir POS con proveedores (D-31)" : null),
    apply: (s, v) => {
      s.dec.collaboration = v;
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
