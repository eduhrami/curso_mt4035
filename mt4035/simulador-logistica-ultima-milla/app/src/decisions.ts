/** Catálogo de decisiones de última milla (especificación §5). */
import { z } from "zod";
import type { DecisionSpec, DecisionView } from "@mt4035/sim-core";
import type { Decisions, LmState, Params } from "./types.ts";

type Spec<V> = DecisionSpec<LmState, Params, V>;

const set =
  <K extends keyof Decisions>(k: K) =>
  (s: LmState, v: Decisions[K]) => {
    s.dec[k] = v;
  };

/** Decisión simple: un campo de `dec`, con esquema y metadatos. */
function field<K extends keyof Decisions>(id: string, key: K, label: string, tab: string, schema: z.ZodType<Decisions[K]>, kpis: string[], extra: Partial<Spec<Decisions[K]>> = {}): Spec<Decisions[K]> {
  return {
    id,
    label,
    tab,
    schema,
    current: (s) => structuredClone(s.dec[key]),
    apply: set(key),
    kpis,
    ...extra,
  };
}

/** Los nodos con obra (dark store, MFC, lockers, hubs) tardan solo cuando se agregan; cerrar es inmediato. */
const growLag = (key: "darkStores" | "mfc" | "lockers" | "hubs", lag: (p: Params) => number) => (v: number, s: LmState, p: Params) => (v > s.dec[key] ? lag(p) : 0);
const growCost = (key: "darkStores" | "mfc" | "lockers" | "hubs", unit: (p: Params) => number) => (v: number, s: LmState, p: Params) => Math.max(0, v - s.dec[key]) * unit(p);

/**
 * Sin el CD debe quedar otro nodo de surtido que ya opere (los nodos en obra todavía no surten)
 * y que no se esté cerrando. Se valida al apagar el CD y al reducir los demás nodos.
 */
function needsNode(view: DecisionView<LmState>): string | null {
  if ((view.effective("D-01") as Decisions["sfd"]).active) return null;
  const now = view.state.dec;
  const ok =
    (now.sfs.share > 0 && (view.effective("D-02") as Decisions["sfs"]).share > 0) ||
    (now.darkStores > 0 && (view.effective("D-04") as number) > 0) ||
    (now.mfc > 0 && (view.effective("D-05") as number) > 0);
  return ok ? null : "Sin el CD necesitas otro nodo de surtido ya operando (tiendas, dark stores o MFC)";
}

const FIN = ["CPD", "CPD_P95", "MARGIN_PCT", "SHIP_PCT"];
const SERVICE = ["OTD", "OTD_P95", "OTIF", "CSAT", "NPS"];

export const decisions: Spec<any>[] = [
  field("D-00", "strategy", "Estrategia de servicio declarada", "Estrategia", z.enum(["speed", "reliability", "efficiency"]), [], {
    maxChanges: 1,
    cost: (_v, _s, p) => p.strategyChangePenalty,
    costKind: "penalty",
    apply: (s, v) => {
      s.strategy = v;
      s.dec.strategy = v;
    },
  }),
  field("D-01", "sfd", "Ship-from-DC (surtido desde el CD)", "Red", z.object({ active: z.boolean(), capacity: z.enum(["low", "mid", "high"]) }), [...SERVICE, ...FIN, "NODE_UTIL", "BACKLOG"], {
    validate: (_v, view) => needsNode(view),
  }),
  field("D-02", "sfs", "Ship-from-store (surtido desde tienda)", "Red", z.object({ share: z.number().min(0).max(1), pickers: z.enum(["2", "4", "6"]) }), [...SERVICE, ...FIN, "STORE_OSA", "NODE_UTIL"], { lag: () => 1, validate: (_v, view) => needsNode(view) }),
  field("D-03", "bopis", "BOPIS: el cliente recoge en tienda", "Red", z.boolean(), [...FIN, "FADS", "CYCLE_HOURS", "ORDERS"], { lag: () => 1 }),
  field("D-04", "darkStores", "Dark stores", "Red", z.number().int().min(0).max(8), [...SERVICE, ...FIN, "CYCLE_HOURS", "NODE_UTIL"], {
    lag: growLag("darkStores", (p) => p.nodes.dark.lag),
    validate: (_v, view) => needsNode(view),
    cost: growCost("darkStores", (p) => p.nodes.dark.capex),
    irreversible: (a, b) => b > a,
  }),
  field("D-05", "mfc", "MFC (micro-fulfillment automatizado)", "Red", z.number().int().min(0).max(3), [...SERVICE, ...FIN, "CYCLE_HOURS", "NODE_UTIL"], {
    lag: growLag("mfc", (p) => p.nodes.mfc.lag),
    validate: (_v, view) => needsNode(view),
    cost: growCost("mfc", (p) => p.nodes.mfc.capex),
    irreversible: (a, b) => b > a,
  }),
  field("D-06", "lockers", "Lockers y puntos de recolección", "Red", z.number().int().min(0).max(200), ["FADS", "FADS_P95", "STOPS_ROUTE", ...FIN, "CSAT"], {
    lag: growLag("lockers", (p) => p.nodes.locker.lag),
    cost: growCost("lockers", (p) => p.nodes.locker.capex),
  }),
  field("D-07", "hubs", "Micro-hubs de cross-dock", "Red", z.number().int().min(0).max(6), [...SERVICE, ...FIN, "EMPTY_MILES"], {
    lag: growLag("hubs", (p) => p.nodes.hub.lag),
    cost: growCost("hubs", (p) => p.nodes.hub.capex),
  }),
  field("D-10", "assignment", "Regla de asignación de nodo", "Asignación", z.enum(["nearest", "lowest", "threshold", "ai"]), [...SERVICE, ...FIN, "NODE_UTIL", "BACKLOG", "STORE_OSA"]),
  field("D-11", "batching", "Intervalo de batching ATP (min)", "Asignación", z.enum(["5", "15", "60", "240"]), ["CYCLE_HOURS", ...FIN]),
  field("D-12", "sfsCap", "Tope de horas de piso para picking en línea", "Asignación", z.number().min(0.05).max(0.5), ["STORE_OSA", "PERFECT", "NODE_UTIL", ...FIN]),
  field("D-20", "levels", "Niveles de servicio ofrecidos", "Promesa", z.object({ express: z.boolean(), sameday: z.boolean(), nextday: z.boolean(), standard: z.boolean() }), ["CYCLE_HOURS", "ORDERS", ...SERVICE, ...FIN, "VEHICLE_UTIL", "STOPS_ROUTE"], {
    validate: (v) => (Object.values(v).some(Boolean) ? null : "Ofrece al menos un nivel de servicio"),
  }),
  field("D-21", "window", "Ancho de la ventana de entrega", "Promesa", z.enum(["1h", "2h", "4h", "day"]), ["FADS", "FADS_P95", "OTD", "OTD_P95", "STOPS_ROUTE", "VEHICLE_UTIL", ...FIN, "CSAT", "ETA_ACC"]),
  field("D-22", "cutoff", "Hora de corte del mismo día", "Promesa", z.enum(["12", "14", "16"]), ["ORDERS", "OTD", "OTD_P95", ...FIN]),
  field("D-23", "buffer", "Holgura de la promesa", "Promesa", z.number().min(0).max(0.3), ["OTD", "OTD_P95", "ORDERS", "CSAT", "CYCLE_HOURS"]),
  field("D-24", "segmentation", "Segmentación del servicio", "Promesa", z.enum(["none", "customer", "category", "zone"]), [...FIN, "STOPS_ROUTE", "VEHICLE_UTIL"]),
  field("D-25", "fee", "Tarifa de envío y umbral de envío gratis", "Promesa", z.object({ fee: z.number().min(0).max(8), freeThreshold: z.number().int().min(0).max(100) }), ["ORDERS", "MARGIN_PCT", "CSAT", "CPD"]),
  field("D-26", "slotting", "Capacidad publicada (slotting)", "Promesa", z.enum(["none", "100", "110"]), ["BACKLOG", "OTD_P95", "ORDERS", "REJECTED", "CSAT"]),
  field("D-30", "fleetMix", "Mezcla de flota", "Flota", z.enum(["3pl", "own", "own_3pl", "own_crowd", "crowd"]), [...FIN, ...SERVICE, "VEHICLE_UTIL", "BACKLOG"]),
  field("D-31", "vehicle", "Tipo de vehículo", "Flota", z.enum(["van", "ev", "moto", "bike", "reefer"]), [...FIN, "CO2", "SPOIL_RATE", "STOPS_ROUTE", "VEHICLE_UTIL", "OTD"]),
  field("D-32", "cold", "Equipo de cadena de frío", "Flota", z.enum(["none", "coolers", "reefer", "multi"]), ["SPOIL_RATE", "EXCEPTION_RATE", "CSAT", ...FIN]),
  field("D-33", "fleetBuffer", "Tamaño de la flota propia", "Flota", z.enum(["lean", "standard", "ample"]), ["VEHICLE_UTIL", "BACKLOG", "OTD_P95", ...FIN]),
  field("D-34", "shifts", "Turnos", "Flota", z.object({ two: z.boolean(), weekends: z.boolean() }), ["BACKLOG", "OTD", ...FIN]),
  field("D-35", "pay", "Esquema de pago a choferes", "Flota", z.enum(["fixed", "per_stop", "mixed"]), ["STOPS_HOUR", "FADS", "EXCEPTION_RATE", ...FIN]),
  field("D-36", "peakContract", "Contratos de flota para picos", "Flota", z.enum(["none", "advance", "spot"]), ["BACKLOG", "OTD_P95", ...FIN], { lag: (v) => (v === "advance" ? 1 : 0) }),
  field("D-40", "zones", "Número de zonas de reparto", "Zonas y ruteo", z.number().int().min(3).max(30), ["ROUTE_EFF", "CPD", "STOPS_ROUTE", "OTD"]),
  field("D-41", "zoning", "Método de zonificación", "Zonas y ruteo", z.enum(["fixed", "kmeans", "balanced", "capacitated", "dynamic"]), ["ROUTE_EFF", "CPD", "OTD"]),
  field("D-42", "rezoning", "Frecuencia de re-zonificación", "Zonas y ruteo", z.enum(["never", "quarterly", "monthly", "daily"]), ["STOPS_HOUR", "CPD", "OTD"]),
  field("D-43", "routing", "Método de ruteo", "Zonas y ruteo", z.enum(["manual", "heuristic", "vrptw", "ai"]), ["ROUTE_EFF", "OTD", "OTD_P95", "ETA_ACC", ...FIN]),
  field("D-44", "costFn", "Función de costo del ruteo", "Zonas y ruteo", z.enum(["euclid", "avgtime", "timedep"]), ["OTD", "OTD_P95", "ETA_ACC"], {
    validate: (v, view) => (v === "timedep" && view.effective("D-60") !== "full" ? "El tiempo dependiente de la hora requiere telemetría + tráfico (D-60)" : null),
  }),
  field("D-45", "loadSeq", "Secuencia de carga", "Zonas y ruteo", z.enum(["none", "fresh_first"]), ["SPOIL_RATE", "EXCEPTION_RATE", "CSAT"]),
  field("D-50", "eta", "Notificación de ETA al cliente", "Cliente", z.enum(["none", "sms", "live"]), ["FADS", "FADS_P95", "CSAT", "ETA_ACC", ...FIN]),
  field("D-51", "address", "Validación de dirección", "Cliente", z.enum(["none", "capture", "geocode"]), ["FADS", "FADS_P95", ...FIN]),
  field("D-52", "absent", "Política ante cliente ausente", "Cliente", z.enum(["retry_same", "retry_next", "divert", "neighbor"]), ["EXCEPTION_RATE", "CYCLE_HOURS", ...FIN, "CSAT"], {
    validate: (v, view) => (v === "divert" && (view.effective("D-06") as number) === 0 && !view.effective("D-03") ? "Desviar a locker o tienda requiere lockers (D-06) o BOPIS (D-03)" : null),
  }),
  field("D-53", "cod", "Pago contra entrega", "Cliente", z.enum(["allow", "limit", "remove"]), ["FADS", "ORDERS", "EXCEPTION_RATE", ...FIN]),
  field("D-55", "returnsChannel", "Canal de devolución", "Devoluciones", z.enum(["store", "pickup", "locker", "mixed"]), ["RETURN_COST", "CSAT", ...FIN], {
    validate: (v, view) => (v === "locker" && (view.effective("D-06") as number) === 0 ? "Devolver en lockers requiere lockers (D-06)" : null),
  }),
  field("D-56", "returnsConsolidation", "Consolidación de devoluciones", "Devoluciones", z.enum(["dedicated", "backhaul"]), ["RETURN_COST", "EMPTY_MILES", "STOPS_ROUTE", ...FIN]),
  field("D-60", "data", "Calidad y granularidad de datos", "Datos y seguridad", z.enum(["basic", "gps", "full"]), ["ROUTE_EFF", "OTD", "ETA_ACC", ...FIN], {
    lag: (v, _s, p) => p.data.lag[v as keyof typeof p.data.lag],
  }),
  field("D-61", "report", "Nivel de agregación del reporte", "Datos y seguridad", z.enum(["mean", "daily", "p95"]), []),
  field("D-62", "security", "Seguridad en ruta", "Datos y seguridad", z.enum(["none", "gps", "full"]), ["EXCEPTION_RATE", ...FIN]),
  field("D-63", "maintenance", "Mantenimiento de flota", "Datos y seguridad", z.enum(["corrective", "preventive"]), ["SPOIL_RATE", "BACKLOG", ...FIN]),
];
