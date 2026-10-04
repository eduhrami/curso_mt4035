# @mt4035/sim-scm — modelo del Simulador SCM + Diseño de red

Implementación de la fase **F2** ([ruta](../../simuladores-comun/decisiones-arquitectura-ui.md#4-ruta-de-implementación)): el modelo de la [especificación](../especificacion.md) sobre [`@mt4035/sim-core`](../../simuladores-comun/core/README.md). Todavía no tiene interfaz; la UI es la fase F4.

| Archivo | Contenido | Especificación |
|---|---|---|
| `params/params.v1.json` | Constantes de calibración (⚠ preliminares; se ajustan con auto-juego en F3) | AD-09 |
| `src/types.ts` | Estado, decisiones, escenario y perfiles de mercado | §4, §5 |
| `src/scenario.ts` | Regiones (rejilla 6×6 de zonas), red *as-is* y greenfield | §4.1 |
| `src/network.ts` | Geometría, asignación zona→CD, rutas (paradas, horas, relevo) y densidad | §6.3 |
| `src/tick.ts` | Tick semanal: demanda, rutas, lead time, frescura, merma, fill rate, OSA, inventario y costos | §6.3, §6.3b |
| `src/decisions.ts` | D-00 … D-34 (D-01 = red de CD con D-02/03/04 por CD; D-08 = lote de aperturas) | §5 |
| `src/rules.ts` · `src/events.ts` | R-01 … R-12 · X-01 … X-12 | §6.4, §8 |
| `src/kpis.ts` · `src/score.ts` | KPIs por época · puntaje por estrategia con guardrails | §7 |
| `src/model.ts` | `ModelDef`, `createScmEngine()` y `scmConfig()` | — |

## Pruebas

```bash
npm install
npm test          # casos P1: INV, CAU, ESC, REG, EVT, LAG, SCO, PER
npm run test:mc   # Monte Carlo de frecuencias de eventos (EVT-01, EVT-02)
npm run diag      # imprime KPIs de corridas de referencia (calibración)
```

Las pruebas siguen las claves de [casos-de-prueba.md](../casos-de-prueba.md). Las P2/P3 y las de auto-juego (AUT) quedan para la fase F3.
