/** Reporte final (AD-26): puntaje según la estrategia declarada, desglose, guardrails, trayectoria, decisiones y eventos. */
import { DebriefPanel, download, fmt, fmtMoney, Gloss, LineChart } from "@mt4035/ui-kit";
import { PNL } from "./Dashboard.tsx";
import type { GameState } from "@mt4035/sim-core";
import { debriefFor, params, type ScmState, type Strategy } from "../src/index.ts";
import { describeValue, kpiMetaFor, OPTIONS, REGION_TEXT, scenarioLabel } from "./labels.ts";
import { engine, finalScore, regionOf, screen, store } from "./game.ts";

const FC_W = params.forecast.score.weight;

export function FinalReport({ state }: { state: GameState<ScmState> }) {
  const region = regionOf(state);
  const metas = kpiMetaFor(region);
  const result = finalScore(state);
  const others = (["freshness", "lowcost", "convenience"] as Strategy[]).filter((s) => s !== state.model.strategy);
  const labels = state.history.map((h) => h.label);
  const eventCounts = new Map<string, { title: string; n: number }>();
  for (const h of state.history)
    for (const m of h.messages.filter((x) => x.source.startsWith("X-"))) {
      const e = eventCounts.get(m.source) ?? { title: m.title, n: 0 };
      e.n++;
      eventCounts.set(m.source, e);
    }
  const specLabel = (id: string) => engine.model.decisions.find((d) => d.id === id)?.label ?? id;
  const exportJson = async () => download(`hoshi-mart-${region}-${state.config.seed}.json`, JSON.stringify(await store.exportRun(), null, 2));
  const debrief = debriefFor(state.config.scenario as Parameters<typeof debriefFor>[0]);
  const complete = store.debriefComplete.value;
  const exportButton = (testId: string) => (
    <button type="button" class="btn-primary" onClick={exportJson} disabled={!complete} data-testid={testId}>
      Exportar corrida con debrief (JSON) para el profesor
    </button>
  );
  return (
    <div class="stack">
      <div class="card stack" data-testid="final-report">
        <h1>Reporte final · {REGION_TEXT[region].title}</h1>
        <p class="muted">
          {state.config.player?.name ?? "Sin nombre"}
          {state.config.player?.team ? ` · ${state.config.player.team}` : ""} · escenario {scenarioLabel(state.config.scenario)} · semilla {state.config.seed} · estrategia declarada: <strong>{OPTIONS[state.model.strategy]}</strong>
        </p>
        <div class="row" style={{ alignItems: "baseline" }}>
          <span class="muted">Utilidad acumulada (puntaje definitivo):</span>
          <span style={{ fontSize: "2.4rem", fontWeight: 800 }} data-testid="final-score" data-value={result.profit}>
            {fmtMoney(result.profit)}
          </span>
        </div>
        <p class="small muted" style={{ margin: 0 }}>
          Índice de desempeño {result.score.toFixed(1)}/100 (diagnóstico: operación según tu propuesta de valor 70% + precisión del pronóstico 30%) · con otra propuesta:{" "}
          {others.map((s) => `${OPTIONS[s]} ${finalScore(state, s).score.toFixed(1)}`).join(" · ")}
        </p>
        <div class="row no-print">
          {exportButton("export-json")}
          <button type="button" onClick={() => download(`hoshi-mart-${region}-${state.config.seed}.csv`, store.csv(), "text/csv")}>
            KPIs por trimestre (CSV)
          </button>
          <button type="button" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
          <button type="button" onClick={() => (screen.value = "setup")}>
            Nueva partida
          </button>
        </div>
        {!complete && (
          <p class="small no-print" style={{ margin: 0 }}>
            Para exportar tu corrida, primero responde el <a href="#debrief">debrief</a> al final de este reporte.
          </p>
        )}
      </div>

      <div class="card stack">
        <h2>Estado de resultados de los 5 años</h2>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Concepto (US$)</th>
                {[0, 1, 2, 3, 4].map((y) => (
                  <th key={y}>A{y + 1}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {PNL.map(([k, label, sign]) => {
                const of = (y?: number) => (sign * state.history.filter((h) => y === undefined || Math.floor(h.epoch / 4) === y).reduce((a, h) => a + (h.kpis[k] ?? 0), 0)) || 0;
                return (
                  <tr key={k} style={k === "PROFIT" || k === "EBITDA" ? { fontWeight: 700 } : undefined}>
                    <td>{label}</td>
                    {[0, 1, 2, 3, 4].map((y) => (
                      <td key={y}>{fmtMoney(of(y))}</td>
                    ))}
                    <td>{fmtMoney(of())}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card stack">
        <h2>Índice de desempeño (diagnóstico)</h2>
        <p data-testid="score-split">
          <strong>{result.score.toFixed(1)}</strong> = {Math.round((1 - FC_W) * 100)}% × operación <strong>{result.operational.toFixed(1)}</strong> + {Math.round(FC_W * 100)}% × pronóstico{" "}
          <strong>{result.forecast.toFixed(1)}</strong>
        </p>
        <h3>Pronóstico (F-01)</h3>
        <p class="small muted">
          Cada año se califica con el pronóstico que capturaste en T1: 60% el patrón (WAPE semanal por encima del error inevitable del ruido), 20% la variabilidad (CV) y 20% la cobertura del p95 (ideal: 5% de las
          semanas por encima).
        </p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Año</th>
                <th>WAPE</th>
                <th>Sesgo</th>
                <th>Semanas sobre tu p95</th>
                <th>Exactitud del CV</th>
                <th>Calificación</th>
              </tr>
            </thead>
            <tbody>
              {result.forecastYears.map((y) => {
                const hs = state.history.filter((h) => Math.floor(h.epoch / 4) === y.year);
                const sumK = (k: string) => hs.reduce((a, h) => a + (h.kpis[k] ?? 0), 0);
                const bias = (sumK("FC_TOTAL") - sumK("MARKET")) / Math.max(1e-9, sumK("MARKET"));
                return (
                  <tr key={y.year}>
                    <td>A{y.year + 1}</td>
                    <td>{fmt(y.wape, "pct1")}</td>
                    <td>
                      {bias >= 0 ? "+" : ""}
                      {fmt(bias, "pct1")}
                    </td>
                    <td>{fmt(y.exceed, "pct1")}</td>
                    <td>{fmt(y.cvAcc, "pct")}</td>
                    <td>{(y.score * 100).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <LineChart
          labels={labels}
          series={[
            { label: "Demanda por tienda (mercado)", data: state.history.map((h) => (h.kpis.MARKET ?? 0) / Math.max(1, h.kpis.FC_WEEKS ?? 0)) },
            { label: "Tu pronóstico", data: state.history.map((h) => (h.kpis.FC_TOTAL ?? 0) / Math.max(1, h.kpis.FC_WEEKS ?? 0)) },
          ]}
          format={(v) => fmt(v, "num1")}
          ariaLabel="Demanda por tienda contra pronóstico por trimestre"
        />
        <h3>Operación</h3>
        <table>
          <thead>
            <tr>
              <th>KPI</th>
              <th>Promedio</th>
              <th>Normalizado</th>
              <th>Aporte</th>
            </tr>
          </thead>
          <tbody>
            {result.breakdown.map((b) => {
              const m = metas.find((x) => x.id === b.kpi);
              const avg = state.history.reduce((a, h) => a + (h.kpis[b.kpi] ?? 0), 0) / state.history.length;
              return (
                <tr key={b.kpi}>
                  <td>{m ? <Gloss text={`${m.acronym} · ${m.name}`} /> : b.kpi}</td>
                  <td>{fmt(avg, m?.format ?? "num2")}</td>
                  <td>{(b.normalized * 100).toFixed(0)}%</td>
                  <td>{b.contribution.toFixed(1)}</td>
                </tr>
              );
            })}
            {result.violations
              .filter((v) => v.count > 0)
              .map((v) => (
                <tr key={`g-${v.kpi}`}>
                  <td colSpan={3}>
                    Guardrail de {metas.find((x) => x.id === v.kpi)?.acronym ?? v.kpi} violado en {v.count} {v.count === 1 ? "trimestre" : "trimestres"}
                  </td>
                  <td style={{ color: "var(--bad)" }}>−{v.penalty.toFixed(1)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div class="card stack">
        <h2>Trayectoria de 5 años</h2>
        <LineChart labels={labels} series={["OSA", "OTIF", "WASTE", "CTS_PCT", "EBITDA_PCT"].map((k) => ({ label: metas.find((m) => m.id === k)?.acronym ?? k, data: state.history.map((h) => h.kpis[k] ?? null) }))} format={(v) => fmt(v, "pct")} ariaLabel="Trayectoria de los KPI principales" />
      </div>

      <div class="card stack">
        <h2>Decisiones clave</h2>
        {state.decisionLog.length === 0 ? (
          <p class="muted">Jugaste toda la partida con la configuración as-is.</p>
        ) : (
          <ul class="small" style={{ margin: 0 }}>
            {state.decisionLog.map((d) => (
              <li key={d.epoch}>
                <strong>{engine.epochLabel(d.epoch)}:</strong>{" "}
                {Object.entries(d.changes)
                  .map(([id, v]) => `${specLabel(id)} → ${describeValue(id, v)}`)
                  .join("; ")}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div class="card stack">
        <h2>Eventos que enfrentaste</h2>
        {eventCounts.size === 0 ? (
          <p class="muted">Ningún evento inesperado.</p>
        ) : (
          <ul class="small" style={{ margin: 0 }}>
            {[...eventCounts.entries()].map(([id, e]) => (
              <li key={id}>
                {e.title} ({id}): {e.n} {e.n === 1 ? "vez" : "veces"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DebriefPanel
        scenario={debrief.scenario}
        concept={debrief.concept}
        notes={debrief.notes}
        questions={debrief.questions}
        answers={store.debrief.value}
        minChars={store.debriefMinChars}
        complete={complete}
        onInput={store.setDebriefAnswer}
        onCommit={() => void store.saveDebrief()}
      >
        <div class="row no-print">{exportButton("export-json-debrief")}</div>
      </DebriefPanel>
    </div>
  );
}
