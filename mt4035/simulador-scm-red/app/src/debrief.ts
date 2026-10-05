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
  { id: "DB-01", question: "¿Qué propuesta de valor declaraste y qué decisiones de red y flujo (CD, cross-dock o inventario, DSD, frecuencia) tomaste para sostenerla? ¿Cuál fue tu decisión clave?", hint: "Menciona número y tipo de CD, flujo por categoría y frecuencia; explica por qué encaja con la región." },
  { id: "DB-02", question: "¿Qué KPI trataste como primario y cuál como guardrail? Reporta sus valores al final y explica el trade-off entre ambos.", hint: "Explica por qué ese par según tu propuesta de valor y cita valores del reporte final." },
  { id: "DB-03", question: "¿Qué decisión tardó en mostrar efecto? ¿En qué trimestre la tomaste, cuándo se notó y en qué KPI?", hint: "El diálogo de confirmación indica cuándo surte efecto cada decisión." },
  { id: "DB-04", question: "¿Qué evento inesperado te afectó más y qué decisión previa lo agravó o lo amortiguó?", hint: "Usa «¿Por qué pasó esto?» en la bandeja de mensajes para rastrear la cadena causal." },
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
