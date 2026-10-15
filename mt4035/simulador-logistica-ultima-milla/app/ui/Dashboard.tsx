/**
 * Dashboard mensual: KPI con guardrail, trayectoria, causas, serie diaria según D-61, frontera
 * OTD–CPD, desglose del costo por entrega y mapa del territorio.
 */
import { useState } from "preact/hooks";
import { DataTable, fmt, fmtMoney, KpiCard, KpiExplanation, LineChart, ScatterChart, StackedBar, type ScatterGroup } from "@mt4035/ui-kit";
import type { EpochReport, GameState } from "@mt4035/sim-core";
import { params, scoreRun, type LmState, type Strategy } from "../src/index.ts";
import { CAUSE_NAMES, KPI_NAMES, kpiMetaFor, LABELS, OPTIONS, P95_OF, TERRITORY_TEXT } from "./labels.ts";
import { professor, store, territoryOf } from "./game.ts";
import { TerritoryMap } from "./TerritoryMap.tsx";

const MAIN = ["OTD", "FADS", "CPD", "CYCLE_HOURS", "CSAT", "SPOIL_RATE", "VEHICLE_UTIL", "MARGIN_PCT", "BACKLOG"];

/** Componentes del costo de última milla (por entrega exitosa). */
const COSTS: [string[], string][] = [
  [["routeCost"], "Ruta y troncal"],
  [["pickCost"], "Picking"],
  [["capitalCost"], "Inventario"],
  [["reattemptCost"], "Reintentos"],
  [["returnsCost"], "Devoluciones"],
  [["techCost"], "Tecnología por pedido"],
  [["fixedDaily", "robberyCost"], "Fijos (nodos, datos, seguridad)"],
  [["idleCost"], "Flota contratada ociosa"],
];

const sum = (r: EpochReport, ks: string[]) => r.tickMetrics.reduce((a, m) => a + ks.reduce((b, k) => b + (m[k] ?? 0), 0), 0);
const perDelivery = (r: EpochReport, ks: string[]) => sum(r, ks) / Math.max(1, sum(r, ["successful"]));

export function Dashboard({ state }: { state: GameState<LmState> }) {
  const territory = territoryOf(state);
  const metas = kpiMetaFor(territory);
  const view = state.model.dec.report;
  const [kpi, setKpi] = useState(view === "p95" ? "OTD_P95" : "OTD");
  const reports = state.history;
  const last = reports[reports.length - 1] ?? null;
  const prev = reports[reports.length - 2] ?? null;
  const meta = metas.find((m) => m.id === kpi) ?? metas[0]!;
  const labels = reports.map((r) => r.label);
  const sameTerritory = store.runs.value.filter((r) => r.id !== store.runId.value && r.data.export.config.scenario.territory === state.model.territory);

  if (!last) {
    return (
      <div class="stack">
        <div class="card stack">
          <h2>Antes del primer trimestre</h2>
          <p>
            Revisa la operación <em>as-is</em> de {TERRITORY_TEXT[territory].title}: solo surtido desde el CD, camionetas de un 3PL, día siguiente con ventana de todo el día, sin ETA ni
            validación de direcciones. Ajusta las decisiones que quieras en el panel izquierdo y confirma el trimestre <strong>A1-T1</strong>: corre enero, febrero y marzo con esas decisiones. Puedes confirmar sin cambios para ver cómo opera hoy.
          </p>
        </div>
        <div class="card">
          <h2>Territorio</h2>
          <TerritoryMap state={state.model} />
        </div>
      </div>
    );
  }

  // D-61: con p95, las tarjetas muestran los días críticos; con promedio, se ven los promedios del mes.
  const cards = MAIN.map((id) => (view === "p95" && P95_OF[id] ? P95_OF[id]! : id)).map((id) => metas.find((m) => m.id === id)!);
  const frontier: ScatterGroup[] = [
    ...sameTerritory.slice(0, 6).map((r) => {
      const ks = r.data.export.kpis;
      const avg = (k: string) => ks.reduce((a, x) => a + (x.values[k] ?? 0), 0) / Math.max(ks.length, 1);
      return { label: r.title.split(" · ").slice(1, 3).join(" · ") || r.id.slice(0, 6), points: [{ x: avg("CPD"), y: avg("OTD_P95") }] };
    }),
    { label: "Esta corrida (por mes)", points: reports.map((r) => ({ x: r.kpis.CPD!, y: r.kpis.OTD_P95! })), highlight: true, color: "var(--accent)" },
  ];

  return (
    <div class="stack">
      {professor && <ProfessorScore state={state} />}
      <p class="small muted" role="note">
        Vista del reporte (D-61): <strong>{LABELS["D-61"]!.options![view]}</strong>.{" "}
        {view === "mean" ? "Los promedios del mes pueden ocultar los días críticos; el puntaje usa siempre p95." : view === "p95" ? "Las tarjetas muestran el 5% de los peores días." : "Abajo ves la serie diaria del último mes."}
      </p>
      <div class="grid-auto" role="list" aria-label="Indicadores del mes">
        {cards.map((m) => (
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
        <DataTable caption={meta.name} columns={["Mes", meta.acronym]} rows={reports.map((r) => [r.label, fmt(r.kpis[kpi], meta.format)])} />
      </div>

      <KpiExplanation report={last} kpi={kpi} kpiName={meta.acronym} period="mes" unitPlural="días" causeNames={CAUSE_NAMES} />

      <ProfitCard reports={reports} />

      <ForecastCard reports={reports} labels={labels} />

      <DailyView report={last} view={view} />

      <div class="card stack">
        <h2>Frontera servicio–costo</h2>
        <p class="small muted">Cada punto es un mes de esta corrida; los demás son tus corridas guardadas en este territorio (promedio). Arriba a la izquierda es mejor.</p>
        <ScatterChart groups={frontier} xLabel="CPD (US$ por entrega)" yLabel="OTD p95 (peores días)" fx={(v) => fmt(v, "num2")} fy={(v) => fmt(v, "pct1")} ariaLabel="Puntualidad en los peores días contra costo por entrega" />
      </div>

      <div class="card stack">
        <h2>¿De qué está hecho el costo por entrega?</h2>
        <StackedBar labels={labels} series={COSTS.map(([ks, l]) => ({ label: l, data: reports.map((r) => perDelivery(r, ks)) }))} format={(v) => fmt(v, "num2")} ariaLabel="Desglose del costo por entrega por mes (US$)" />
        <DataTable caption="Costo por entrega (US$)" columns={["Mes", ...COSTS.map(([, l]) => l)]} rows={reports.map((r) => [r.label, ...COSTS.map(([ks]) => fmt(perDelivery(r, ks), "num2"))])} />
      </div>

      <div class="card">
        <h2>Territorio</h2>
        <TerritoryMap state={state.model} />
        <p class="small">
          {fmt(last.kpis.ORDERS, "num0")} pedidos en el mes · {fmt(last.kpis.STOPS_ROUTE, "num1")} paradas por ruta · {fmt(last.kpis.LINEHAUL_KM, "num1")} km de troncal por pedido · flota
          faltante {fmt(last.kpis.FLEET_SHORT, "pct")}
        </p>
      </div>
    </div>
  );
}

/** Serie diaria del último mes (D-61 diaria o p95); con promedio solo se avisa qué se pierde. */
function DailyView({ report, view }: { report: EpochReport; view: string }) {
  const days = report.tickMetrics.map((_, i) => String(i + 1));
  const worst = Math.min(...report.tickMetrics.map((m) => m.dayOtd ?? 1));
  const peakDays = report.tickMetrics.filter((m) => (m.peak ?? 0) > 0).length;
  if (view === "mean") {
    return (
      <div class="card small">
        <h3>Días del mes</h3>
        <p class="muted">Tu reporte es el promedio mensual. Cambia el «Nivel de agregación del reporte» a «Serie diaria» o «p95» para ver los días críticos (por ejemplo, picos y quincenas).</p>
      </div>
    );
  }
  return (
    <div class="card stack">
      <h2>Días de {report.label}</h2>
      <p class="small muted">
        Peor día: OTD de {fmt(worst, "pct")}.{peakDays > 0 ? ` ${peakDays} días de pico este mes.` : ""} Las quincenas (días 14–15 y 29–30) también suben la demanda.
      </p>
      <LineChart
        labels={days}
        series={[
          { label: "OTD diario", data: report.tickMetrics.map((m) => m.dayOtd ?? null) },
          { label: "FADS diario", data: report.tickMetrics.map((m) => m.dayFads ?? null) },
        ]}
        format={(v) => fmt(v, "pct")}
        ariaLabel={`OTD y FADS diarios de ${report.label}`}
      />
      <LineChart labels={days} series={[{ label: "CPD diario (US$)", data: report.tickMetrics.map((m) => m.dayCpd ?? null) }]} format={(v) => fmt(v, "num2")} ariaLabel={`Costo por entrega diario de ${report.label}`} />
    </div>
  );
}

function ProfessorScore({ state }: { state: GameState<LmState> }) {
  return (
    <div class="card row small" style={{ background: "var(--info-bg)" }}>
      <strong>Modo profesor · puntaje parcial:</strong>
      {(["speed", "reliability", "efficiency"] as Strategy[]).map((s) => (
        <span key={s}>
          {OPTIONS[s]}: {scoreRun(state.history, s, params, territoryOf(state)).score.toFixed(1)}
        </span>
      ))}
      <span class="muted">({KPI_NAMES.OTD_P95} y demás promediados sobre {state.history.length} meses)</span>
    </div>
  );
}

/** Pronóstico (F-01) contra la demanda del mercado, por mes, con el error del año en curso. */
function ForecastCard({ reports, labels }: { reports: EpochReport[]; labels: string[] }) {
  const year = Math.floor(reports[reports.length - 1]!.epoch / 12);
  const ofYear = reports.filter((r) => Math.floor(r.epoch / 12) === year);
  const sumK = (k: string) => ofYear.reduce((a, r) => a + (r.kpis[k] ?? 0), 0);
  const wape = sumK("FC_ABS") / Math.max(1, sumK("MARKET"));
  const bias = (sumK("FC_TOTAL") - sumK("MARKET")) / Math.max(1, sumK("MARKET"));
  const exceed = sumK("FC_EXCEED") / Math.max(1, sumK("FC_DAYS"));
  return (
    <div class="card stack">
      <h2>Pronóstico contra demanda</h2>
      <p class="small muted">
        Pedidos por día (promedio de cada mes) del mercado contra tu pronóstico. En lo que va de A{year + 1}: WAPE {fmt(wape, "pct1")} · sesgo {bias >= 0 ? "+" : ""}
        {fmt(bias, "pct1")} · días sobre tu p95 {fmt(exceed, "pct1")} (ideal 5%). Lo usarás para re-pronosticar en enero.
      </p>
      <LineChart
        labels={labels}
        series={[
          { label: "Demanda del mercado (pedidos/día)", data: reports.map((r) => (r.kpis.MARKET ?? 0) / Math.max(1, r.kpis.FC_DAYS ?? 0)) },
          { label: "Tu pronóstico (pedidos/día)", data: reports.map((r) => (r.kpis.FC_TOTAL ?? 0) / Math.max(1, r.kpis.FC_DAYS ?? 0)) },
        ]}
        format={(v) => fmt(v, "num0")}
        ariaLabel="Demanda del mercado contra pronóstico por mes"
      />
    </div>
  );
}

/** Renglones del estado de resultados del canal en línea (§7.5), con su signo. */
export const PNL: [string, string, 1 | -1][] = [
  ["REVENUE", "Ventas en línea (pedidos entregados)", 1],
  ["GROSS_MARGIN", "Margen de la canasta", 1],
  ["FEES", "Tarifas de envío cobradas", 1],
  ["LAST_MILE_COST", "Costo de última milla (rutas, picking, nodos, reintentos, devoluciones, capacidad ociosa)", -1],
  ["REFUNDS", "Reembolsos (frescos dañados)", -1],
  ["LATE_COST", "Compensaciones por entregas tarde", -1],
  ["PROFIT_OP", "Utilidad operativa", 1],
  ["CAPEX", "Inversión (capex y penalizaciones)", -1],
  ["SERVICE_PENALTY", "Penalizaciones por servicio (guardrails de tu estrategia)", -1],
  ["PROFIT", "Utilidad", 1],
];

/** Estado de resultados: último trimestre y acumulado de la partida. */
function ProfitCard({ reports }: { reports: EpochReport[] }) {
  const lastTurn = reports.slice(-3);
  const sum = (rs: EpochReport[], k: string) => rs.reduce((a, r) => a + (r.kpis[k] ?? 0), 0);
  const row = (k: string) => (k === "PROFIT_OP" || k === "PROFIT" ? { fontWeight: 700 } : undefined);
  const total = sum(reports, "PROFIT");
  return (
    <div class="card stack" data-testid="pnl">
      <h2>Estado de resultados del canal en línea</h2>
      <p class="small muted">
        La utilidad acumulada es tu <strong>puntaje definitivo</strong>: lo que dejan los pedidos entregados (margen de canasta + tarifas) menos lo que cuesta entregarlos, las compensaciones por llegar tarde
        (US$ {params.money.lateCoupon.toFixed(2)} por pedido), lo que inviertes y las penalizaciones si rompes los guardrails de servicio de tu
        estrategia ({fmt(params.money.servicePenaltyShare, "pct")} de las ventas del mes por cada uno). Las ventas se muestran como referencia; no se suman dos veces.
      </p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Concepto (US$)</th>
              <th>Último trimestre</th>
              <th>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {PNL.map(([k, label, sign]) => (
              <tr key={k} style={row(k)}>
                <td>{label}</td>
                <td>{fmtMoney(sign * sum(lastTurn, k) || 0)}</td>
                <td>{fmtMoney(sign * sum(reports, k) || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small" style={{ margin: 0 }}>
        Utilidad acumulada: <strong data-testid="profit-total">{fmtMoney(total)}</strong> · margen operativo sobre ventas {fmt(sum(reports, "PROFIT_OP") / Math.max(1, sum(reports, "REVENUE")), "pct1")}
      </p>
    </div>
  );
}
