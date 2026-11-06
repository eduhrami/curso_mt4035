/**
 * Genera las series históricas (104 semanas, columna total y categorías) de las 3 regiones × 4 escenarios
 * predefinidos con su semilla sugerida, para el Modelador de series de tiempo (mt4035/modelador-series-tiempo/).
 * Uso: npx tsx scripts/series-modelador.ts ../../modelador-series-tiempo/series.json [--truth <verdad.json fuera del repo>]
 * La verdad (proceso oculto) solo se usa para validar el estimador; no se publica.
 */
import { writeFileSync } from "node:fs";
import { createScmEngine, demandCsv, scmConfig, params, PRESETS, truthForecast, type RegionId } from "../src/index.ts";

const [out, flag, truthOut] = process.argv.slice(2);
const eng = createScmEngine();
const regions: { id: RegionId; label: string }[] = [
  { id: "kaigan", label: "Kaigan" },
  { id: "redriver", label: "Red River" },
  { id: "valle", label: "Valle Metropolitano" },
];
const series: unknown[] = [];
const truth: Record<string, unknown> = {};
for (const r of regions)
  for (const p of PRESETS) {
    const g = eng.createGame(scmConfig({ seed: p.seed, region: r.id, market: p.market, preset: p.id }));
    const csv = demandCsv(g.model, params, p.seed, 0, g.model.noiseScale).trim().split("\n");
    const head = csv[0]!.split(",");
    const rows = csv.slice(1).map((l) => l.split(","));
    const col = (n: string) => rows.map((x) => Number(x[head.indexOf(n)]));
    const id = `${r.id}-${p.id}`;
    series.push({ id, region: r.label, scenario: p.title, seed: p.seed, week: col("semana"), total: col("total"), frescos: col("frescos"), refrigerado: col("refrigerado"), ambiente: col("ambiente"), congelado: col("congelado") });
    truth[id] = truthForecast(g.model, params, 0);
  }
writeFileSync(out!, JSON.stringify(series));
if (flag === "--truth") writeFileSync(truthOut!, JSON.stringify(truth, null, 1));
console.log(`${series.length} series`);
