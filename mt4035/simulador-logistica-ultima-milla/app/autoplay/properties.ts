/** Propiedades de coherencia LOG-AUT (casos de prueba §11.2) evaluadas sobre los registros de auto-juego. */
import { mean } from "@mt4035/sim-core";
import { Results, type PropertyDef } from "@mt4035/sim-tools";
import { params } from "../src/model.ts";
import { isPeakMonth } from "../src/network.ts";
import { scoreGuardrails } from "../src/score.ts";
import type { TerritoryId } from "../src/types.ts";

const STRATS = ["speed", "reliability", "efficiency"] as const;
const FIVE = ["A", "B", "C", "D", "E"];
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const best = (score: (b: string) => number, bots: readonly string[]) => bots.reduce((a, b) => (score(b) > score(a) ? b : a));

/** Evalúa una condición por estrategia en los escenarios dados; pasa si todas superan el umbral. */
function perCombo(r: Results, scenarios: readonly string[], minShare: number, bots: readonly string[], pred: (st: string, score: (b: string) => number) => boolean, strategies: readonly string[] = STRATS) {
  const fails: string[] = [];
  const shares: string[] = [];
  for (const scn of scenarios) {
    if (!r.scenarios.includes(scn)) continue;
    for (const st of strategies) {
      const share = r.shareOfSeeds(scn, bots, (rec) => pred(st, (b) => rec(b).scores[st]!));
      shares.push(`${scn}/${st} ${pct(share)}`);
      if (!(share >= minShare)) fails.push(`${scn}/${st} ${pct(share)}`);
    }
  }
  return { pass: fails.length === 0, detail: fails.length ? `bajo ${pct(minShare)}: ${fails.join(", ")}` : shares.join(", ") };
}

/** Índice de consolidación de un óptimo: lockers, micro-hubs y ventanas amplias (AUT-09). */
const consolidation = (b: Record<string, unknown>) =>
  Number(b.lockersPer1000) / 20 + Number(b.hubs) / 6 + ["1h", "2h", "4h", "day"].indexOf(String(b.window)) / 3;

export const properties: PropertyDef[] = [
  {
    id: "LOG-AUT-01",
    label: "Robustez: sin errores, sin NaN e invariantes al 100%",
    priority: "P1",
    needs: ["F"],
    check: (r) => {
      const bad = r.records.filter((x) => !x.ok);
      const sample = bad.slice(0, 3).map((x) => `${x.bot}/${x.scenario}/${x.seed}: ${x.error?.split("\n")[0] ?? x.problems[0]}`);
      return { pass: bad.length === 0, detail: `${r.of("F").length} corridas de BOT-F; ${bad.length} corridas con problemas en total${sample.length ? ` (${sample.join("; ")})` : ""}` };
    },
  },
  {
    id: "LOG-AUT-02",
    label: "Segmentar gana: en Megalópolis, BOT-C > BOT-A bajo las tres estrategias (≥ 80%)",
    priority: "P1",
    needs: ["A", "C"],
    check: (r) => perCombo(r, ["megalopolis"], 0.8, ["A", "C"], (_st, score) => score("C") > score("A")),
  },
  {
    id: "LOG-AUT-03",
    label: "Velocidad no lo es todo: BOT-B tiene el mejor tiempo de ciclo, nunca el mejor puntaje bajo eficiencia y bajo confiabilidad ≤ 10%",
    priority: "P1",
    needs: FIVE,
    check: (r) => {
      const fails: string[] = [];
      for (const scn of r.scenarios) {
        const fastest = r.shareOfSeeds(scn, FIVE, (rec) => FIVE.every((b) => rec("B").kpiMeans.CYCLE_HOURS! <= rec(b).kpiMeans.CYCLE_HOURS!));
        const effWin = r.shareOfSeeds(scn, FIVE, (rec) => best((b) => rec(b).scores.efficiency!, FIVE) === "B");
        const relWin = r.shareOfSeeds(scn, FIVE, (rec) => best((b) => rec(b).scores.reliability!, FIVE) === "B");
        if (fastest < 0.8) fails.push(`${scn}: B es el más rápido solo en ${pct(fastest)}`);
        if (effWin > 0) fails.push(`${scn}: B gana bajo eficiencia en ${pct(effWin)}`);
        if (relWin > 0.1) fails.push(`${scn}: B gana bajo confiabilidad en ${pct(relWin)}`);
      }
      return { pass: fails.length === 0, detail: fails.length ? fails.join("; ") : "B es el más rápido y no gana bajo eficiencia ni confiabilidad" };
    },
  },
  {
    id: "LOG-AUT-04",
    label: "Geografía importa: en Norte, BOT-E queda entre los 2 peores de A–E bajo eficiencia y confiabilidad (≥ 80%)",
    priority: "P1",
    needs: FIVE,
    check: (r) =>
      perCombo(r, ["norte"], 0.8, FIVE, (_st, score) => Results.rank(Object.fromEntries(FIVE.map((b) => [b, score(b)])), "E") >= 4, ["efficiency", "reliability"]),
  },
  {
    id: "LOG-AUT-05",
    label: "Eficiencia coherente: BOT-D tiene el mejor CPD de A–E en Megalópolis y Bajío (≥ 80%)",
    priority: "P2",
    needs: FIVE,
    check: (r) => {
      const fails: string[] = [];
      const info: string[] = [];
      for (const scn of ["megalopolis", "bajio"].filter((x) => r.scenarios.includes(x))) {
        const share = r.shareOfSeeds(scn, FIVE, (rec) => FIVE.every((b) => rec("D").kpiMeans.CPD! <= rec(b).kpiMeans.CPD!));
        info.push(`${scn} ${pct(share)}`);
        if (share < 0.8) fails.push(`${scn} ${pct(share)}`);
      }
      return { pass: fails.length === 0, detail: fails.length ? `bajo 80%: ${fails.join(", ")}` : info.join(", ") };
    },
  },
  {
    id: "LOG-AUT-06",
    label: "Se aprende entre ciclos: BOT-H mejora el OTD p95 de nov–dic del año 1 al 2 (≥ 90%) y el año 3 ≥ año 2",
    priority: "P1",
    needs: ["H"],
    check: (r) => {
      const fails: string[] = [];
      const info: string[] = [];
      const nd = (s: number[], y: number) => (s[12 * y + 10]! + s[12 * y + 11]!) / 2;
      for (const scn of r.scenarios) {
        const runs = r.of("H", scn);
        const up = runs.filter((x) => nd(x.series.OTD_P95!, 1) > nd(x.series.OTD_P95!, 0)).length / runs.length;
        const y2 = mean(runs.map((x) => nd(x.series.OTD_P95!, 1)));
        const y3 = mean(runs.map((x) => nd(x.series.OTD_P95!, 2)));
        info.push(`${scn} ${pct(up)} (año 2 ${y2.toFixed(3)}, año 3 ${y3.toFixed(3)})`);
        if (up < 0.9) fails.push(`${scn}: mejora en ${pct(up)}`);
        if (y3 < y2 - 0.01) fails.push(`${scn}: año 3 ${y3.toFixed(3)} < año 2 ${y2.toFixed(3)}`);
      }
      return { pass: fails.length === 0, detail: fails.length ? fails.join("; ") : info.join(", ") };
    },
  },
  {
    id: "LOG-AUT-07",
    label: "Ningún extremo domina: ≥ 3 óptimos distintos y ninguno es óptimo en todas las combinaciones",
    priority: "P2",
    needs: ["I"],
    check: (r) => {
      const keys = r.search.map((s) => JSON.stringify(s.best));
      const distinct = new Set(keys).size;
      const maxRepeat = Math.max(0, ...[...new Set(keys)].map((k) => keys.filter((x) => x === k).length));
      return { pass: distinct >= 3 && maxRepeat < r.search.length, detail: `${distinct} óptimos distintos en ${r.search.length} combinaciones (máx. repetido ${maxRepeat})` };
    },
  },
  {
    id: "LOG-AUT-08",
    label: "Óptimos interiores: n.º de zonas, ventana, holgura y % SFS no en los extremos en ≥ 7 de 9 combinaciones",
    priority: "P2",
    needs: ["I"],
    check: (r) => {
      const interior = r.search.filter((s) => s.atBounds.length === 0);
      const edges = r.search.filter((s) => s.atBounds.length > 0).map((s) => `${s.scenario}/${s.strategy}: ${s.atBounds.join("+")}`);
      return { pass: interior.length >= Math.min(7, r.search.length), detail: `${interior.length}/${r.search.length} interiores${edges.length ? `; en extremo: ${edges.join(", ")}` : ""}` };
    },
  },
  {
    id: "LOG-AUT-09",
    label: "Urbano ≠ rural: el óptimo de Norte consolida más (lockers, micro-hubs, ventanas amplias) que el de Megalópolis",
    priority: "P2",
    needs: ["I"],
    check: (r) => {
      const fails: string[] = [];
      const info: string[] = [];
      for (const st of STRATS) {
        const n = r.search.find((s) => s.scenario === "norte" && s.strategy === st);
        const m = r.search.find((s) => s.scenario === "megalopolis" && s.strategy === st);
        if (!n || !m) continue;
        const cn = consolidation(n.best);
        const cm = consolidation(m.best);
        info.push(`${st}: Norte ${cn.toFixed(2)} vs Megalópolis ${cm.toFixed(2)}`);
        if (!(cn > cm)) fails.push(`${st}: Norte ${cn.toFixed(2)} ≤ Megalópolis ${cm.toFixed(2)}`);
      }
      return { pass: fails.length === 0 && info.length > 0, detail: fails.length ? fails.join("; ") : info.join(", ") || "sin óptimos" };
    },
  },
  {
    id: "LOG-AUT-10",
    label: "Habilidad > suerte: CV de BOT-A < 15% y, en Megalópolis, media(C − A) > 2σ(A)",
    priority: "P1",
    needs: ["A", "C"],
    check: (r) => {
      const fails: string[] = [];
      const info: string[] = [];
      for (const scn of r.scenarios) {
        for (const st of STRATS) {
          const a = r.summary("A", scn, st);
          if (a.mean < 5) fails.push(`${scn}/${st}: puntaje de A degenerado (${a.mean.toFixed(1)})`);
          else if (a.cv >= 0.15) fails.push(`${scn}/${st}: CV(A) ${pct(a.cv)}`);
          if (scn === "megalopolis") {
            const diff = mean(r.pairedDiff("C", "A", scn, st));
            info.push(`${st} C−A=${diff.toFixed(1)} vs 2σ=${(2 * a.sd).toFixed(1)}`);
            if (!(diff > 2 * a.sd)) fails.push(`${scn}/${st}: C−A ${diff.toFixed(1)} ≤ 2σ(A) ${(2 * a.sd).toFixed(1)}`);
          }
        }
      }
      return { pass: fails.length === 0, detail: fails.length ? fails.join("; ") : info.join(", ") };
    },
  },
  {
    id: "LOG-AUT-11",
    label: "Los picos son el examen: para BOT-A, ≥ 50% de los meses con guardrail violado son meses pico",
    priority: "P2",
    needs: ["A"],
    check: (r) => {
      const info: string[] = [];
      let fail = false;
      for (const scn of r.scenarios) {
        const g = scoreGuardrails(params, scn as TerritoryId);
        let viol = 0;
        let inPeak = 0;
        for (const x of r.of("A", scn)) {
          for (let e = 0; e < 36; e++) {
            const bad = g.some((gr) => {
              const v = x.series[gr.kpi]?.[e];
              return v !== undefined && (gr.op === ">=" ? v < gr.value : v > gr.value);
            });
            if (!bad) continue;
            viol++;
            if (isPeakMonth(params, e)) inPeak++;
          }
        }
        const share = viol ? inPeak / viol : 1;
        info.push(`${scn} ${pct(share)} de ${viol}`);
        if (share < 0.5) fail = true;
      }
      return { pass: !fail, detail: info.join(", ") };
    },
  },
  {
    id: "LOG-AUT-12",
    label: "Medir importa: en Megalópolis, BOT-A tiene OTD promedio − OTD p95 ≥ 10 pp",
    priority: "P2",
    needs: ["A"],
    check: (r) => {
      const runs = r.of("A", "megalopolis");
      if (!runs.length) return { pass: true, detail: "sin corridas de Megalópolis" };
      const gap = mean(runs.map((x) => x.kpiMeans.OTD! - x.kpiMeans.OTD_P95!));
      return { pass: gap >= 0.1, detail: `diferencia media ${(gap * 100).toFixed(1)} pp` };
    },
  },
  {
    id: "LOG-AUT-13",
    label: "La IA necesita datos: segmentado con IA y datos básicos < segmentado con VRPTW y datos completos (≥ 80%)",
    priority: "P2",
    needs: ["J", "K"],
    check: (r) => perCombo(r, r.scenarios, 0.8, ["J", "K"], (_st, score) => score("J") < score("K")),
  },
  {
    id: "LOG-AUT-14",
    label: "Estabilidad del reactivo: KPIs en rango y sin costos explosivos",
    priority: "P3",
    needs: ["G"],
    check: (r) => {
      const g = r.of("G");
      const worst = Math.max(...g.map((x) => Math.max(...x.series.CPD!)));
      return { pass: g.every((x) => x.ok) && worst < 40, detail: `CPD máximo USD ${worst.toFixed(2)} en ${g.length} corridas` };
    },
  },
  {
    id: "LOG-AUT-16",
    label: "Explicabilidad: ≥ 95% de los cambios de KPI > 10% tienen causa registrada",
    priority: "P1",
    needs: [],
    check: (r) => {
      const total = r.records.reduce((a, x) => a + x.changes, 0);
      const explained = r.records.reduce((a, x) => a + x.coverage * x.changes, 0);
      const cov = total ? explained / total : 1;
      return { pass: cov >= 0.95, detail: `cobertura ${(cov * 100).toFixed(1)}% sobre ${total} cambios relevantes` };
    },
  },
];
