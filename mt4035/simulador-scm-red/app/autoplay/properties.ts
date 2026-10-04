/** Propiedades de coherencia SCM-AUT (casos de prueba §11.2) evaluadas sobre los registros de auto-juego. */
import { mean, std } from "@mt4035/sim-core";
import { Results, type PropertyDef } from "@mt4035/sim-tools";

const STRATS = ["freshness", "lowcost", "convenience"] as const;
const FIVE = ["A", "B", "C", "D", "E"];
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

/** Evalúa una condición por estrategia y escenario; pasa si todas superan el umbral. */
function perCombo(r: Results, scenarios: readonly string[], minShare: number, bots: readonly string[], pred: (s: string, score: (b: string) => number) => boolean) {
  const fails: string[] = [];
  const shares: string[] = [];
  for (const scn of scenarios) {
    if (!r.scenarios.includes(scn)) continue;
    for (const st of STRATS) {
      const share = r.shareOfSeeds(scn, bots, (rec) => pred(st, (b) => rec(b).scores[st]!));
      shares.push(`${scn}/${st} ${pct(share)}`);
      if (!(share >= minShare)) fails.push(`${scn}/${st} ${pct(share)}`);
    }
  }
  return { pass: fails.length === 0, detail: fails.length ? `bajo ${pct(minShare)}: ${fails.join(", ")}` : shares.join(", ") };
}

const best = (score: (b: string) => number, bots: readonly string[]) => bots.reduce((a, b) => (score(b) > score(a) ? b : a));

export const properties: PropertyDef[] = [
  {
    id: "SCM-AUT-01",
    label: "Robustez: sin errores, sin NaN e invariantes al 100%",
    priority: "P1",
    needs: ["F"],
    check: (r) => {
      const bad = r.records.filter((x) => !x.ok);
      const f = r.of("F");
      return { pass: bad.length === 0, detail: `${f.length} corridas de BOT-F; ${bad.length} corridas con problemas en total` };
    },
  },
  {
    id: "SCM-AUT-02",
    label: "Desalineación pierde: en Red River, BOT-B queda entre los 2 peores de A–E (≥ 80%)",
    priority: "P1",
    needs: FIVE,
    check: (r) => perCombo(r, ["redriver"], 0.8, FIVE, (_st, score) => Results.rank(Object.fromEntries(FIVE.map((b) => [b, score(b)])), "B") >= 4),
  },
  {
    id: "SCM-AUT-03",
    label: "Adaptación gana: en Red River y Valle, BOT-C > BOT-A y BOT-C > BOT-B (≥ 80%)",
    priority: "P1",
    needs: ["A", "B", "C"],
    check: (r) => perCombo(r, ["redriver", "valle"], 0.8, ["A", "B", "C"], (_st, score) => score("C") > score("A") && score("C") > score("B")),
  },
  {
    id: "SCM-AUT-04",
    label: "Ningún extremo domina: BOT-D nunca es el mejor bajo bajo costo; BOT-E nunca bajo frescura (≥ 95%)",
    priority: "P1",
    needs: FIVE,
    check: (r) => {
      const fails: string[] = [];
      for (const scn of r.scenarios) {
        const d = r.shareOfSeeds(scn, FIVE, (rec) => best((b) => rec(b).scores.lowcost!, FIVE) !== "D");
        const e = r.shareOfSeeds(scn, FIVE, (rec) => best((b) => rec(b).scores.freshness!, FIVE) !== "E");
        if (!(d >= 0.95)) fails.push(`${scn}: D gana bajo costo en ${pct(1 - d)}`);
        if (!(e >= 0.95)) fails.push(`${scn}: E gana frescura en ${pct(1 - e)}`);
      }
      return { pass: fails.length === 0, detail: fails.length ? fails.join("; ") : "ni D ni E dominan en ningún escenario" };
    },
  },
  {
    id: "SCM-AUT-09",
    label: "Habilidad > suerte: CV de BOT-A < 15% y media(C − B) > 2σ(A) en Red River y Valle",
    priority: "P1",
    needs: ["A", "B", "C"],
    check: (r) => {
      const fails: string[] = [];
      const info: string[] = [];
      for (const scn of r.scenarios) {
        for (const st of STRATS) {
          const a = r.summary("A", scn, st);
          if (a.mean < 5) fails.push(`${scn}/${st}: puntaje de A degenerado (${a.mean.toFixed(1)})`);
          else if (a.cv >= 0.15) fails.push(`${scn}/${st}: CV(A) ${pct(a.cv)}`);
          if (scn === "redriver" || scn === "valle") {
            const diff = mean(r.pairedDiff("C", "B", scn, st));
            info.push(`${scn}/${st} C−B=${diff.toFixed(1)} vs 2σ=${(2 * a.sd).toFixed(1)}`);
            if (!(diff > 2 * a.sd)) fails.push(`${scn}/${st}: C−B ${diff.toFixed(1)} ≤ 2σ(A) ${(2 * a.sd).toFixed(1)}`);
          }
        }
      }
      return { pass: fails.length === 0, detail: fails.length ? fails.join("; ") : info.join(", ") };
    },
  },
  {
    id: "SCM-AUT-05",
    label: "Decisiones significativas: ≥ 3 configuraciones óptimas distintas entre región × estrategia",
    priority: "P2",
    needs: ["H"],
    check: (r) => {
      const distinct = new Set(r.search.map((s) => JSON.stringify(s.best))).size;
      return { pass: distinct >= 3, detail: `${distinct} óptimos distintos en ${r.search.length} combinaciones` };
    },
  },
  {
    id: "SCM-AUT-06",
    label: "Óptimos interiores: n.º de CD, CSL y frecuencia no en los extremos en ≥ 7 de 9 combinaciones",
    priority: "P2",
    needs: ["H"],
    check: (r) => {
      const interior = r.search.filter((s) => !s.atBounds.includes("dcCount") && !s.atBounds.includes("csl") && !(s.atBounds.includes("freshFreq") && s.atBounds.includes("ambientFreq")));
      const edges = r.search.filter((s) => !interior.includes(s)).map((s) => `${s.scenario}/${s.strategy}: ${s.atBounds.join("+")}`);
      return { pass: interior.length >= Math.min(7, r.search.length), detail: `${interior.length}/${r.search.length} interiores${edges.length ? `; en extremo: ${edges.join(", ")}` : ""}` };
    },
  },
  {
    id: "SCM-AUT-07",
    label: "Validación contra el caso: el óptimo de Kaigan + frescura se parece al diseño SEJ",
    priority: "P2",
    needs: ["H"],
    check: (r) => {
      const o = r.search.find((s) => s.scenario === "kaigan" && s.strategy === "freshness");
      if (!o) return { pass: false, detail: "sin óptimo para kaigan/freshness" };
      const b = o.best;
      const sej = { combinado: b.dcCount === -1 || b.dcType === "combined", frescosPorCd: b.flowFresh === "dc", frecuencia: Number(b.freshFreq) >= 14, posCompartido: b.sharing === "daily" };
      const miss = Object.entries(sej).filter(([, ok]) => !ok).map(([k]) => k);
      return { pass: miss.length === 0, detail: miss.length ? `difiere en: ${miss.join(", ")}` : "CD combinado, frescos por CD ≥ 2×/día, POS diario compartido" };
    },
  },
  {
    id: "SCM-AUT-08",
    label: "La geografía cambia el óptimo: Red River + frescura usa frescos ≤ 2×/día y CD con inventario para ambiente",
    priority: "P2",
    needs: ["H"],
    check: (r) => {
      const o = r.search.find((s) => s.scenario === "redriver" && s.strategy === "freshness");
      if (!o) return { pass: false, detail: "sin óptimo para redriver/freshness" };
      const b = o.best;
      const freqOk = b.flowFresh === "dsd" || Number(b.freshFreq) <= 14;
      const stockOk = Number(b.dcCount) > 0 && b.dcType === "stocking" && b.flowAmbient === "dc";
      return { pass: freqOk && stockOk, detail: `frescos ${b.flowFresh}/${b.freshFreq}, CD ${b.dcCount}×${b.dcType}, ambiente por ${b.flowAmbient}` };
    },
  },
  {
    id: "SCM-AUT-11",
    label: "La información tarda: con solo D-30/D-31, OSA ↑ y BWR ↓ con efecto visible a las 2–4 épocas",
    priority: "P2",
    needs: ["A", "I"],
    check: (r) => {
      const fails: string[] = [];
      for (const scn of r.scenarios) {
        const osaGain = (e: number) => mean(r.of("I", scn).map((x) => x.series.OSA![e]!)) - mean(r.of("A", scn).map((x) => x.series.OSA![e]!));
        const bwrGain = (e: number) => mean(r.of("A", scn).map((x) => x.series.BWR![e]!)) - mean(r.of("I", scn).map((x) => x.series.BWR![e]!));
        if (scn === "kaigan") continue; // Kaigan ya tiene POS diario y compartido
        if (!(osaGain(0) <= 1e-6)) fails.push(`${scn}: OSA mejora en la época 0 (sin retraso)`);
        if (!(osaGain(4) > 0)) fails.push(`${scn}: OSA no mejora a la época 4`);
        if (!(bwrGain(2) > 0)) fails.push(`${scn}: BWR no baja a la época 2`);
      }
      return { pass: fails.length === 0, detail: fails.length ? fails.join("; ") : "efecto con retraso en Red River y Valle" };
    },
  },
  {
    id: "SCM-AUT-12",
    label: "Estabilidad del reactivo: KPIs en rango y sin costos explosivos",
    priority: "P3",
    needs: ["G"],
    check: (r) => {
      const g = r.of("G");
      const worst = Math.max(...g.map((x) => Math.max(...x.series.CTS_PCT!)));
      return { pass: g.every((x) => x.ok) && worst < 1, detail: `CTS máximo ${pct(worst)} en ${g.length} corridas` };
    },
  },
  {
    id: "SCM-AUT-14",
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

void std;
