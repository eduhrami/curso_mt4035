# @mt4035/sim-lastmile — modelo del Simulador Logística y Última Milla

Modelo (fase **F5**) y auto-juego (**F6**) del simulador de la [especificación](../especificacion.md), sobre [`@mt4035/sim-core`](../../simuladores-comun/core/README.md). Ver la [ruta de implementación](../../simuladores-comun/decisiones-arquitectura-ui.md#4-ruta-de-implementación). Sigue la interfaz (F7).

36 épocas mensuales (A1-M01 … A3-M12), cada una con ticks diarios según el calendario real (28–31 días).

| Archivo | Contenido | Especificación |
|---|---|---|
| `params/params.v1.json` | Constantes de calibración (⚠ preliminares; se ajustan con auto-juego en F6) | AD-09 |
| `src/types.ts` | Estado, decisiones, escenario y perfiles de mercado | §4, §5 |
| `src/scenario.ts` | Operación *as-is* de Mercado Alba por territorio | §2, §4.1 |
| `src/network.ts` | Calendario y picos, ubicación de nodos (MFC, dark stores, hubs, lockers) y rutas por aproximación continua | §6.3 |
| `src/tick.ts` | Tick diario en tres pasadas: zonas, flota y resultados | §6.3, §6.3b |
| `src/decisions.ts` | D-00 … D-63 con retrasos, capex y validaciones | §5 |
| `src/rules.ts` · `src/events.ts` | R-01 … R-14 · X-01 … X-15 | §6.4, §8 |
| `src/kpis.ts` · `src/score.ts` | KPIs mensuales (promedio y p95 diario) · puntaje por estrategia con guardrails | §7 |
| `src/model.ts` | `ModelDef`, `createLastMileEngine()` y `lmConfig()` | — |

El territorio `minicaso` es un *fixture* de calibración (mini-caso de S5, lámina 22) y no se ofrece al jugador.

## Auto-juego y calibración (F6)

- `autoplay/bots.ts`: bots A–K (casos de prueba §11.1; J y K son variantes de C para LOG-AUT-13) y el espacio de búsqueda de BOT-I.
- `autoplay/properties.ts`: propiedades LOG-AUT.
- `autoplay/adapter.ts`: adaptador para [`@mt4035/sim-tools`](../../simuladores-comun/tools/README.md).

```bash
npm run autoplay -- --seeds 200 --search   # ~8 min en 10 núcleos; reporte en autoplay/reports/latest.md
npm run replay -- corrida.json
npm run aggregate -- carpeta/ --out resumen.csv
```

## Pruebas

```bash
npm install
npm test          # casos LOG P1 (y SCO-05): INV, CAU, ESC, REG, EVT, LAG, SCO, PER
npm run test:mc   # Monte Carlo de frecuencias de eventos (EVT-01)
npm run diag      # imprime KPIs de corridas de referencia (calibración)
```
