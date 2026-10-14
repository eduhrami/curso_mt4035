/**
 * Editor del pronóstico de demanda (F-01, AD-33): descarga de datos, formulario de parámetros estimados
 * por el equipo y vista previa de lo que implica para el año. Se captura al inicio de cada año.
 */
import { useEffect, useState } from "preact/hooks";
import { download, Gloss, type CustomControlProps } from "@mt4035/ui-kit";
import { demandCsv, forecastDay, calendarDays, HISTORY_YEARS, params, PEAK_IDS, truthForecast, type Forecast, type LmState, type PeakId } from "../src/index.ts";
import { professor } from "./game.ts";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const PEAK_NAME: Record<PeakId, string> = Object.fromEntries(params.peaks.map((pk) => [pk.id, pk.name])) as Record<PeakId, string>;

type Form = { level: string; growth: string; weekday: string[]; quincena: string; peaks: Record<PeakId, string>; cv: string; p95: string };

const empty = (): Form => ({ level: "", growth: "", weekday: DAYS.map(() => ""), quincena: "", peaks: Object.fromEntries(PEAK_IDS.map((id) => [id, ""])) as Record<PeakId, string>, cv: "", p95: "" });
const pct = (x: number) => String(Math.round(x * 1000) / 10);
const num = (x: number, d = 2) => String(Math.round(x * 10 ** d) / 10 ** d);
const fromForecast = (f: Forecast): Form => ({
  level: String(Math.round(f.level)),
  growth: pct(f.growth),
  weekday: f.weekday.map((w) => num(w)),
  quincena: num(f.quincena),
  peaks: Object.fromEntries(PEAK_IDS.map((id) => [id, num(f.peaks[id])])) as Record<PeakId, string>,
  cv: pct(f.cv),
  p95: String(Math.round(f.p95)),
});

const parse = (v: string) => {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() !== "" && Number.isFinite(n) ? n : NaN;
};

/** Convierte el formulario en pronóstico; devuelve la lista de campos faltantes o inválidos si no se puede. */
function toForecast(f: Form, year: number): { forecast?: Forecast; missing: string[] } {
  const missing: string[] = [];
  const req = (label: string, v: string, ok: (n: number) => boolean) => {
    const n = parse(v);
    if (!Number.isFinite(n) || !ok(n)) missing.push(label);
    return n;
  };
  const level = req("nivel base", f.level, (n) => n > 0);
  const growth = req("crecimiento", f.growth, (n) => n > -50 && n < 300) / 100;
  const weekday = f.weekday.map((w, i) => req(`índice del ${DAYS[i]!.toLowerCase()}`, w, (n) => n >= 0.2 && n <= 3));
  const quincena = req("efecto quincena", f.quincena, (n) => n >= 0.5 && n <= 3);
  const peaks = Object.fromEntries(PEAK_IDS.map((id) => [id, req(PEAK_NAME[id], f.peaks[id], (n) => n > 0 && n <= 6)])) as Record<PeakId, number>;
  const cv = req("CV diario", f.cv, (n) => n >= 0 && n < 100) / 100;
  const p95 = req("p95 diario", f.p95, (n) => n > 0);
  return missing.length ? { missing } : { forecast: { year, level, growth, weekday, quincena, peaks, cv, p95 }, missing };
}

export function ForecastEditor({ value, onChange, state, disabled }: CustomControlProps<LmState>) {
  const fc = value as Forecast;
  const e = state.epoch;
  const year = Math.floor(e / 12);
  const open = e % 12 === 0 && !disabled;
  const captured = fc.year === year;
  // A1 empieza en blanco (el pronóstico por omisión no se muestra); en A2 y A3 se parte del pronóstico anterior.
  const [form, setForm] = useState<Form>(() => (captured || fc.year >= 0 ? fromForecast(fc) : empty()));
  useEffect(() => {
    if (fc.year >= 0) setForm(fromForecast(fc));
    else setForm(empty());
  }, [year]);
  const { forecast, missing } = toForecast(form, year);
  const set = (patch: Partial<Form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    const r = toForecast(next, year);
    if (r.forecast) onChange(r.forecast);
  };
  const t = params.territories[state.model.territory];
  const csv = () => download(`mercado-alba-demanda-${state.model.territory}-${state.config.seed}-hasta-${e}.csv`, demandCsv(state.model, params, state.config.seed, t.zones, e, state.model.noiseScale), "text/csv");
  const yearDays = calendarDays(params, 12 * year, 12 * year + 12);
  const preview = forecast ? yearDays.reduce((a, c) => a + forecastDay(forecast, params, c), 0) / yearDays.length : NaN;
  const truth = professor ? truthForecast(state.model, params, year) : null;
  const field = (label: string, v: string, onInput: (s: string) => void, unit = "", help?: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <span class="small">
        <Gloss text={label} />
      </span>
      <span class="row" style={{ flexWrap: "nowrap", gap: "0.3rem" }}>
        <input type="text" inputMode="decimal" value={v} disabled={!open} onInput={(ev) => onInput((ev.target as HTMLInputElement).value)} style={{ width: "100%" }} />
        {unit && <span class="small muted">{unit}</span>}
      </span>
      {help && <span class="small muted">{help}</span>}
    </label>
  );
  return (
    <div class="stack" style={{ gap: "0.75rem" }} data-testid="forecast-editor">
      <div class="stack" style={{ gap: "0.35rem" }}>
        <p class="small" style={{ margin: 0 }}>
          Descarga la demanda diaria del mercado ({HISTORY_YEARS} años de historia{e > 0 ? " y los meses que ya jugaste" : ""}), analízala por fuera (Excel, Python, R) y captura los parámetros que estimes. Tu pronóstico{" "}
          <strong>dimensiona la flota contratada y los contratos de pico</strong>, y su precisión es el <strong>{Math.round(params.forecast.score.weight * 100)}% de tu puntaje</strong>.
        </p>
        <div class="row">
          <button type="button" onClick={csv} data-testid="download-demand">
            Descargar datos de demanda (CSV)
          </button>
        </div>
        <p class="small" role="status" style={{ margin: 0 }}>
          {captured ? (
            <span>✓ Pronóstico de A{year + 1} capturado{open ? " (puedes ajustarlo antes de confirmar enero)" : ""}.</span>
          ) : open ? (
            <span style={{ color: "var(--warn)" }}>Captura tu pronóstico de A{year + 1} para poder confirmar enero.
              {missing.length > 0 && missing.length <= 4 ? ` Falta: ${missing.join(", ")}.` : missing.length > 4 ? ` Faltan ${missing.length} de 15 campos.` : ""}</span>
          ) : (
            <span class="muted">El pronóstico se captura en enero de cada año. Próxima captura: A{year + 2}-M01.</span>
          )}
        </p>
      </div>

      <fieldset class="stack" style={{ gap: "0.5rem", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem" }} disabled={!open}>
        <legend class="small">
          <strong>Nivel y tendencia</strong>
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {field("Nivel base", form.level, (v) => set({ level: v }), "pedidos/día", `Día típico (sin pico ni quincena, índice semanal 1) al 1 de enero de A${year + 1}`)}
          {field("Crecimiento anual", form.growth, (v) => set({ growth: v }), "%")}
        </div>
      </fieldset>

      <fieldset class="stack" style={{ gap: "0.5rem", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem" }} disabled={!open}>
        <legend class="small">
          <strong>Patrón semanal</strong> (índice estacional; se normaliza a promedio 1)
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))" }}>
          {DAYS.map((d, i) => field(d, form.weekday[i]!, (v) => set({ weekday: form.weekday.map((w, j) => (j === i ? v : w)) }), "×"))}
        </div>
      </fieldset>

      <fieldset class="stack" style={{ gap: "0.5rem", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem" }} disabled={!open}>
        <legend class="small">
          <strong>Estacionalidad y picos</strong> (multiplicador sobre un día normal)
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {field("Quincena", form.quincena, (v) => set({ quincena: v }), "×", "Días 14, 15, 29 y 30")}
          {PEAK_IDS.map((id) => field(PEAK_NAME[id], form.peaks[id], (v) => set({ peaks: { ...form.peaks, [id]: v } }), "×"))}
        </div>
      </fieldset>

      <fieldset class="stack" style={{ gap: "0.5rem", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem" }} disabled={!open}>
        <legend class="small">
          <strong>Distribución diaria</strong>
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {field("CV del ruido diario", form.cv, (v) => set({ cv: v }), "%", "Desviación estándar / media del residuo, quitando tendencia y estacionalidad. Define la holgura de la flota contratada.")}
          {field("p95 de pedidos por día", form.p95, (v) => set({ p95: v }), "pedidos", `Solo 5% de los días de A${year + 1} debería superarlo`)}
        </div>
      </fieldset>

      {open && forecast && !captured && (
        <div class="row">
          <button type="button" class="btn-primary" onClick={() => onChange(forecast)} data-testid="capture-forecast">
            Capturar pronóstico de A{year + 1}
          </button>
        </div>
      )}
      {forecast && (
        <p class="small muted" style={{ margin: 0 }}>
          Con este pronóstico, A{year + 1} promediaría ≈ {Math.round(preview).toLocaleString("es-MX")} pedidos/día.
        </p>
      )}
      {truth && (
        <details class="small">
          <summary>Modo profesor: proceso verdadero de A{year + 1}</summary>
          <p style={{ margin: "0.25rem 0" }}>
            Nivel {Math.round(truth.level)} · crecimiento {pct(truth.growth)}% · semana {truth.weekday.map((w) => num(w)).join(" / ")} · quincena ×{num(truth.quincena)} · picos{" "}
            {PEAK_IDS.map((id) => `${PEAK_NAME[id]} ×${num(truth.peaks[id])}`).join(", ")} · CV {pct(truth.cv)}% · p95 {Math.round(truth.p95)}
          </p>
          {open && (
            <button type="button" class="btn-ghost small" onClick={() => (setForm(fromForecast(truth)), onChange(truth))}>
              Usar el proceso verdadero
            </button>
          )}
        </details>
      )}
    </div>
  );
}
