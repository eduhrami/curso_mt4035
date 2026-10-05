/** Reporte final (AD-26): puntaje según la estrategia declarada, desglose, guardrails, trayectoria, decisiones y eventos. */
import { DebriefPanel, download, fmt, LineChart } from "@mt4035/ui-kit";
import type { GameState } from "@mt4035/sim-core";
import { debriefFor, type ScmState, type Strategy } from "../src/index.ts";
import { describeValue, kpiMetaFor, OPTIONS, REGION_TEXT, scenarioLabel } from "./labels.ts";
import { engine, finalScore, regionOf, screen, store } from "./game.ts";

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
          <span style={{ fontSize: "2.4rem", fontWeight: 800 }} data-testid="final-score">
            {result.score.toFixed(1)}
          </span>
          <span class="muted">/ 100</span>
          <span class="small muted" style={{ marginLeft: "1rem" }}>
            Con otra estrategia: {others.map((s) => `${OPTIONS[s]} ${finalScore(state, s).score.toFixed(1)}`).join(" · ")}
          </span>
        </div>
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
        <h2>Cómo se formó el puntaje</h2>
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
                  <td>{m ? `${m.acronym} · ${m.name}` : b.kpi}</td>
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
