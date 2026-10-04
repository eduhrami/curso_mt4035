/** Gráficas con Chart.js empaquetado (AD-23). Los colores salen de los tokens CSS para respetar el modo oscuro. */
import { useEffect, useRef } from "preact/hooks";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler, BarController, BarElement, ScatterController);

export const PALETTE = ["#2a5db0", "#c2410c", "#15803d", "#7c3aed", "#b45309", "#0e7490", "#be185d", "#4d7c0f"];

const cssVar = (name: string, fallback: string) => (typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback : fallback);
/** Chart.js pinta en canvas y no entiende var(--x): se resuelve el token antes de pasarlo. */
const color = (c: string | undefined, fallback: string) => {
  const v = c ?? fallback;
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  return m ? cssVar(m[1]!, fallback) : v;
};

function useChart(config: () => ChartConfiguration, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const text = cssVar("--text-muted", "#5b6577");
    const grid = cssVar("--border", "#d8dde6");
    Chart.defaults.color = text;
    Chart.defaults.borderColor = grid;
    Chart.defaults.font.family = cssVar("--font", "system-ui");
    const chart = new Chart(ref.current, config());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export interface Series {
  label: string;
  data: (number | null)[];
  color?: string;
  dashed?: boolean;
}

export function LineChart({ labels, series, yLabel, band, format = (v: number) => String(v), ariaLabel }: { labels: string[]; series: Series[]; yLabel?: string; band?: { value: number; op: ">=" | "<=" }; format?: (v: number) => string; ariaLabel: string }) {
  const ref = useChart(
    () => ({
      type: "line",
      data: {
        labels,
        datasets: [
          ...series.map((s, i) => ({
            label: s.label,
            data: s.data,
            borderColor: color(s.color, PALETTE[i % PALETTE.length]!),
            backgroundColor: color(s.color, PALETTE[i % PALETTE.length]!),
            borderDash: s.dashed ? [5, 4] : [],
            tension: 0.25,
            pointRadius: 2,
            spanGaps: true,
          })),
          ...(band
            ? [{ label: `Guardrail (${band.op} ${format(band.value)})`, data: labels.map(() => band.value), borderColor: cssVar("--bad", "#b3261e"), borderDash: [2, 3], pointRadius: 0, borderWidth: 1 }]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${format(c.parsed.y as number)}` } } },
        scales: { y: { title: { display: !!yLabel, text: yLabel ?? "" }, ticks: { callback: (v) => format(Number(v)) } } },
      },
    }),
    [JSON.stringify({ labels, series, band })],
  );
  return (
    <div class="chart-box">
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}

export function StackedBar({ labels, series, format = (v: number) => String(v), ariaLabel }: { labels: string[]; series: Series[]; format?: (v: number) => string; ariaLabel: string }) {
  const ref = useChart(
    () => ({
      type: "bar",
      data: { labels, datasets: series.map((s, i) => ({ label: s.label, data: s.data, backgroundColor: color(s.color, PALETTE[i % PALETTE.length]!) })) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${format(c.parsed.y as number)}` } } },
        scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => format(Number(v)) } } },
      },
    }),
    [JSON.stringify({ labels, series })],
  );
  return (
    <div class="chart-box">
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}

export interface ScatterGroup {
  label: string;
  points: { x: number; y: number }[];
  color?: string;
  highlight?: boolean;
}

export function ScatterChart({ groups, xLabel, yLabel, fx, fy, ariaLabel }: { groups: ScatterGroup[]; xLabel: string; yLabel: string; fx: (v: number) => string; fy: (v: number) => string; ariaLabel: string }) {
  const ref = useChart(
    () => ({
      type: "scatter",
      data: {
        datasets: groups.map((g, i) => ({
          label: g.label,
          data: g.points,
          backgroundColor: color(g.color, PALETTE[i % PALETTE.length]!),
          pointRadius: g.highlight ? 6 : 4,
          pointStyle: g.highlight ? "rectRot" : "circle",
          showLine: g.highlight,
          borderColor: color(g.color, PALETTE[i % PALETTE.length]!),
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fx(c.parsed.x as number)} · ${fy(c.parsed.y as number)}` } } },
        scales: { x: { title: { display: true, text: xLabel }, ticks: { callback: (v) => fx(Number(v)) } }, y: { title: { display: true, text: yLabel }, ticks: { callback: (v) => fy(Number(v)) } } },
      },
    }),
    [JSON.stringify(groups)],
  );
  return (
    <div class="chart-box">
      <canvas ref={ref} role="img" aria-label={ariaLabel} />
    </div>
  );
}

/** Tabla de datos accesible que acompaña a una gráfica (AD-28). */
export function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <details class="small">
      <summary>Ver datos en tabla</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
