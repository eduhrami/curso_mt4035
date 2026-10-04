/** Dashboard por época: KPI con guardrail, trayectoria, causas, frontera servicio–costo, costos y mapa. */
import { useState } from "preact/hooks";
import { DataTable, fmt, KpiCard, KpiExplanation, LineChart, ScatterChart, StackedBar, type ScatterGroup } from "@mt4035/ui-kit";
import type { EpochReport, GameState } from "@mt4035/sim-core";
import { scoreRun, params, type ScmState, type Strategy } from "../src/index.ts";
import { KPI_NAMES, kpiMetaFor, OPTIONS, REGION_TEXT } from "./labels.ts";
import { engine, professor, regionOf, store } from "./game.ts";
import { NetworkMap } from "./NetworkMap.tsx";

const COSTS: [string, string][] = [
  ["transport", "Transporte"],
  ["handling", "Manejo en CD"],
  ["dcFixed", "CD (fijo)"],
  ["receivingCost", "Recepción en tienda"],
  ["carrying", "Inventario"],
];

const sum = (r: EpochReport, k: string) => r.tickMetrics.reduce((a, m) => a + (m[k] ?? 0), 0);

export function Dashboard({ state }: { state: GameState<ScmState> }) {
  const metas = kpiMetaFor(regionOf(state));
  const [kpi, setKpi] = useState("OSA");
  const reports = state.history;
  const last = reports[reports.length - 1] ?? null;
  const prev = reports[reports.length - 2] ?? null;
  const meta = metas.find((m) => m.id === kpi)!;
  const labels = reports.map((r) => r.label);
  const sameRegion = store.runs.value.filter((r) => r.id !== store.runId.value && r.data.export.config.scenario.region === state.model.region);

  if (!last) {
    return (
      <div class="stack">
        <div class="card stack">
          <h2>Antes del primer trimestre</h2>
          <p>
            Revisa la red <em>as-is</em> de {REGION_TEXT[regionOf(state)].title}, ajusta las decisiones que quieras en el panel izquierdo y confirma <strong>A1-T1</strong>. Puedes
            confirmar sin cambios para ver cómo opera la red actual.
          </p>
        </div>
        <div class="card">
          <h2>Red actual</h2>
          <NetworkMap state={state.model} epoch={state.epoch} />
        </div>
      </div>
    );
  }

  const frontier: ScatterGroup[] = [
    ...sameRegion.slice(0, 6).map((r) => {
      const ks = r.data.export.kpis;
      const avg = (k: string) => ks.reduce((a, x) => a + (x.values[k] ?? 0), 0) / Math.max(ks.length, 1);
      return { label: r.title.split(" · ").slice(1, 3).join(" · ") || r.id.slice(0, 6), points: [{ x: avg("CTS_PCT"), y: avg("OSA") }] };
    }),
    { label: "Esta corrida (por trimestre)", points: reports.map((r) => ({ x: r.kpis.CTS_PCT!, y: r.kpis.OSA! })), highlight: true, color: "var(--accent)" },
  ];

  return (
    <div class="stack">
      {professor && <ProfessorScore state={state} />}
      <div class="grid-auto" role="list" aria-label="Indicadores del trimestre">
        {metas.slice(0, 9).map((m) => (
          <KpiCard key={m.id} meta={m} report={last} prev={prev} onExplain={setKpi} selected={m.id === kpi} />
        ))}
      </div>

      <div class="card stack">
        <div class="row" style={{ justifyContent: "space-between" }}>
          <h2>
            {meta.acronym} · {meta.name}
          </h2>
          <select aria-label="Indicador de la gráfica" value={kpi} onChange={(e) => setKpi((e.target as HTMLSelectElement).value)}>
            {metas.map((m) => (
              <option value={m.id} key={m.id}>
                {m.acronym} · {m.name}
              </option>
            ))}
          </select>
        </div>
        <p class="small muted">{meta.formula}</p>
        <LineChart
          labels={labels}
          series={[{ label: meta.acronym, data: reports.map((r) => r.kpis[kpi] ?? null) }]}
          {...(meta.guardrail ? { band: meta.guardrail } : {})}
          format={(v) => fmt(v, meta.format)}
          ariaLabel={`Trayectoria de ${meta.name}`}
        />
        <DataTable caption={meta.name} columns={["Trimestre", meta.acronym]} rows={reports.map((r) => [r.label, fmt(r.kpis[kpi], meta.format)])} />
      </div>

      <KpiExplanation report={last} kpi={kpi} kpiName={meta.acronym} />

      <div class="card stack">
        <h2>Frontera servicio–costo</h2>
        <p class="small muted">Cada punto es un trimestre de esta corrida; los demás son tus corridas guardadas en esta región (promedio). Arriba a la izquierda es mejor.</p>
        <ScatterChart groups={frontier} xLabel="CTS (costo logístico / ventas)" yLabel="OSA (disponibilidad)" fx={(v) => fmt(v, "pct1")} fy={(v) => fmt(v, "pct1")} ariaLabel="Disponibilidad contra costo logístico" />
      </div>

      <div class="card stack">
        <h2>Costo logístico por trimestre</h2>
        <StackedBar labels={labels} series={COSTS.map(([k, l]) => ({ label: l, data: reports.map((r) => sum(r, k)) }))} format={(v) => fmt(v, "usdM")} ariaLabel="Desglose del costo logístico por trimestre" />
        <DataTable caption="Costo logístico" columns={["Trimestre", ...COSTS.map(([, l]) => l)]} rows={reports.map((r) => [r.label, ...COSTS.map(([k]) => fmt(sum(r, k), "usdM"))])} />
      </div>

      <div class="card">
        <h2>Red</h2>
        <NetworkMap state={state.model} epoch={state.epoch} />
        <p class="small">
          {last.kpis.STORES?.toFixed(0)} tiendas · {last.kpis.DC_COUNT} CD operando · distancia media CD→tienda {fmt(last.kpis.DC_DIST_KM, "num0")} km · {fmt(last.kpis.STOPS_PER_ROUTE, "num1")} paradas por ruta
        </p>
      </div>
    </div>
  );
}

function ProfessorScore({ state }: { state: GameState<ScmState> }) {
  return (
    <div class="card row small" style={{ background: "var(--info-bg)" }}>
      <strong>Modo profesor · puntaje parcial:</strong>
      {(["freshness", "lowcost", "convenience"] as Strategy[]).map((s) => (
        <span key={s}>
          {OPTIONS[s]}: {scoreRun(state.history, s, params, regionOf(state)).score.toFixed(1)}
        </span>
      ))}
      <span class="muted">({KPI_NAMES.OSA} y demás promediados sobre {state.history.length} trimestres)</span>
    </div>
  );
}

export { engine };
