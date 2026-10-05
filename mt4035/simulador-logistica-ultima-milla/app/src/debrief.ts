/**
 * Debrief del final de la partida (AD-31, especificación §11): notas del escenario y preguntas DB-01…DB-06
 * que el jugador responde antes de exportar su corrida. DB-05 depende del escenario.
 */
import { presetOf } from "./presets.ts";

export interface DebriefQuestion {
  id: string;
  question: string;
  hint?: string;
}

export const DEBRIEF_GENERAL: DebriefQuestion[] = [
  { id: "DB-01", question: "¿Desde dónde surtiste (CD, tiendas con SFS, dark stores) y qué promesa de servicio ofreciste? ¿Cuál fue tu decisión clave y por qué encaja con el territorio?", hint: "Menciona la estrategia de servicio declarada, nodos, niveles de servicio y mezcla de flota." },
  { id: "DB-02", question: "¿Qué par primario–guardrail cuidaste? Reporta sus valores al final y explica el trade-off entre ambos.", hint: "Cita valores del reporte final y del dashboard." },
  { id: "DB-03", question: "¿Qué pico (Hot Sale, regreso a clases, Buen Fin, Navidad) fue el más difícil y qué hiciste antes y durante para sostener el servicio?", hint: "Ubica el mes y qué pasó con el OTD p95 y la utilización de flota y nodos." },
  { id: "DB-04", question: "¿Cuánto de tu OTD promedio era real? Compara el promedio con el p95 de los días críticos y explica qué revela la diferencia.", hint: "Usa el selector promedio / p95 del dashboard." },
];

export const DEBRIEF_LAST: DebriefQuestion = { id: "DB-06", question: "Si volvieras a jugar el mismo escenario con la misma semilla, ¿qué cambiarías primero y qué KPI esperas que mejore? ¿Por qué?", hint: "Formula la respuesta como hipótesis: decisión → mecanismo → KPI." };

export const DEBRIEF_CUSTOM: DebriefQuestion = {
  id: "DB-05",
  question: "Armaste tu propio escenario: ¿qué factores cambiaste respecto al perfil neutro, qué querías probar y qué confirmaste o refutaste con tus KPIs?",
  hint: "Si tienes una corrida en un escenario predefinido, compárala con esta.",
};

/** Escenario, concepto, notas y preguntas del debrief para el escenario de una corrida. */
export function debriefFor(scenario: Parameters<typeof presetOf>[0]) {
  const p = presetOf(scenario);
  const own: DebriefQuestion = p ? { id: "DB-05", question: p.question, hint: p.hint } : DEBRIEF_CUSTOM;
  return {
    scenario: p?.title ?? "Escenario propio",
    concept: p?.concept,
    notes: p?.watch ?? ["Qué factores de tu perfil movieron más tus KPIs", "Cómo se comparan tus resultados con los de un escenario predefinido"],
    questions: [...DEBRIEF_GENERAL, own, DEBRIEF_LAST],
  };
}
