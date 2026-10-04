# @mt4035/sim-core

Núcleo común, sin DOM, de los simuladores MT4035. Implementa la fase **F1** de la [ruta de implementación](../decisiones-arquitectura-ui.md#4-ruta-de-implementación).

| Módulo | Contenido | Decisión |
|---|---|---|
| `src/rng.ts` | PRNG basado en contador con **números aleatorios comunes**: cada sorteo depende de (semilla, subsistema, época, tick, entidad) | AD-06 |
| `src/types.ts` | Contrato `ModelDef` que implementa cada simulador: calendario, decisiones, `init`, `tick`, reglas, eventos, `aggregate` | AD-05, AD-07 |
| `src/engine.ts` | Motor puro: `createGame`, `validate`, `stage` (preparar/deshacer), `confirmEpoch` (única forma de avanzar), retrasos, capex, eventos y reglas por tick | AD-05, AD-20 |
| `src/causal.ts` | Consultas al log causal y cobertura de explicabilidad | AD-08 |
| `src/scoring.ts` | Puntaje ponderado con normalización y penalización por guardrails | §7.3 de las especificaciones |
| `src/export.ts` | Exportación JSON con checksum SHA-256, validación de importación (zod) y CSV | AD-12 |
| `src/replay.ts` | Repetición de corridas exportadas y diff de KPIs y eventos | AD-12 |
| `src/storage.ts` | `localStorage` con respaldo en memoria y repositorio de corridas con migraciones | AD-11 |
| `src/math.ts` | Normal (CDF, inversa, pérdida G(z)), percentiles, probabilidad por tick | — |
| `src/testing.ts` | Ganchos de prueba: `overrideState`, `playGame` (bots), `deepFreeze` | §2 de los casos de prueba |

## Orden de ejecución de una época

1. Decisiones confirmadas: se carga el costo; si el retraso es 0 se aplican, si no se crea un proyecto pendiente.
2. Se activan los proyectos cuyo retraso venció.
3. `onEpochStart()`.
4. Por cada tick: inicio de eventos (aleatorios o forzados) → efecto por tick de los eventos activos → `model.tick()` → reglas (su efecto se ve desde el tick siguiente).
5. `aggregate()` produce los KPIs de la época; `onEpochEnd()`.

## Uso

```bash
npm install
npm test          # suite rápida (unitarias, propiedades, pareadas, replay, persistencia)
npm run test:mc   # Monte Carlo de frecuencias de eventos (semillas fijas, determinista)
npm run typecheck
```

Requiere Node ≥ 20. Se usa Vitest 4 porque Vitest 5 exige Node 22.

## Notas de diseño

- **Validación de dependencias:** `DecisionView.effective(id)` incluye los cambios preparados; `previous(id)` da el valor anterior al cambio (pendiente o vigente). Las reglas "solo ampliar" o "no revertir" deben usar `previous`.
- **Eventos:** `pBase` es probabilidad **por época**; el motor la convierte a probabilidad por tick de modo que P(≥1 ocurrencia en la época) = p. Una ocurrencia del mismo evento no se apila sobre otra activa (tampoco los forzados).
- **Replay entre navegadores:** `Math.exp/log/cos` pueden diferir en el último bit entre motores de JavaScript, por eso el replay compara KPIs con tolerancia relativa (1e-9 por omisión). En el mismo motor, la repetición es exacta.
- **Pruebas genéricas:** usan un modelo de juguete (`test/fixtures/toy-model.ts`). Las pruebas específicas de cada simulador (SCM-…, LOG-…) viven en su `app/`.
