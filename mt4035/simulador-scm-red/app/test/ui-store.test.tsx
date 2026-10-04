// @vitest-environment happy-dom
/** Controlador de partida (ui-kit) y control generado desde esquemas zod. */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/preact";
import { z } from "zod";
import { MemoryStorage, openStorage } from "@mt4035/sim-core";
import { createGameStore, SchemaControl } from "@mt4035/ui-kit";
import { createScmEngine, PARAMS_VERSION, scmConfig, SIM_VERSION } from "../src/index.ts";

const mkStore = () =>
  createGameStore({
    engine: createScmEngine(),
    storageKey: "t",
    simVersion: SIM_VERSION,
    paramsVersion: PARAMS_VERSION,
    title: (s) => `t ${s.history.length}`,
    finalScore: () => 50,
    storage: openStorage(() => new MemoryStorage()),
    newId: () => "run-1",
    now: () => "2026-10-15T00:00:00.000Z",
  });

describe("ui-kit · store", () => {
  it("un cambio igual al valor vigente no queda en el borrador; uno inválido muestra error", () => {
    const st = mkStore();
    st.start(scmConfig({ region: "redriver", test: { events: "off", noise: 0 } }));
    st.setDecision("D-15", "peak");
    expect(st.changedIds.value).toEqual([]);
    st.setDecision("D-10", { fresh: "dc", chilled: "dsd", ambient: "dsd", frozen: "dsd" });
    expect(st.errors.value["D-10"]).toMatch(/CD/);
    st.resetDecision("D-10");
    expect(st.errors.value).toEqual({});
  });

  it("confirmar avanza la época, guarda la corrida y se puede volver a cargar con replay", async () => {
    const st = mkStore();
    st.start(scmConfig({ region: "valle", seed: 5 }));
    st.setDecision("D-15", "offpeak");
    await st.confirm();
    await st.confirm();
    expect(st.state.value!.epoch).toBe(2);
    expect(st.runs.value).toHaveLength(1);
    const exp = st.runs.value[0]!.data.export;
    expect(exp.epochsPlayed).toBe(2);
    const st2 = mkStore();
    expect(await st2.load(exp)).toBeNull();
    expect(st2.state.value!.history.map((h) => h.kpis.OSA)).toEqual(st.state.value!.history.map((h) => h.kpis.OSA));
  });

  it("no se puede confirmar con decisiones inválidas", async () => {
    const st = mkStore();
    st.start(scmConfig({ region: "redriver" }));
    st.setDecision("D-33", "cpfr");
    expect(await st.confirm()).toBeNull();
    expect(st.state.value!.epoch).toBe(0);
  });
});

describe("ui-kit · SchemaControl", () => {
  it("enum de ≤ 4 opciones como botones de radio con etiquetas; objeto con campos etiquetados", () => {
    let value: unknown = { a: "x", n: 0.9 };
    render(<SchemaControl schema={z.object({ a: z.enum(["x", "y"]), n: z.number().min(0.85).max(0.99) }) as never} value={value} onChange={(v) => (value = v)} labels={{ fields: { a: "Campo A", n: "Nivel" }, format: "pct" }} globalOptions={{ x: "Equis", y: "Ye" }} name="prueba" />);
    expect(screen.getByText("Campo A")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Ye" }));
    expect(value).toEqual({ a: "y", n: 0.9 });
    expect(screen.getByText("90.0%")).toBeTruthy();
  });
});
