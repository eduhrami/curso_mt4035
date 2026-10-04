/**
 * Punto de entrada de las herramientas para el simulador SCM.
 *   npm run autoplay -- --seeds 200 --bots A,B,C,D,E --workers 8
 *   npm run replay -- corrida.json …
 *   npm run aggregate -- carpeta/ [--out resumen.csv]
 */
import { aggregateCli, autoplayCli, parseArgs, replayCli } from "@mt4035/sim-tools";
import { createScmEngine, PARAMS_VERSION, SIM_ID, SIM_VERSION } from "../src/index.ts";

const [cmd, ...rest] = process.argv.slice(2);
const adapterUrl = new URL("./adapter.ts", import.meta.url).href;
let code = 0;
switch (cmd) {
  case "autoplay":
    code = await autoplayCli(adapterUrl, ["--out", new URL("./reports", import.meta.url).pathname, ...rest]);
    break;
  case "replay":
    code = await replayCli(createScmEngine(), parseArgs(rest).positional, { simVersion: SIM_VERSION, paramsVersion: PARAMS_VERSION });
    break;
  case "aggregate": {
    const a = parseArgs(rest);
    code = aggregateCli(a.positional[0] ?? ".", SIM_ID, a.flags.out);
    break;
  }
  default:
    process.stderr.write("Uso: cli.ts autoplay|replay|aggregate …\n");
    code = 2;
}
process.exit(code);
