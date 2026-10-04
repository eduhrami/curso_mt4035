# @mt4035/sim-scm — modelo del Simulador SCM + Diseño de red

Modelo (fase **F2**), auto-juego (**F3**) e interfaz (**F4**) del simulador de la [especificación](../especificacion.md), sobre [`@mt4035/sim-core`](../../simuladores-comun/core/README.md) y [`@mt4035/ui-kit`](../../simuladores-comun/ui-kit/README.md). Ver la [ruta de implementación](../../simuladores-comun/decisiones-arquitectura-ui.md#4-ruta-de-implementación).

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

## Interfaz (F4)

`ui/` contiene la app Preact. Se compila en **un solo `dist/index.html`** (~420 KB, ~140 KB comprimido) que funciona sin servidor ni conexión: se puede publicar en GitHub Pages, subir a Canvas o abrir local.

| Archivo | Contenido |
|---|---|
| `ui/Setup.tsx` | Región, *greenfield*, estrategia declarada, condiciones de mercado, semilla y jugador |
| `ui/App.tsx` | Barra superior (trimestre, inversión, proyectos en curso), layout de tres columnas y diálogo de confirmación |
| `ui/Dashboard.tsx` | KPI con guardrail, trayectoria, «¿por qué cambió?», frontera servicio–costo, costos por trimestre y mapa |
| `ui/NetworkMap.tsx` · `ui/DcEditor.tsx` | Mapa esquemático de la red y editor de CD (D-01 con zona, tipo y tamaño) |
| `ui/FinalReport.tsx` | Puntaje según la estrategia declarada, desglose, guardrails, trayectoria, decisiones y eventos; exportación JSON/CSV e impresión |
| `ui/Runs.tsx` | Corridas guardadas: continuar, exportar, borrar, importar y comparar hasta 4 |
| `ui/labels.ts` | Textos en español, opciones y metadatos de KPI (sigla, nombre, fórmula, guardrail por región) |

```bash
npm run dev        # servidor de desarrollo de Vite
npm run build      # dist/index.html autocontenido
npm run e2e        # compila y corre las pruebas de punta a punta (Playwright, Chromium)
node scripts/smoke.mjs <carpeta>   # capturas de pantalla para revisión visual
```

El modo profesor se activa con `?profesor=1`: muestra el puntaje parcial durante el juego y permite importar varias corridas de alumnos y verificarlas con replay.

## Auto-juego y calibración (F3)

- `autoplay/bots.ts`: bots A–I (casos de prueba §11.1) y el espacio de búsqueda de BOT-H.
- `autoplay/properties.ts`: propiedades SCM-AUT.
- `autoplay/adapter.ts`: adaptador para [`@mt4035/sim-tools`](../../simuladores-comun/tools/README.md).

```bash
npm run autoplay -- --seeds 200 --search   # reporte en autoplay/reports/latest.md
npm run replay -- corrida.json
npm run aggregate -- carpeta/ --out resumen.csv
```

## Pruebas

```bash
npm install
npm test          # casos P1, P2 y P3: INV, CAU, ESC, REG, EVT, LAG, SCO, PER
npm run test:mc   # Monte Carlo de frecuencias de eventos (EVT-01, EVT-02)
npm run diag      # imprime KPIs de corridas de referencia (calibración)
```

Las pruebas siguen las claves de [casos-de-prueba.md](../casos-de-prueba.md). Las propiedades de auto-juego (AUT) se evalúan con `npm run autoplay`.
