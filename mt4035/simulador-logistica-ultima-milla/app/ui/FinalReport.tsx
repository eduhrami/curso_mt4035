/** Reporte final (AD-26): puntaje, desglose, guardrails, trayectoria de 36 meses, picos enfrentados, decisiones y eventos. */
import { download, fmt, LineChart } from "@mt4035/ui-kit";
import type { GameState } from "@mt4035/sim-core";
import { isPeakMonth, params, type LmState, type Strategy } from "../src/index.ts";
import { describeValue, kpiMetaFor, MONTHS, OPTIONS, TERRITORY_TEXT } from "./labels.ts";
import { engine, finalScore, screen, store, territoryOf } from "./game.ts";

export function FinalReport({ state }: { state: GameState<LmState> }) {
  const territory = territoryOf(state);
  const metas = kpiMetaFor(territory);
  const result = finalScore(state);
  const others = (["speed", "reliability", "efficiency"] as Strategy[]).filter((s) => s !== state.model.strategy);
  const labels = state.history.map((h) => h.label);
  const eventCounts = new Map<string, { title: string; n: number }>();
  for (const h of state.history)
    for (const m of h.messages.filter((x) => x.source.startsWith("X-"))) {
      const e = eventCounts.get(m.source) ?? { title: m.title, n: 0 };
      e.n++;
      eventCounts.set(m.source, e);
    }
  const peaks = state.history.map((h, e) => ({ h, e })).filter(({ e }) => isPeakMonth(params, e));
  const specLabel = (id: string) => engine.model.decisions.find((d) => d.id === id)?.label ?? id;
  const exportJson = async () => download(`mercado-alba-${territory}-${state.config.seed}.json`, JSON.stringify(await store.exportRun(), null, 2));
  return (
    <div class="stack">
      <div class="card stack" data-testid="final-report">
        <h1>Reporte final · {TERRITORY_TEXT[territory].title}</h1>
        <p class="muted">
          {state.config.player?.name ?? "Sin nombre"}
          {state.config.player?.team ? ` · ${state.config.player.team}` : ""} · semilla {state.config.seed} · estrategia declarada: <strong>{OPTIONS[state.model.strategy]}</strong>
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
          <button type="button" class="btn-primary" onClick={exportJson} data-testid="export-json">
            Exportar corrida (JSON) para el profesor
          </button>
          <button type="button" onClick={() => download(`mercado-alba-${territory}-${state.config.seed}.csv`, store.csv(), "text/csv")}>
            KPIs por mes (CSV)
          </button>
          <button type="button" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
          <button type="button" onClick={() => (screen.value = "setup")}>
            Nueva partida
          </button>
        </div>
      </div>

      <div class="card stack">
        <h2>Cómo se formó el puntaje</h2>
        <p class="small muted">El puntaje usa siempre los días críticos (p95), sin importar la vista que elegiste en D-61.</p>
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
                    Guardrail de {metas.find((x) => x.id === v.kpi)?.acronym ?? v.kpi} violado en {v.count} {v.count === 1 ? "mes" : "meses"}
                  </td>
                  <td style={{ color: "var(--bad)" }}>−{v.penalty.toFixed(1)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div class="card stack">
        <h2>Trayectoria de 36 meses</h2>
        <LineChart labels={labels} series={["OTD_P95", "FADS", "VEHICLE_UTIL", "MARGIN_PCT", "SPOIL_RATE"].map((k) => ({ label: metas.find((m) => m.id === k)?.acronym ?? k, data: state.history.map((h) => h.kpis[k] ?? null) }))} format={(v) => fmt(v, "pct")} ariaLabel="Trayectoria de los KPI principales" />
        <LineChart labels={labels} series={[{ label: "CPD (US$)", data: state.history.map((h) => h.kpis.CPD ?? null) }]} format={(v) => fmt(v, "num2")} ariaLabel="Trayectoria del costo por entrega" />
      </div>

      <div class="card stack">
        <h2>Picos enfrentados</h2>
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Pico</th>
              <th>OTD p95</th>
              <th>Backlog</th>
              <th>CSAT</th>
              <th>CPD</th>
            </tr>
          </thead>
          <tbody>
            {peaks.map(({ h, e }) => (
              <tr key={e}>
                <td>{h.label}</td>
                <td>
                  {params.peaks
                    .filter((pk) => pk.month === e % 12)
                    .map((pk) => `${pk.name} (${MONTHS[pk.month]})`)
                    .join(", ")}
                </td>
                <td>{fmt(h.kpis.OTD_P95, "pct")}</td>
                <td>{fmt(h.kpis.BACKLOG, "pct")}</td>
                <td>{fmt(h.kpis.CSAT, "num2")}</td>
                <td>{fmt(h.kpis.CPD, "num2")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="card stack">
        <h2>Decisiones clave</h2>
        {state.decisionLog.length === 0 ? (
          <p class="muted">Jugaste toda la partida con la operación as-is.</p>
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
    </div>
  );
}
