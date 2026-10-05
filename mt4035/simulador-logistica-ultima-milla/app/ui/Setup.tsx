/** Pantalla de configuración: territorio, escenario de mercado, estrategia de servicio, semilla y jugador. */
import { useState } from "preact/hooks";
import { CUSTOM_SCENARIO, ScenarioPicker } from "@mt4035/ui-kit";
import { DEFAULT_MARKET, PRESETS, lmConfig, params, type Market, type Strategy, type TerritoryId } from "../src/index.ts";
import { MARKET_FIELDS, MONTHS, OPTIONS, STRATEGY_TEXT, TERRITORY_TEXT } from "./labels.ts";
import { screen, store } from "./game.ts";

type Playable = Exclude<TerritoryId, "minicaso">;
const randomSeed = () => (globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 2 ** 32)) % 1_000_000;

export function Setup() {
  const [territory, setTerritory] = useState<Playable>("megalopolis");
  const [strategy, setStrategy] = useState<Strategy>("reliability");
  const [preset, setPreset] = useState<string>(PRESETS[0]!.id);
  const [market, setMarket] = useState<Market>({ ...PRESETS[0]!.market });
  const [seed, setSeed] = useState(PRESETS[0]!.seed);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const choosePreset = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) {
      setMarket({ ...p.market });
      setSeed(p.seed);
    }
  };
  const start = () => {
    store.start(lmConfig({ territory, strategy, market, ...(preset !== CUSTOM_SCENARIO ? { preset } : {}), seed, player: { ...(name ? { name } : {}), ...(team ? { team } : {}) } }));
    screen.value = "game";
  };
  return (
    <main class="stack" style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem 16px" }}>
      <div class="card stack">
        <h1>Mercado Alba · Dirección de Logística y Última Milla</h1>
        <p>
          Los pedidos en línea de Mercado Alba crecen a doble dígito, pero la operación se improvisó: todo sale del CD con camionetas de un 3PL, la promesa es «día siguiente de 9 a 21 h», casi
          1 de cada 5 entregas falla al primer intento y los frescos llegan tibios. Tienes <strong>36 meses</strong> para decidir desde dónde surtes, qué prometes, con qué flota y cómo ruteas, y
          demostrar con KPIs que el servicio mejora sin que el costo por pedido destruya el margen. Cada mes revisas resultados, ajustas tus decisiones y confirmas.
        </p>
        <p class="small muted">Empresa y territorios ficticios, con datos de referencia de la Sesión 5.</p>
      </div>

      <section class="card stack" aria-labelledby="h-territory">
        <h2 id="h-territory">1. Territorio</h2>
        <div class="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }} role="radiogroup" aria-labelledby="h-territory">
          {(Object.keys(TERRITORY_TEXT) as Playable[]).map((t) => (
            <button type="button" role="radio" aria-checked={territory === t} class="card" style={{ textAlign: "left", outline: territory === t ? "2px solid var(--accent)" : undefined }} onClick={() => setTerritory(t)} key={t}>
              <h3>{TERRITORY_TEXT[t].title}</h3>
              <p class="small">{TERRITORY_TEXT[t].tagline}</p>
              <ul class="small" style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {TERRITORY_TEXT[t].facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <p class="small">
          <strong>Calendario de picos</strong> (cada año; la magnitud, de ×{params.peakMagnitude.min} a ×{params.peakMagnitude.max}, se conoce hasta que ocurre):{" "}
          {params.peaks.map((pk) => `${pk.name} (${MONTHS[pk.month]}, ${pk.days} días)`).join(" · ")} · y cada quincena.
        </p>
      </section>

      <section class="card stack" aria-labelledby="h-strategy">
        <h2 id="h-strategy">2. Estrategia de servicio declarada</h2>
        <div class="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }} role="radiogroup" aria-labelledby="h-strategy">
          {(["speed", "reliability", "efficiency"] as Strategy[]).map((s) => (
            <button type="button" role="radio" aria-checked={strategy === s} class="card" style={{ textAlign: "left", outline: strategy === s ? "2px solid var(--accent)" : undefined }} onClick={() => setStrategy(s)} key={s}>
              <h3>{OPTIONS[s]}</h3>
              <p class="small muted">{STRATEGY_TEXT[s]}</p>
            </button>
          ))}
        </div>
        <p class="small muted">Tu puntaje se calcula según la estrategia que declares, siempre con los días críticos (p95). Puedes cambiarla una sola vez durante la partida, con penalización.</p>
      </section>

      <section class="card stack" aria-labelledby="h-market">
        <h2 id="h-market">3. Escenario de mercado</h2>
        <ScenarioPicker
          headingId="h-market"
          presets={PRESETS.map((p) => ({ ...p, bestWith: TERRITORY_TEXT[p.bestWith].title }))}
          fields={MARKET_FIELDS}
          base={DEFAULT_MARKET}
          selected={preset}
          market={market}
          onSelect={choosePreset}
          onMarketChange={(m) => setMarket(m as Market)}
        />
      </section>

      <section class="card stack" aria-labelledby="h-player">
        <h2 id="h-player">4. Jugador y semilla</h2>
        <div class="field-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          <label>
            <span class="small muted">Nombre (opcional)</span>
            <input type="text" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            <span class="small muted">Equipo (opcional)</span>
            <input type="text" value={team} onInput={(e) => setTeam((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            <span class="small muted">Semilla (misma semilla y mismas decisiones = misma corrida)</span>
            <div class="row" style={{ flexWrap: "nowrap" }}>
              <input type="number" min={0} value={seed} onInput={(e) => setSeed(Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value) || 0)))} />
              <button type="button" onClick={() => setSeed(randomSeed())} aria-label="Nueva semilla aleatoria">
                🎲
              </button>
            </div>
          </label>
        </div>
        <p class="small muted">Tu nombre solo viaja dentro del archivo que tú decidas exportar. No hay servidor ni analítica.</p>
      </section>

      <div class="row" style={{ justifyContent: "space-between" }}>
        <button type="button" onClick={() => (screen.value = "runs")}>
          Corridas guardadas ({store.runs.value.length})
        </button>
        <button type="button" class="btn-primary" onClick={start} data-testid="start">
          Comenzar en {TERRITORY_TEXT[territory].title} →
        </button>
      </div>
    </main>
  );
}
