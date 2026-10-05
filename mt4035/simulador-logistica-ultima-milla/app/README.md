# @mt4035/sim-lastmile — modelo del Simulador Logística y Última Milla

Modelo (fase **F5**), auto-juego (**F6**) e interfaz (**F7**) del simulador de la [especificación](../especificacion.md), sobre [`@mt4035/sim-core`](../../simuladores-comun/core/README.md). Ver la [ruta de implementación](../../simuladores-comun/decisiones-arquitectura-ui.md#4-ruta-de-implementación).

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

## Interfaz (F7)

`ui/` contiene la app Preact sobre [`@mt4035/ui-kit`](../../simuladores-comun/ui-kit/README.md). Se compila en **un solo `dist/index.html`** (~430 KB, ~145 KB comprimido) que funciona sin servidor ni conexión.

| Archivo | Contenido |
|---|---|
| `ui/Setup.tsx` | Territorio (ficha de factores), calendario de picos, estrategia de servicio, condiciones de mercado, semilla y jugador |
| `ui/App.tsx` | Barra superior (mes, inversión, proyectos en curso), layout de tres columnas y diálogo de confirmación |
| `ui/Dashboard.tsx` | Tarjetas de KPI según D-61 (promedio o p95), trayectoria, «¿por qué cambió?», serie diaria del último mes, frontera OTD p95–CPD, desglose del costo por entrega y mapa |
| `ui/TerritoryMap.tsx` | Zonas del territorio con calor de demanda, nodos que operan (MFC, dark stores, hubs, lockers, tiendas SFS) y confianza del cliente |
| `ui/FinalReport.tsx` | Puntaje según la estrategia declarada, desglose, guardrails, trayectoria de 36 meses, picos enfrentados, decisiones y eventos; exportación JSON/CSV e impresión |
| `ui/Runs.tsx` | Corridas guardadas: continuar, exportar, borrar, importar y comparar hasta 4 |
| `ui/labels.ts` | Textos en español, opciones y metadatos de KPI (sigla, nombre, fórmula, guardrail por territorio) |

```bash
npm run dev        # servidor de desarrollo de Vite
npm run build      # dist/index.html autocontenido
npm run e2e        # compila y corre las pruebas de punta a punta (Playwright, Chromium)
node scripts/smoke.mjs <carpeta>   # capturas de pantalla para revisión visual
```

El modo profesor se activa con `?profesor=1`: muestra el puntaje parcial durante el juego y permite importar varias corridas de alumnos y verificarlas con replay.

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
npm test          # casos LOG P1 (y SCO-05) y pruebas de la interfaz: INV, CAU, ESC, REG, EVT, LAG, SCO, PER, UI
npm run test:mc   # Monte Carlo de frecuencias de eventos (EVT-01)
npm run diag      # imprime KPIs de corridas de referencia (calibración)
```
