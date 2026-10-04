/** Bandeja de mensajes con "¿Por qué pasó esto?" y explicación causal de un KPI (AD-24). */
import { useState } from "preact/hooks";
import { explainKpi, type CausalEntry, type Driver, type EpochReport, type Message } from "@mt4035/sim-core";

const SEV_LABEL = { critico: "Crítico", alerta: "Alerta", info: "Info" } as const;
const SEV_ICON = { critico: "●", alerta: "▲", info: "○" } as const;

const driverText = (d: Driver) => `${d.label}${d.value !== undefined && d.value !== "" ? `: ${d.value}` : ""}${d.ref ? ` (${d.ref})` : ""}`;

export function MessageItem({ m, epochLabel, kpiNames, unit }: { m: Message; epochLabel: string; kpiNames: Record<string, string>; unit: string }) {
  return (
    <article class={`msg sev-${m.severity}`} data-source={m.source}>
      <div class="row small" style={{ justifyContent: "space-between" }}>
        <span>
          <span aria-hidden="true">{SEV_ICON[m.severity]}</span> <strong>{SEV_LABEL[m.severity]}</strong> · {m.source}
        </span>
        <span class="muted">
          {epochLabel}
          {m.tick >= 0 ? ` · ${unit} ${m.tick + 1}` : ""}
        </span>
      </div>
      <h4 style={{ margin: "0.2rem 0" }}>{m.title}</h4>
      <p class="small" style={{ margin: 0 }}>
        {m.body}
      </p>
      {(m.drivers.length > 0 || m.mitigations.length > 0 || m.kpis.length > 0) && (
        <details>
          <summary>¿Por qué pasó esto?</summary>
          {m.drivers.length > 0 && (
            <>
              <p class="small" style={{ margin: "0.3rem 0 0.1rem" }}>
                <strong>Lo agravaron:</strong>
              </p>
              <ul class="small" style={{ margin: 0 }}>
                {m.drivers.map((d, i) => (
                  <li key={i}>{driverText(d)}</li>
                ))}
              </ul>
            </>
          )}
          {m.mitigations.length > 0 && (
            <>
              <p class="small" style={{ margin: "0.3rem 0 0.1rem" }}>
                <strong>Lo mitigaron:</strong>
              </p>
              <ul class="small" style={{ margin: 0 }}>
                {m.mitigations.map((d, i) => (
                  <li key={i}>{driverText(d)}</li>
                ))}
              </ul>
            </>
          )}
          {m.drivers.length === 0 && m.mitigations.length === 0 && <p class="small">Sin factores de tus decisiones que lo agravaran o mitigaran.</p>}
          {m.kpis.length > 0 && (
            <div class="row small">
              <span class="muted">Afecta:</span>
              {m.kpis.slice(0, 6).map((k) => (
                <span class="chip" key={k}>
                  {kpiNames[k] ?? k}
                </span>
              ))}
            </div>
          )}
        </details>
      )}
    </article>
  );
}

export function MessageInbox({ reports, epochLabel, kpiNames, unit = "semana" }: { reports: EpochReport[]; epochLabel: (e: number) => string; kpiNames: Record<string, string>; unit?: string }) {
  const [filter, setFilter] = useState<"all" | Message["severity"]>("all");
  const [scope, setScope] = useState<"last" | "all">("last");
  const source = scope === "last" ? reports.slice(-1) : [...reports].reverse();
  const msgs = source.flatMap((r) => [...r.messages].reverse()).filter((m) => filter === "all" || m.severity === filter);
  const counts = { critico: 0, alerta: 0, info: 0 };
  for (const m of reports.slice(-1).flatMap((r) => r.messages)) counts[m.severity]++;
  return (
    <div class="card stack">
      <h2>
        Mensajes{" "}
        <span class="muted small">
          ({counts.critico} críticos · {counts.alerta} alertas · {counts.info} info en el último trimestre)
        </span>
      </h2>
      <div class="row small no-print">
        <select aria-label="Filtrar por severidad" value={filter} onChange={(e) => setFilter((e.target as HTMLSelectElement).value as typeof filter)}>
          <option value="all">Todas</option>
          <option value="critico">Críticos</option>
          <option value="alerta">Alertas</option>
          <option value="info">Info</option>
        </select>
        <select aria-label="Periodo" value={scope} onChange={(e) => setScope((e.target as HTMLSelectElement).value as typeof scope)}>
          <option value="last">Último trimestre</option>
          <option value="all">Toda la partida</option>
        </select>
      </div>
      {msgs.length === 0 ? (
        <p class="muted small">{reports.length ? "Sin mensajes con este filtro." : "Los mensajes aparecerán al correr el primer trimestre."}</p>
      ) : (
        <div class="stack" style={{ gap: "0.5rem" }}>
          {msgs.slice(0, 60).map((m, i) => (
            <MessageItem key={i} m={m} epochLabel={epochLabel(m.epoch)} kpiNames={kpiNames} unit={unit} />
          ))}
        </div>
      )}
    </div>
  );
}

const KIND_LABEL: Record<CausalEntry["kind"], string> = { decision: "Tu decisión", activation: "Entró en operación", event: "Evento", rule: "Regla", trend: "Tendencia" };

/** Causas registradas en la época que movieron un KPI ("¿por qué cambió?"). */
export function KpiExplanation({ report, kpi, kpiName }: { report: EpochReport | null; kpi: string; kpiName: string }) {
  if (!report) return null;
  const entries = explainKpi(report, kpi);
  // Agrupa entradas repetidas por tick (p. ej. una regla que se dispara varias semanas).
  const grouped = new Map<string, { e: CausalEntry; n: number }>();
  for (const e of entries) {
    const k = `${e.kind}|${e.id}`;
    const g = grouped.get(k);
    if (g) g.n++;
    else grouped.set(k, { e, n: 1 });
  }
  return (
    <div class="card stack" aria-live="polite">
      <h3>¿Por qué cambió {kpiName} en {report.label}?</h3>
      {grouped.size === 0 ? (
        <p class="small muted">No hay causas registradas este trimestre: la variación viene del ruido normal de la demanda.</p>
      ) : (
        <ul class="small" style={{ margin: 0 }}>
          {[...grouped.values()].map(({ e, n }) => (
            <li key={`${e.kind}${e.id}`}>
              <strong>{KIND_LABEL[e.kind]}</strong> {e.id}
              {n > 1 ? ` (${n} semanas)` : ""}: {e.drivers.map(driverText).join("; ")}
              {e.note ? ` — ${e.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
