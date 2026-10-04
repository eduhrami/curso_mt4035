# @mt4035/sim-tools

Herramientas de auto-juego de los simuladores MT4035 (fase **F3**, [AD-13](../decisiones-arquitectura-ui.md)). Es una librería genérica: cada simulador aporta un **adaptador** con sus bots, escenarios, puntaje y propiedades de coherencia, y un punto de entrada CLI propio (por ejemplo [`simulador-scm-red/app/autoplay/cli.ts`](../../simulador-scm-red/app/autoplay/cli.ts)).

| Módulo | Contenido |
|---|---|
| `src/types.ts` | Contrato `AutoplayAdapter`: bots, escenarios, estrategias, `score`, `check` (invariantes), cobertura de explicabilidad, propiedades y espacio de búsqueda |
| `src/run-task.ts` | Juega una partida (bot × escenario × semilla) y la resume en un `RunRecord` |
| `src/runner.ts` | `WorkerPool`: reparte tareas entre procesos de trabajo (`worker_threads`) y junta los registros en orden estable |
| `src/worker-boot.mjs` · `src/worker.ts` | Arranque de cada proceso: registra `tsx` (en Node 20 no se hereda con `--import`) y carga el adaptador una vez |
| `src/results.ts` | Consultas: resúmenes (media, σ, p5, p95, CV), posiciones por semilla, diferencias pareadas |
| `src/search.ts` | **BOT-H**: búsqueda aleatoria + ascenso por coordenadas, con punto de partida *as-is*, grupos de parámetros acoplados y vector canónico |
| `src/report.ts` | Reporte de coherencia (casos de prueba §11.3) en Markdown y JSON: alarmas P1, propiedades, tabla de puntajes, explicabilidad y óptimos |
| `src/cli.ts` | `autoplayCli`, `replayCli` y `aggregateCli` |

## Uso (desde la app de un simulador)

```bash
npm run autoplay -- --seeds 200 --workers 9                 # bots A–G, I en todas las regiones
npm run autoplay -- --seeds 50 --bots A,B,C --scenarios valle
npm run autoplay -- --seeds 200 --search                    # agrega BOT-H (AUT-05 … AUT-08)
npm run replay -- corrida1.json corrida2.json               # verifica corridas exportadas
npm run aggregate -- carpeta/ --out resumen.csv             # CSV del grupo para el profesor
```

El reporte queda en `autoplay/reports/` (`latest.md` y versiones con fecha). El comando devuelve código 1 si hay alarmas P1, así que sirve para CI.

## Rendimiento (SCM, 10 núcleos)

- 4,800 partidas (200 semillas × 8 bots × 3 regiones) en ~45 s.
- 10,000 partidas en ~1.5 min, dentro del presupuesto de AD-14 (< 10 min).
- La búsqueda de BOT-H (9 combinaciones, ~600 candidatos por región × 6 semillas) tarda ~2–3 min.
