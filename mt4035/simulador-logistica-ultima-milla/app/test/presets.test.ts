/** Escenarios de mercado predefinidos EM-01…EM-04 (especificación §4.3). */
import { describe, expect, it } from "vitest";
import { DEBRIEF_CUSTOM, DEFAULT_MARKET, debriefFor, PRESETS, presetOf, lmConfig } from "../src/index.ts";
import { MARKET_FIELDS } from "../ui/labels.ts";

/** Un cambio que convierte el perfil EM-02 en un escenario propio. */
const CHANGE = { feeSensitivity: "high" } as const;

describe("Escenarios de mercado (EM-xx)", () => {
  it("son cuatro, con id y semilla únicos", () => {
    expect(PRESETS.map((p) => p.id)).toEqual(["EM-01", "EM-02", "EM-03", "EM-04"]);
    expect(new Set(PRESETS.map((p) => p.seed)).size).toBe(PRESETS.length);
  });

  it("cada perfil usa solo opciones válidas de E-20…E-27 (perfil de mercado) y todos son distintos", () => {
    for (const p of PRESETS) {
      expect(Object.keys(p.market).sort()).toEqual(Object.keys(DEFAULT_MARKET).sort());
      for (const f of MARKET_FIELDS) expect(Object.keys(f.options)).toContain((p.market as Record<string, string>)[f.key]);
    }
    expect(new Set(PRESETS.map((p) => JSON.stringify(p.market))).size).toBe(PRESETS.length);
  });

  it("la corrida guarda el escenario y se reconoce; un perfil propio no", () => {
    for (const p of PRESETS) expect(presetOf(lmConfig({ market: p.market, preset: p.id }).scenario)?.id).toBe(p.id);
    expect(presetOf(lmConfig({ market: { ...PRESETS[1]!.market, feeSensitivity: "high" } }).scenario)).toBeUndefined();
    // Corridas anteriores a los escenarios: sin `preset`, se reconocen por el perfil.
    expect(presetOf({ market: { ...DEFAULT_MARKET } })?.id).toBe("EM-01");
    // Un `preset` que ya no coincide con el perfil no se acepta.
    expect(presetOf({ preset: "EM-02", market: { ...DEFAULT_MARKET } })?.id).toBe("EM-01");
  });
});

describe("Debrief (AD-31)", () => {
  it("cada escenario tiene seis preguntas DB-01…DB-06 y DB-05 es la suya", () => {
    for (const p of PRESETS) {
      const d = debriefFor({ preset: p.id, market: p.market });
      expect(d.questions.map((q) => q.id)).toEqual(["DB-01", "DB-02", "DB-03", "DB-04", "DB-05", "DB-06"]);
      expect(d.questions[4]!.question).toBe(p.question);
      expect(d.notes).toEqual(p.watch);
    }
    expect(new Set(PRESETS.map((p) => p.question)).size).toBe(PRESETS.length);
  });

  it("un escenario propio recibe la pregunta genérica", () => {
    const d = debriefFor({ market: { ...PRESETS[1]!.market, ...CHANGE } });
    expect(d.scenario).toBe("Escenario propio");
    expect(d.questions[4]).toEqual(DEBRIEF_CUSTOM);
  });
});
