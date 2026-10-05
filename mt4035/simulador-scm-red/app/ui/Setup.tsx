/** Pantalla de configuración: región, escenario de mercado, estrategia declarada, semilla y jugador. */
import { useState } from "preact/hooks";
import { CourseCredits, CUSTOM_SCENARIO, Gloss, ScenarioPicker } from "@mt4035/ui-kit";
import { DEFAULT_MARKET, PRESETS, scmConfig, type MarketProfile, type RegionId, type Strategy } from "../src/index.ts";
import { MARKET_FIELDS, OPTIONS, REGION_TEXT, STRATEGY_TEXT } from "./labels.ts";
import { glossaryOpen, screen, store } from "./game.ts";

const randomSeed = () => (globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 2 ** 32)) % 1_000_000;

export function Setup() {
  const [region, setRegion] = useState<RegionId>("redriver");
  const [strategy, setStrategy] = useState<Strategy>("freshness");
  const [preset, setPreset] = useState<string>(PRESETS[0]!.id);
  const [market, setMarket] = useState<MarketProfile>({ ...PRESETS[0]!.market });
  const [greenfield, setGreenfield] = useState(false);
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
    store.start(scmConfig({ region, strategy, market, ...(preset !== CUSTOM_SCENARIO ? { preset } : {}), greenfield, seed, player: { ...(name ? { name } : {}), ...(team ? { team } : {}) } }));
    screen.value = "game";
  };
  return (
    <main class="stack" style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem 16px" }}>
      <div class="card stack">
        <h1>Hoshi Mart · Dirección de Supply Chain</h1>
        <p>
          Hoshi Mart compró Prairie Stop y el consejo evalúa entrar a Valle Metropolitano. Tienes <strong>5 años (20 trimestres)</strong> para decidir qué propuesta de valor sostiene cada región,
          diseñar la red que la haga posible y demostrarlo con números. Cada trimestre revisas resultados, ajustas tus decisiones y confirmas.
        </p>
        <p class="small muted">Empresa y regiones ficticias, inspiradas en el caso Seven-Eleven Japan (Kellogg KEL026).</p>
        <p class="small" style={{ margin: 0 }}>
          ¿Dudas con alguna sigla? Abre el{" "}
          <button type="button" class="btn-ghost small" onClick={() => (glossaryOpen.value = true)} data-testid="setup-glossary">
            glosario
          </button>{" "}
          o pasa el mouse sobre los términos subrayados con puntos.
        </p>
        <CourseCredits />
      </div>

      <section class="card stack" aria-labelledby="h-region">
        <h2 id="h-region">1. Región</h2>
        <div class="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }} role="radiogroup" aria-labelledby="h-region">
          {(Object.keys(REGION_TEXT) as RegionId[]).map((r) => (
            <button type="button" role="radio" aria-checked={region === r} class="card" style={{ textAlign: "left", outline: region === r ? "2px solid var(--accent)" : undefined }} onClick={() => setRegion(r)} key={r}>
              <h3>{REGION_TEXT[r].title}</h3>
              <p class="small">
                <Gloss text={REGION_TEXT[r].tagline} />
              </p>
              <ul class="small" style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {REGION_TEXT[r].facts.map((f) => (
                  <li key={f}>
                    <Gloss text={f} />
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <label class="row">
          <input type="checkbox" checked={greenfield} onChange={(e) => setGreenfield((e.target as HTMLInputElement).checked)} />
          <span>
            Empezar desde cero (<em>greenfield</em>): sin tiendas ni CD; abres tiendas con la decisión D-08.
          </span>
        </label>
      </section>

      <section class="card stack" aria-labelledby="h-strategy">
        <h2 id="h-strategy">2. Propuesta de valor declarada</h2>
        <div class="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }} role="radiogroup" aria-labelledby="h-strategy">
          {(["freshness", "lowcost", "convenience"] as Strategy[]).map((s) => (
            <button type="button" role="radio" aria-checked={strategy === s} class="card" style={{ textAlign: "left", outline: strategy === s ? "2px solid var(--accent)" : undefined }} onClick={() => setStrategy(s)} key={s}>
              <h3>{OPTIONS[s]}</h3>
              <p class="small muted">
                <Gloss text={STRATEGY_TEXT[s]} />
              </p>
            </button>
          ))}
        </div>
        <p class="small muted">Tu puntaje se calcula según la estrategia que declares. Puedes cambiarla una sola vez durante la partida, con penalización.</p>
      </section>

      <section class="card stack" aria-labelledby="h-market">
        <h2 id="h-market">3. Escenario de mercado</h2>
        <ScenarioPicker
          headingId="h-market"
          presets={PRESETS.map((p) => ({ ...p, bestWith: REGION_TEXT[p.bestWith].title }))}
          fields={MARKET_FIELDS}
          base={DEFAULT_MARKET}
          selected={preset}
          market={market}
          onSelect={choosePreset}
          onMarketChange={(m) => setMarket(m as MarketProfile)}
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
          Comenzar en {REGION_TEXT[region].title} →
        </button>
      </div>
    </main>
  );
}
