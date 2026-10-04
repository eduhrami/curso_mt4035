/** LOG-CAU (P1): dirección causal con pruebas pareadas deterministas (casos de prueba §4). */
import { describe, expect, it } from "vitest";
import { det, oneEpoch, run, start, sumMetric, withOverrides } from "./helpers/run.ts";
import type { TerritoryId } from "../src/types.ts";

const kpis = (territory: TerritoryId, dec: Record<string, unknown> = {}) =>
  oneEpoch(territory, Object.fromEntries(Object.entries(dec).map(([k, v]) => [`dec.${k}`, v]))).kpis;
const increasing = (xs: number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]!);
const decreasing = (xs: number[]) => xs.every((x, i) => i === 0 || x < xs[i - 1]!);
/** Ventana de 2 h: la base para comparar puntualidad (con todo el día el OTD está saturado cerca de 1). */
const W2 = { window: "2h" };

describe("LOG-CAU (P1)", () => {
  it("CAU-01 ventana día → 4 h → 2 h → 1 h: FADS ↑, paradas por ruta ↓ y CPD ↑ (monótonos)", () => {
    const ks = (["day", "4h", "2h", "1h"] as const).map((window) => kpis("megalopolis", { window }));
    expect(increasing(ks.map((k) => k.FADS!))).toBe(true);
    expect(decreasing(ks.map((k) => k.STOPS_ROUTE!))).toBe(true);
    expect(increasing(ks.map((k) => k.CPD!))).toBe(true);
  });

  it("CAU-02 sin ETA → seguimiento en vivo: FADS, CSAT y precisión del ETA ↑", () => {
    const a = kpis("megalopolis", W2);
    const b = kpis("megalopolis", { ...W2, eta: "live" });
    expect(b.FADS).toBeGreaterThan(a.FADS!);
    expect(b.CSAT).toBeGreaterThan(a.CSAT!);
    expect(b.ETA_ACC).toBeGreaterThan(a.ETA_ACC!);
  });

  it("CAU-03 geocodificación: FADS ↑ en Norte y en Bajío, y más en Norte (direcciones peores)", () => {
    const gain = (t: TerritoryId) => kpis(t, { address: "geocode" }).FADS! - kpis(t).FADS!;
    expect(gain("bajio")).toBeGreaterThan(0);
    expect(gain("norte")).toBeGreaterThan(gain("bajio"));
  });

  it("CAU-04 holgura 0% → 20%: OTD ↑ y pedidos ↓ levemente", () => {
    const a = kpis("megalopolis", W2);
    const b = kpis("megalopolis", { ...W2, buffer: 0.2 });
    expect(b.OTD).toBeGreaterThan(a.OTD!);
    expect(b.ORDERS).toBeLessThan(a.ORDERS!);
    expect(b.ORDERS! / a.ORDERS!).toBeGreaterThan(0.95);
  });

  it("CAU-05 un nivel → tres niveles sin segmentar: paradas por ruta ↓ y CPD ↑", () => {
    const a = kpis("megalopolis");
    const b = kpis("megalopolis", { levels: { express: false, sameday: true, nextday: true, standard: true } });
    expect(b.STOPS_ROUTE).toBeLessThan(a.STOPS_ROUTE!);
    expect(b.CPD).toBeGreaterThan(a.CPD!);
  });

  it("CAU-07 SFS 0% → 30%: troncal ↓, CPD urbano ↓ y OTD no empeora", () => {
    const a = kpis("megalopolis", W2);
    const b = kpis("megalopolis", { ...W2, sfs: { share: 0.3, pickers: "4" }, assignment: "threshold" });
    expect(b.LINEHAUL_KM).toBeLessThan(a.LINEHAUL_KM!);
    expect(b.CPD_URBAN).toBeLessThan(a.CPD_URBAN!);
    expect(b.OTD).toBeGreaterThanOrEqual(a.OTD! - 1e-9);
  });

  it("CAU-08 SFS sobre el tope de horas de piso: OSA de tienda ↓ y orden perfecta ↓ (R-05)", () => {
    const sfs = { sfs: { share: 1, pickers: "6" }, assignment: "nearest" };
    const ok = oneEpoch("megalopolis", { "dec.sfs": sfs.sfs, "dec.assignment": "nearest", "dec.sfsCap": 0.5 });
    const over = oneEpoch("megalopolis", { "dec.sfs": sfs.sfs, "dec.assignment": "nearest", "dec.sfsCap": 0.05 });
    expect(over.kpis.STORE_OSA).toBeLessThan(ok.kpis.STORE_OSA!);
    expect(over.kpis.PERFECT).toBeLessThan(ok.kpis.PERFECT!);
    expect(over.rulesFired.some((f) => f.id === "R-05")).toBe(true);
    expect(ok.rulesFired.some((f) => f.id === "R-05")).toBe(false);
  });

  it("CAU-09 dark store: con volumen alto el CPD baja; con volumen bajo sube (no alcanza el equilibrio)", () => {
    const opts = { darkStores: 1, assignment: "threshold" };
    expect(kpis("megalopolis", opts).CPD).toBeLessThan(kpis("megalopolis").CPD!);
    expect(kpis("norte", opts).CPD).toBeGreaterThan(kpis("norte").CPD!);
  });

  it("CAU-11 lockers con presencia baja: FADS ↑ y CPD ↓ (R-14)", () => {
    const a = kpis("megalopolis");
    const b = kpis("megalopolis", { lockers: 30 });
    expect(b.FADS).toBeGreaterThan(a.FADS!);
    expect(b.CPD).toBeLessThan(a.CPD!);
  });

  it("CAU-12 express en Norte: utilización < 50%, CPD ↑↑ y alerta R-04", () => {
    const a = oneEpoch("norte");
    const b = oneEpoch("norte", { "dec.levels": { express: true, sameday: false, nextday: true, standard: false }, "dec.darkStores": 1 });
    expect(sumMetric(b, "expressRoutes")).toBeGreaterThan(0);
    expect(b.tickMetrics.every((m) => m.expressUtil! < 0.5)).toBe(true);
    expect(b.kpis.CPD! / a.kpis.CPD!).toBeGreaterThan(1.3);
    expect(b.rulesFired.some((f) => f.id === "R-04")).toBe(true);
  });

  it("CAU-14 sin frío → hieleras → refrigerado: spoilage ↓ (monótono) y costo ↑", () => {
    const ks = (["none", "coolers", "reefer"] as const).map((cold) => kpis("megalopolis", { cold }));
    expect(decreasing(ks.map((k) => k.SPOIL_RATE!))).toBe(true);
    expect(ks[2]!.SPOIL_RATE).toBeLessThan(0.01);
    expect(increasing(ks.map((k) => k.CPD!))).toBe(true);
  });

  it("CAU-16 manual → VRPTW con telemetría + tráfico: eficiencia de ruta, ETA y OTD ↑, CPD ↓", () => {
    const a = kpis("megalopolis", W2);
    const b = kpis("megalopolis", { ...W2, routing: "vrptw", data: "full", costFn: "timedep" });
    expect(b.ROUTE_EFF).toBeGreaterThan(a.ROUTE_EFF!);
    expect(b.ETA_ACC).toBeGreaterThan(a.ETA_ACC!);
    expect(b.OTD).toBeGreaterThan(a.OTD!);
    expect(b.CPD).toBeLessThan(a.CPD!);
  });

  it("CAU-17 IA con datos básicos obtiene ≤ 30% de la mejora de la IA con datos completos (R-08)", () => {
    // Ventana de 1 h: la precisión del ETA no satura en su tope.
    const base = kpis("megalopolis", { window: "1h", routing: "vrptw", data: "full" });
    const basic = kpis("megalopolis", { window: "1h", routing: "ai", data: "basic" });
    const full = kpis("megalopolis", { window: "1h", routing: "ai", data: "full" });
    const gainFull = full.ROUTE_EFF! - base.ROUTE_EFF!;
    expect(gainFull).toBeGreaterThan(0);
    expect(basic.ROUTE_EFF! - base.ROUTE_EFF!).toBeLessThanOrEqual(0.3 * gainFull + 1e-12);
    expect(full.ETA_ACC! - base.ETA_ACC!).toBeGreaterThan(basic.ETA_ACC! - base.ETA_ACC!);
  });

  it("CAU-22 quitar el pago contra entrega: menos fallas en ambos; la caída de pedidos es mayor en Norte", () => {
    const pair = (t: TerritoryId) => [oneEpoch(t), oneEpoch(t, { "dec.cod": "remove" })] as const;
    const [mA, mB] = pair("megalopolis");
    const [nA, nB] = pair("norte");
    const failRate = (r: typeof mA) => sumMetric(r, "failedFirst") / sumMetric(r, "attempts");
    expect(failRate(mB)).toBeLessThan(failRate(mA));
    expect(failRate(nB)).toBeLessThan(failRate(nA));
    const drop = (a: typeof mA, b: typeof mA) => 1 - b.kpis.ORDERS! / a.kpis.ORDERS!;
    expect(drop(nA, nB)).toBeGreaterThan(drop(mA, mB));
  });

  it("CAU-24 tarifa ↑ ⇒ pedidos ↓; umbral de envío gratis ↑ ⇒ canasta ↑ y CPD por unidad vendida ↓", () => {
    expect(kpis("megalopolis", { fee: { fee: 6, freeThreshold: 0 } }).ORDERS).toBeLessThan(kpis("megalopolis").ORDERS!);
    const a = kpis("megalopolis", { fee: { fee: 3, freeThreshold: 0 } });
    const b = kpis("megalopolis", { fee: { fee: 3, freeThreshold: 60 } });
    const basket = (k: typeof a) => k.REVENUE! / k.DELIVERED!;
    expect(basket(b)).toBeGreaterThan(basket(a));
    expect(b.CPD! / basket(b)).toBeLessThan(a.CPD! / basket(a));
  });

  it("CAU-26 asignación más cercano → umbral dinámico: CPD ↓ y utilización máxima de nodo ↓", () => {
    const sfs = { sfs: { share: 0.5, pickers: "2" }, sfsCap: 0.3 };
    const a = kpis("megalopolis", { ...sfs, assignment: "nearest" });
    const b = kpis("megalopolis", { ...sfs, assignment: "threshold" });
    expect(b.CPD).toBeLessThan(a.CPD!);
    expect(b.NODE_UTIL).toBeLessThan(a.NODE_UTIL!);
  });

  it("CAU-27 Buen Fin: con tope de pedidos por ventana el backlog ↓, el OTD p95 ↑ y los pedidos capturados ↓", () => {
    const beforePeak = run(start(det("megalopolis")), 10).state;
    const buenFin = (slotting: string) => run(withOverrides(beforePeak, { "dec.slotting": slotting }), 1).reports[0]!.kpis;
    const a = buenFin("none");
    const b = buenFin("100");
    expect(b.BACKLOG).toBeLessThan(a.BACKLOG!);
    expect(b.OTD_P95).toBeGreaterThan(a.OTD_P95!);
    expect(b.ORDERS).toBeLessThan(a.ORDERS!);
  });
});
