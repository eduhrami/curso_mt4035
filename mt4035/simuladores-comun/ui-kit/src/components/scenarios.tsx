/** Selector de escenario de mercado: fichas predefinidas (EM-xx) y, aparte, el perfil avanzado «Crear mi propio escenario». */
import { useRef } from "preact/hooks";

export interface ScenarioCard {
  id: string;
  title: string;
  tagline: string;
  market: Record<string, string>;
  seed: number;
  concept: string;
  watch: string[];
  /** Texto de la región o territorio sugerido. */
  bestWith: string;
}

export interface MarketField {
  key: string;
  label: string;
  options: Record<string, string>;
}

export const CUSTOM_SCENARIO = "custom";

export function ScenarioPicker({
  presets,
  fields,
  base,
  selected,
  market,
  onSelect,
  onMarketChange,
  headingId,
}: {
  presets: ScenarioCard[];
  fields: MarketField[];
  /** Perfil neutro: en cada ficha se resaltan los factores que se apartan de él. */
  base: Record<string, string>;
  /** Id del escenario elegido o `CUSTOM_SCENARIO`. */
  selected: string;
  market: Record<string, string>;
  onSelect: (id: string) => void;
  onMarketChange: (market: Record<string, string>) => void;
  headingId: string;
}) {
  const custom = selected === CUSTOM_SCENARIO;
  // Al cerrar «Crear mi propio escenario» se vuelve al último escenario predefinido elegido.
  const last = useRef(presets[0]!.id);
  if (!custom) last.current = selected;
  return (
    <>
      <div class="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }} role="radiogroup" aria-labelledby={headingId}>
        {presets.map((p) => (
          <button type="button" role="radio" aria-checked={selected === p.id} class="card stack" style={{ textAlign: "left", gap: "0.4rem", outline: selected === p.id ? "2px solid var(--accent)" : undefined }} onClick={() => onSelect(p.id)} key={p.id} data-testid={`preset-${p.id}`}>
            <h3 style={{ margin: 0 }}>{p.title}</h3>
            <p class="small" style={{ margin: 0 }}>
              {p.tagline}
            </p>
            <ul class="small" style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {fields.map((f) => {
                const changed = p.market[f.key] !== base[f.key];
                return (
                  <li key={f.key} class={changed ? undefined : "muted"}>
                    {f.label}: {changed ? <strong>{f.options[p.market[f.key]!]}</strong> : f.options[p.market[f.key]!]}
                  </li>
                );
              })}
            </ul>
            <p class="small" style={{ margin: 0 }}>
              <strong>Concepto:</strong> {p.concept}
            </p>
            <p class="small" style={{ margin: 0 }}>
              <strong>Qué observar:</strong> {p.watch.join(" · ")}
            </p>
            <p class="small muted" style={{ margin: 0 }}>
              {p.id} · semilla {p.seed} · contraste más claro en {p.bestWith}
            </p>
          </button>
        ))}
      </div>
      <p class="small muted">
        Para comparar equipos o estrategias, usen el mismo escenario y su semilla: así todos enfrentan la misma demanda y los mismos eventos, y la diferencia en KPIs se debe a las decisiones.
      </p>
      <details class="scenario-custom" open={custom} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open !== custom && onSelect((e.currentTarget as HTMLDetailsElement).open ? CUSTOM_SCENARIO : last.current)}>
        <summary data-testid="preset-custom">Crear mi propio escenario</summary>
        <p class="small muted">Combina libremente cada factor. Úsalo para explorar; las corridas con perfiles distintos no son comparables entre sí.</p>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span class="small muted">{f.label}</span>
              <select value={market[f.key]} onChange={(e) => onMarketChange({ ...market, [f.key]: (e.target as HTMLSelectElement).value })}>
                {Object.entries(f.options).map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </details>
    </>
  );
}
