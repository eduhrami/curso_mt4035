/** Debrief al final de la partida (AD-31): notas del escenario y preguntas que el jugador responde antes de exportar su corrida. */
import type { ComponentChildren } from "preact";
import type { DebriefQuestion } from "../store.ts";
import { Gloss } from "./glossary.tsx";

export function DebriefPanel({
  scenario,
  concept,
  notes,
  questions,
  answers,
  minChars,
  complete,
  onInput,
  onCommit,
  children,
}: {
  /** Nombre del escenario jugado. */
  scenario: string;
  concept?: string;
  /** Qué revisar en la corrida, según el escenario. */
  notes: string[];
  questions: DebriefQuestion[];
  answers: Record<string, string>;
  minChars: number;
  complete: boolean;
  onInput: (id: string, text: string) => void;
  onCommit: () => void;
  /** Acciones al pie (exportar). */
  children?: ComponentChildren;
}) {
  const done = questions.filter((q) => (answers[q.id] ?? "").trim().length >= minChars).length;
  return (
    <section class="card stack" id="debrief" aria-labelledby="h-debrief" data-testid="debrief">
      <h2 id="h-debrief">Debrief · {scenario}</h2>
      {concept && (
        <p class="small" style={{ margin: 0 }}>
          <strong>Concepto del escenario:</strong> <Gloss text={concept} />
        </p>
      )}
      {notes.length > 0 && (
        <div class="small">
          <strong>Qué revisar en tu corrida</strong> (usa las gráficas, la bandeja de mensajes y «¿Por qué pasó esto?»):
          <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem" }}>
            {notes.map((n) => (
              <li key={n}>
                <Gloss text={n} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <p class="small muted" style={{ margin: 0 }}>
        Responde con datos de tu corrida: KPIs, fechas y decisiones. Cada respuesta necesita al menos {minChars} caracteres; tus respuestas se guardan con la corrida y viajan en el JSON que
        entregas.
      </p>
      {questions.map((q, i) => {
        const text = answers[q.id] ?? "";
        const ok = text.trim().length >= minChars;
        return (
          <label key={q.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>
              <strong>{i + 1}.</strong> <Gloss text={q.question} />
            </span>
            {q.hint && (
              <span class="small muted">
                <Gloss text={q.hint} />
              </span>
            )}
            <textarea
              rows={4}
              value={text}
              data-testid={`debrief-${q.id}`}
              onInput={(e) => onInput(q.id, (e.target as HTMLTextAreaElement).value)}
              onBlur={onCommit}
              style={{ width: "100%", font: "inherit", resize: "vertical" }}
            />
            <span class={`small ${ok ? "muted" : ""}`} style={ok ? undefined : { color: "var(--warn)" }}>
              {ok ? "✓ Lista" : `${text.trim().length}/${minChars} caracteres mínimos`}
            </span>
          </label>
        );
      })}
      <p class="small" role="status" style={{ margin: 0 }}>
        {complete ? "✓ Debrief completo: ya puedes exportar tu corrida." : `Respondidas ${done} de ${questions.length}. Completa todas para exportar tu corrida.`}
      </p>
      {children}
    </section>
  );
}
