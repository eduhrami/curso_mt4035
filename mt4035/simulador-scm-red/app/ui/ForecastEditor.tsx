/**
 * Editor del pronóstico de demanda por tienda (F-01, AD-35): descarga de datos semanales, parámetros
 * estimados por el equipo y vista previa. Se captura al inicio de cada año (T1).
 */
import { useEffect, useState } from "preact/hooks";
import { download, Gloss, type CustomControlProps } from "@mt4035/ui-kit";
import { demandCsv, forecastWeek, HISTORY_YEARS, params, truthForecast, WEEKS_PER_YEAR, type DemandForecast, type ScmState } from "../src/index.ts";
import { professor } from "./game.ts";

const QUARTERS = ["T1", "T2", "T3", "T4"];
type Form = { level: string; growth: string; quarters: string[]; cv: string; p95: string };

const empty = (): Form => ({ level: "", growth: "", quarters: QUARTERS.map(() => ""), cv: "", p95: "" });
const pct = (x: number) => String(Math.round(x * 1000) / 10);
const num = (x: number, d = 2) => String(Math.round(x * 10 ** d) / 10 ** d);
const fromForecast = (f: DemandForecast): Form => ({ level: num(f.level, 1), growth: pct(f.growth), quarters: f.quarters.map((q) => num(q, 3)), cv: pct(f.cv), p95: num(f.p95, 1) });
const parse = (v: string) => {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() !== "" && Number.isFinite(n) ? n : NaN;
};

function toForecast(f: Form, year: number): { forecast?: DemandForecast; missing: string[] } {
  const missing: string[] = [];
  const req = (label: string, v: string, ok: (n: number) => boolean) => {
    const n = parse(v);
    if (!Number.isFinite(n) || !ok(n)) missing.push(label);
    return n;
  };
  const level = req("nivel base", f.level, (n) => n > 0);
  const growth = req("crecimiento", f.growth, (n) => n > -50 && n < 300) / 100;
  const quarters = f.quarters.map((q, i) => req(`índice de ${QUARTERS[i]}`, q, (n) => n >= 0.2 && n <= 3));
  const cv = req("CV semanal", f.cv, (n) => n >= 0 && n < 100) / 100;
  const p95 = req("p95 semanal", f.p95, (n) => n > 0);
  return missing.length ? { missing } : { forecast: { year, level, growth, quarters, cv, p95 }, missing };
}

export function ForecastEditor({ value, onChange, state, disabled }: CustomControlProps<ScmState>) {
  const fc = value as DemandForecast;
  const e = state.epoch;
  const year = Math.floor(e / 4);
  const open = e % 4 === 0 && !disabled;
  const captured = fc.year === year;
  const [form, setForm] = useState<Form>(() => (fc.year >= 0 ? fromForecast(fc) : empty()));
  useEffect(() => setForm(fc.year >= 0 ? fromForecast(fc) : empty()), [year]);
  const { forecast, missing } = toForecast(form, year);
  const set = (patch: Partial<Form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    const r = toForecast(next, year);
    if (r.forecast) onChange(r.forecast);
  };
  const csv = () => download(`hoshi-mart-demanda-${state.model.region}-${state.config.seed}-hasta-${e}.csv`, demandCsv(state.model, params, state.config.seed, state.model.week, state.model.noiseScale), "text/csv");
  const preview = forecast ? Array.from({ length: WEEKS_PER_YEAR }, (_, i) => forecastWeek(forecast, year * WEEKS_PER_YEAR + i)).reduce((a, b) => a + b, 0) / WEEKS_PER_YEAR : NaN;
  const truth = professor ? truthForecast(state.model, params, year) : null;
  const box = { gap: "0.5rem", border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem" };
  const field = (label: string, v: string, onInput: (s: string) => void, unit = "", help?: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }} key={label}>
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
          Descarga la demanda semanal por tienda de la región ({HISTORY_YEARS} años de historia{e > 0 ? " y los trimestres que ya jugaste" : ""}), analízala por fuera (Excel, Python, R) y captura los parámetros que estimes. <strong>Estímalos con la columna «total»</strong> (suma de las cuatro categorías); las columnas por categoría sirven para explorar. Tu pronóstico{" "}
          <strong>fija el inventario objetivo y el stock de seguridad de las tiendas</strong>: quedarte corto baja la OSA; pasarte sube la merma y el inventario. Las dos cosas bajan tu <strong>utilidad</strong>: a mayor precisión del pronóstico, mejores resultados.
        </p>
        <p class="small" style={{ margin: 0 }} data-testid="forecast-model">
          <strong>Modelo: descomposición multiplicativa.</strong> Captura sus parámetros. Para cada semana, pronóstico = nivel base × (1 + crecimiento anual)<sup>(semanas desde el inicio del año / 52)</sup> × índice del trimestre (T1–T4, promedio 1); el índice es el mismo en las 13 semanas del trimestre. Equivale a Holt-Winters con tendencia y estacionalidad multiplicativas cuando sus tres parámetros de suavizamiento (α del nivel, β de la tendencia, γ de la estacionalidad) valen cero: nivel, crecimiento e índices quedan fijos en lugar de actualizarse cada semana. Así puedes replicar el pronóstico en una hoja de cálculo: en la historia, la columna «semana» cuenta desde el inicio de A1 (es negativa antes). Residuo semanal = real / pronóstico − 1; el CV es la desviación estándar de los residuos, y el p95 es el valor que solo 5% de las semanas del año supera.
        </p>
        <div class="row">
          <button type="button" onClick={csv} data-testid="download-demand">
            Descargar datos de demanda (CSV)
          </button>
        </div>
        <p class="small" role="status" style={{ margin: 0 }}>
          {captured ? (
            <span>✓ Pronóstico de A{year + 1} capturado{open ? " (puedes ajustarlo antes de confirmar el trimestre)" : ""}.</span>
          ) : open ? (
            <span style={{ color: "var(--warn)" }}>
              Captura tu pronóstico de A{year + 1} para poder confirmar T1.
              {missing.length > 0 && missing.length <= 3 ? ` Falta: ${missing.join(", ")}.` : missing.length > 3 ? ` Faltan ${missing.length} de 8 campos.` : ""}
            </span>
          ) : (
            <span class="muted">El pronóstico se captura en T1 de cada año. Próxima captura: A{year + 2}-T1.</span>
          )}
        </p>
      </div>

      <fieldset class="stack" style={box} disabled={!open}>
        <legend class="small">
          <strong>Nivel y tendencia</strong>
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {field("Nivel base", form.level, (v) => set({ level: v }), "unid./tienda/día", `Trimestre de índice 1, al inicio de A${year + 1}`)}
          {field("Crecimiento anual", form.growth, (v) => set({ growth: v }), "%")}
        </div>
      </fieldset>

      <fieldset class="stack" style={box} disabled={!open}>
        <legend class="small">
          <strong>Estacionalidad</strong> (índice estacional por trimestre; se normaliza a promedio 1)
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
          {QUARTERS.map((q, i) => field(q, form.quarters[i]!, (v) => set({ quarters: form.quarters.map((x, j) => (j === i ? v : x)) }), "×"))}
        </div>
      </fieldset>

      <fieldset class="stack" style={box} disabled={!open}>
        <legend class="small">
          <strong>Distribución semanal</strong>
        </legend>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {field("CV del residuo semanal", form.cv, (v) => set({ cv: v }), "%", "Desviación estándar / media del residuo semanal, quitando tendencia y estacionalidad. Escala el stock de seguridad.")}
          {field("p95 semanal", form.p95, (v) => set({ p95: v }), "unid./tienda/día", `Solo 5% de las semanas de A${year + 1} debería superarlo`)}
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
          Con este pronóstico, A{year + 1} promediaría ≈ {num(preview, 1)} unidades por tienda por día.
        </p>
      )}
      {truth && (
        <details class="small">
          <summary>Modo profesor: proceso verdadero de A{year + 1}</summary>
          <p style={{ margin: "0.25rem 0" }}>
            Nivel {num(truth.level, 1)} · crecimiento {pct(truth.growth)}% · trimestres {truth.quarters.map((q) => num(q, 3)).join(" / ")} · CV semanal {pct(truth.cv)}% · p95 {num(truth.p95, 1)}
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
