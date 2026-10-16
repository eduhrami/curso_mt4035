/**
 * Metas de utilidad para la autoevaluación del alumno (src/targets.json): por región × propuesta × escenario de mercado,
 * la mejor utilidad acumulada encontrada en jugadas de prueba (red de referencia o política adaptada BOT-C, con ±10% de
 * error de pronóstico). Solo cifras, sin decisiones: puede vivir en el repositorio público.
 *   npx tsx autoplay/targets.ts   (también se regenera al final de `npm run network-optima`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { REPORTS_DIR } from "./reports-dir.ts";

interface Row { scenario: string; strategy: string; profit: number; adapted: number }

export function writeTargets(rows: readonly Row[]): void {
  const out: Record<string, Record<string, Record<string, number>>> = {};
  for (const r of rows) {
    const [region, preset = "base"] = r.scenario.split("@");
    ((out[preset] ??= {})[region!] ??= {})[r.strategy] = Math.round(Math.max(r.profit, r.adapted));
  }
  const file = fileURLToPath(new URL("../src/targets.json", import.meta.url));
  writeFileSync(file, JSON.stringify({ note: "Utilidad acumulada de 3 años (M USD) en jugadas de prueba del simulador: no necesariamente el máximo posible.", generatedAt: new Date().toISOString().slice(0, 10), targets: out }, null, 2) + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) writeTargets(JSON.parse(readFileSync(`${REPORTS_DIR}/red-optima.json`, "utf8")));
