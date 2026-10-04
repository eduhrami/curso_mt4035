# @mt4035/sim-lastmile — modelo del Simulador Logística y Última Milla

Modelo (fase **F5**) del simulador de la [especificación](../especificacion.md), sobre [`@mt4035/sim-core`](../../simuladores-comun/core/README.md). Ver la [ruta de implementación](../../simuladores-comun/decisiones-arquitectura-ui.md#4-ruta-de-implementación). Siguen el auto-juego y la calibración (F6) y la interfaz (F7).

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

## Pruebas

```bash
npm install
npm test          # casos LOG P1: INV, CAU, ESC, REG, EVT, LAG, SCO, PER
npm run test:mc   # Monte Carlo de frecuencias de eventos (EVT-01)
npm run diag      # imprime KPIs de corridas de referencia (calibración)
```
