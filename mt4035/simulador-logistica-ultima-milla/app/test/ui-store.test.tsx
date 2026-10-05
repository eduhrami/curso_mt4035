// @vitest-environment happy-dom
/** Controlador de partida (ui-kit) con el modelo de última milla y textos de la interfaz. */
import { describe, expect, it } from "vitest";
import { MemoryStorage, openStorage } from "@mt4035/sim-core";
import { createGameStore } from "@mt4035/ui-kit";
import { createLastMileEngine, lmConfig, PARAMS_VERSION, SIM_VERSION } from "../src/index.ts";
import { describeValue, kpiMetaFor, KPI_META, LABELS, TABS } from "../ui/labels.ts";

const mkStore = () =>
  createGameStore({
    engine: createLastMileEngine(),
    storageKey: "t",
    simVersion: SIM_VERSION,
    paramsVersion: PARAMS_VERSION,
    title: (s) => `t ${s.history.length}`,
    finalScore: () => 50,
    storage: openStorage(() => new MemoryStorage()),
    newId: () => "run-1",
    now: () => "2026-11-05T00:00:00.000Z",
  });

describe("UI última milla · store", () => {
  it("una decisión incompatible muestra error y se puede deshacer", () => {
    const st = mkStore();
    st.start(lmConfig({ territory: "megalopolis", test: { events: "off", noise: 0 } }));
    st.setDecision("D-21", "day");
    expect(st.changedIds.value).toEqual([]);
    st.setDecision("D-44", "timedep");
    expect(st.errors.value["D-44"]).toMatch(/telemetría/);
    st.setDecision("D-60", "full");
    expect(st.errors.value).toEqual({});
  });

  it("confirmar avanza el mes, guarda la corrida y se reconstruye con replay", async () => {
    const st = mkStore();
    st.start(lmConfig({ territory: "bajio", seed: 5 }));
    st.setDecision("D-21", "2h");
    await st.confirm();
    await st.confirm();
    expect(st.state.value!.epoch).toBe(2);
    const exp = st.runs.value[0]!.data.export;
    expect(exp.epochsPlayed).toBe(2);
    const st2 = mkStore();
    expect(await st2.load(exp)).toBeNull();
    expect(st2.state.value!.history.map((h) => h.kpis.OTD)).toEqual(st.state.value!.history.map((h) => h.kpis.OTD));
  });
});

describe("UI última milla · textos", () => {
  it("cada decisión tiene pestaña conocida y etiquetas; cada KPI del puntaje y guardrail tiene metadatos", () => {
    const eng = createLastMileEngine();
    const tabs = new Set(TABS.map((t) => t.id));
    for (const d of eng.model.decisions) {
      expect(tabs.has(d.tab!), `${d.id} en pestaña ${d.tab}`).toBe(true);
      expect(LABELS[d.id], d.id).toBeDefined();
    }
    const ids = new Set(KPI_META.map((m) => m.id));
    for (const k of ["CYCLE_HOURS", "OTD_P95", "FADS", "CPD_P95", "CSAT", "MARGIN_PCT", "VEHICLE_UTIL", "EXCEPTION_RATE"]) expect(ids.has(k), k).toBe(true);
    expect(kpiMetaFor("norte").find((m) => m.id === "VEHICLE_UTIL")!.guardrail!.value).toBe(0.5);
    expect(kpiMetaFor("megalopolis").find((m) => m.id === "VEHICLE_UTIL")!.guardrail!.value).toBe(0.6);
  });

  it("los valores se describen en español", () => {
    expect(describeValue("D-20", { express: true, sameday: false, nextday: true, standard: false })).toBe("Express (< 2 h), Día siguiente");
    expect(describeValue("D-02", { share: 0.3, pickers: "4" })).toBe("Tiendas que surten: 30%, Surtidores por tienda: 4");
    expect(describeValue("D-61", "p95")).toBe("p95 (días críticos)");
    expect(describeValue("D-23", 0.1)).toBe("10%");
  });
});
