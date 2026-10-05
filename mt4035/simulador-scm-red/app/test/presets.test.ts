/** Escenarios de mercado predefinidos EM-01…EM-04 (especificación §4.3). */
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKET, PRESETS, presetOf, scmConfig } from "../src/index.ts";
import { MARKET_FIELDS } from "../ui/labels.ts";

describe("Escenarios de mercado (EM-xx)", () => {
  it("son cuatro, con id y semilla únicos", () => {
    expect(PRESETS.map((p) => p.id)).toEqual(["EM-01", "EM-02", "EM-03", "EM-04"]);
    expect(new Set(PRESETS.map((p) => p.seed)).size).toBe(PRESETS.length);
  });

  it("cada perfil usa solo opciones válidas de E-20…E-27 y todos son distintos", () => {
    for (const p of PRESETS) {
      expect(Object.keys(p.market).sort()).toEqual(Object.keys(DEFAULT_MARKET).sort());
      for (const f of MARKET_FIELDS) expect(Object.keys(f.options)).toContain((p.market as Record<string, string>)[f.key]);
    }
    expect(new Set(PRESETS.map((p) => JSON.stringify(p.market))).size).toBe(PRESETS.length);
  });

  it("la corrida guarda el escenario y se reconoce; un perfil propio no", () => {
    for (const p of PRESETS) expect(presetOf(scmConfig({ market: p.market, preset: p.id }).scenario)?.id).toBe(p.id);
    expect(presetOf(scmConfig({ market: { ...PRESETS[1]!.market, fuel: "rising" } }).scenario)).toBeUndefined();
    // Corridas anteriores a los escenarios: sin `preset`, se reconocen por el perfil.
    expect(presetOf({ market: { ...DEFAULT_MARKET } })?.id).toBe("EM-01");
    // Un `preset` que ya no coincide con el perfil no se acepta.
    expect(presetOf({ preset: "EM-02", market: { ...DEFAULT_MARKET } })?.id).toBe("EM-01");
  });
});
