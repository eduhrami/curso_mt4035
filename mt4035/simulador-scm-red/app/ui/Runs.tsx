/** Corridas guardadas: continuar, exportar, borrar, importar y comparar hasta 4 (AD-26). */
import { useState } from "preact/hooks";
import { download, fmt, LineChart } from "@mt4035/ui-kit";
import type { EpochReport } from "@mt4035/sim-core";
import { params, scoreRun, type RegionId, type Strategy } from "../src/index.ts";
import { KPI_META, OPTIONS } from "./labels.ts";
import { professor, screen, store } from "./game.ts";

export function Runs() {
  const runs = store.runs.value;
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [kpi, setKpi] = useState("OSA");
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : selected.length < 4 ? [...selected, id] : selected);
  const open = async (id: string) => {
    const r = runs.find((x) => x.id === id);
    if (!r) return;
    const err = await store.load(r.data.export);
    if (err) setMsg(err);
    screen.value = "game";
  };
  const importFiles = async (files: FileList | null) => {
    const out: string[] = [];
    for (const f of Array.from(files ?? [])) {
      try {
        const err = await store.load(JSON.parse(await f.text()));
        out.push(err ? `${f.name}: ${err}` : `${f.name}: verificada ✓ (replay idéntico)`);
      } catch {
        out.push(`${f.name}: no es un JSON válido`);
      }
    }
    setMsg(out.join(" · "));
    if (out.length === 1 && store.state.value) screen.value = "game";
  };
  const chosen = runs.filter((r) => selected.includes(r.id));
  const pseudo = (id: string): EpochReport[] => (runs.find((r) => r.id === id)?.data.export.kpis ?? []).map((k) => ({ kpis: k.values, label: k.label }) as unknown as EpochReport);
  const meta = KPI_META.find((m) => m.id === kpi)!;
  return (
    <main class="stack" style={{ maxWidth: 1100, margin: "0 auto", padding: "1rem 16px" }}>
      <div class="row" style={{ justifyContent: "space-between" }}>
        <h1>Corridas guardadas</h1>
        <button type="button" onClick={() => (screen.value = store.state.value ? "game" : "setup")}>
          ← Volver
        </button>
      </div>
      {!store.persistent && <p class="banner banner-warn">Este navegador no permite guardar: las corridas viven solo en memoria. Exporta antes de cerrar.</p>}
      {msg && (
        <p class="card small" role="status">
          {msg}
        </p>
      )}
      <div class="card stack">
        <label>
          <span>{professor ? "Importar corridas de alumnos (JSON, varias a la vez) y verificarlas con replay" : "Importar una corrida (JSON)"}</span>
          <input type="file" accept="application/json,.json" multiple={professor} onChange={(e) => importFiles((e.target as HTMLInputElement).files)} />
        </label>
      </div>
      <div class="card table-scroll">
        {runs.length === 0 ? (
          <p class="muted">Aún no hay corridas guardadas en este navegador.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Comparar</th>
                <th>Corrida</th>
                <th>Guardada</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...runs].reverse().map((r) => (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" aria-label={`Comparar ${r.title}`} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td>{r.title}</td>
                  <td class="small">{new Date(r.savedAt).toLocaleString("es-MX")}</td>
                  <td class="small">{r.data.finished ? `Terminada · ${r.data.export.finalScore?.toFixed(1) ?? "—"} pts` : `En curso (${r.data.export.epochsPlayed}/20)`}</td>
                  <td class="row">
                    <button type="button" onClick={() => open(r.id)}>
                      {r.data.finished ? "Ver" : "Continuar"}
                    </button>
                    <button type="button" onClick={() => download(`${r.id}.json`, JSON.stringify(r.data.export, null, 2))}>
                      Exportar
                    </button>
                    <button type="button" class="btn-danger" onClick={() => confirm("¿Borrar esta corrida del navegador?") && store.remove(r.id)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {chosen.length >= 2 && (
        <div class="card stack">
          <div class="row" style={{ justifyContent: "space-between" }}>
            <h2>Comparación</h2>
            <select aria-label="Indicador" value={kpi} onChange={(e) => setKpi((e.target as HTMLSelectElement).value)}>
              {KPI_META.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.acronym} · {m.name}
                </option>
              ))}
            </select>
          </div>
          <LineChart labels={pseudo(chosen[0]!.id).map((r) => r.label)} series={chosen.map((r) => ({ label: r.title, data: pseudo(r.id).map((x) => x.kpis[kpi] ?? null) }))} format={(v) => fmt(v, meta.format)} ariaLabel={`Comparación de ${meta.name}`} />
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>KPI (promedio)</th>
                  {chosen.map((r) => (
                    <th key={r.id}>{r.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KPI_META.slice(0, 9).map((m) => (
                  <tr key={m.id}>
                    <td>{m.acronym}</td>
                    {chosen.map((r) => {
                      const ks = pseudo(r.id);
                      return <td key={r.id}>{fmt(ks.reduce((a, x) => a + (x.kpis[m.id] ?? 0), 0) / Math.max(ks.length, 1), m.format)}</td>;
                    })}
                  </tr>
                ))}
                <tr>
                  <td>Puntaje (estrategia declarada)</td>
                  {chosen.map((r) => {
                    const sc = r.data.export.config.scenario as { region: RegionId; strategy: Strategy };
                    return <td key={r.id}>{scoreRun(pseudo(r.id), sc.strategy, params, sc.region).score.toFixed(1)} ({OPTIONS[sc.strategy]})</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p class="small muted">Diferencias de decisiones por trimestre: abre cada corrida y revisa «Decisiones clave» en su reporte final.</p>
        </div>
      )}
    </main>
  );
}
