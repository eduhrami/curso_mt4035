/** Políticas (bots) reutilizables en pruebas y diagnóstico. */
import type { GameState } from "@mt4035/sim-core";
import type { Policy } from "@mt4035/sim-core/testing";
import type { DcSpec, ScmState } from "../../src/types.ts";

/** Trasplante ingenuo del modelo Kaigan (SCM-ESC-04): 3×/día, cross-dock combinado, sin densificar. */
export function naiveTransplant(dcCount = 2): Policy<ScmState> {
  return (s: GameState<ScmState>, e: number) => {
    if (e !== 0) return {};
    const zones = [...s.model.zones].sort((a, b) => b.stores - a.stores).slice(0, dcCount);
    const dcs: DcSpec[] = zones.map((z, i) => ({ id: `N-${i + 1}`, zone: z.id, type: "combined", size: "medium" }));
    return {
      "D-01": dcs,
      "D-10": { fresh: "dc", chilled: "dc", ambient: "dc", frozen: "dc" },
      "D-11": { fresh: 21, chilled: 21, ambient: 7, frozen: 3 },
      "D-12": "combined",
      "D-14": { type: "multi", telemetry: true },
    };
  };
}

/** Diseño adaptado a una región dispersa (SCM-ESC-05). */
export function adaptedDispersed(): Policy<ScmState> {
  return (s: GameState<ScmState>, e: number) => {
    if (e === 0) {
      const centers = [7, 10, 25, 28]; // una rejilla 2×2 de CD regionales
      const dcs: DcSpec[] = centers.map((zone, i) => ({ id: `A-${i + 1}`, zone, type: "stocking", size: "medium" }));
      return {
        "D-01": dcs,
        "D-30": "pos_daily",
        "D-31": "weekly",
        "D-32": "seasonal",
        "D-23": "scan",
      };
    }
    if (e === 3) {
      return {
        "D-10": { fresh: "dsd", chilled: "dc", ambient: "dc", frozen: "dc" },
        "D-11": { fresh: 7, chilled: 3, ambient: 2, frozen: 1 },
        "D-24": 2,
        "D-20": "periodic",
        "D-16": "preventive",
      };
    }
    return {};
  };
}
