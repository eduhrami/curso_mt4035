# @mt4035/ui-kit

Componentes Preact compartidos por los simuladores MT4035 (fase **F4**, [AD-20 … AD-29](../decisiones-arquitectura-ui.md#3-ui-y-experiencia)).

| Módulo | Contenido |
|---|---|
| `src/store.ts` | `createGameStore`: estado de la partida con signals, borrador de decisiones con validación en vivo, `confirm()` (única forma de avanzar), guardado automático en `localStorage` con respaldo en memoria, exportación y carga de corridas por replay |
| `src/components/decisions.tsx` | `DecisionPanel` y `SchemaControl`: controles generados desde los esquemas zod (enum → botones o lista, número → deslizador, booleano, objeto → campos). Las listas (como la red de CD) usan un editor propio del simulador (`custom`) |
| `src/components/confirm.tsx` | Diálogo de confirmación: diff de decisiones, costo inmediato, cuándo surte efecto y doble confirmación de lo irreversible |
| `src/components/kpis.tsx` | `KpiCard` con estado frente al guardrail (ícono + texto + color) |
| `src/components/charts.tsx` | Gráficas Chart.js (línea, barras apiladas, dispersión) con colores tomados de los tokens CSS y tabla de datos accesible |
| `src/components/messages.tsx` | Bandeja de mensajes con «¿Por qué pasó esto?» y explicación causal de un KPI |
| `src/components/scenarios.tsx` | `ScenarioPicker`: fichas de escenarios de mercado predefinidos y perfil libre bajo «Crear mi propio escenario» (AD-30) |
| `src/components/debrief.tsx` | `DebriefPanel`: debrief obligatorio del reporte final (notas del escenario + preguntas; el store bloquea la exportación hasta completarlo, AD-31) |
| `src/components/credits.tsx` | `CourseCredits`: profesores del curso y sus perfiles públicos en la pantalla de inicio |
| `src/components/glossary.tsx` | `GlossaryContext`, `GlossaryDialog`, `Gloss` y `glossaryTitle`: glosario del simulador y definiciones al pasar el mouse (AD-32) |
| `src/components/basics.tsx` | Pestañas, layout de tres columnas que pasa a pestañas en pantallas angostas, aviso de almacenamiento |
| `src/theme.css` | Tokens de diseño, modo oscuro, layout responsivo e impresión |

La época se nombra con la prop `period` (`"trimestre"` por omisión en SCM, `"mes"` en logística) en `ConfirmDialog`, `MessageInbox` y `KpiExplanation`; el tick, con `unit` / `unitPlural` (semana o día).

## Cómo se consume

El paquete **no instala** Preact, Chart.js ni zod: los declara como `peerDependencies` y los resuelve desde la app del simulador. Así hay una sola copia de cada uno; con dos copias de Preact, los hooks fallan. Cada app necesita:

- en `vite.config.ts`: `resolve.dedupe: ["preact", "@preact/signals", "chart.js", "zod"]` y un alias de `@mt4035/sim-core` a su `src/index.ts`;
- en `tsconfig.json`: `paths` para `preact`, `@preact/signals`, `chart.js` y `@mt4035/sim-core` hacia los `node_modules` de la app.

Ver [`simulador-scm-red/app/vite.config.ts`](../../simulador-scm-red/app/vite.config.ts) como referencia.
