# Simuladores MT4035 — Decisiones de arquitectura y UI

**Aplica a:** [Simulador SCM + Diseño de red](../simulador-scm-red/especificacion.md) (S4) y [Simulador Logística y Última Milla](../simulador-logistica-ultima-milla/especificacion.md) (S5).
**Estado:** v0.1. Las decisiones marcadas **✔** están tomadas; las marcadas **⚠** son propuestas pendientes de confirmar con el profesor.
**Formato:** registro de decisiones (*AD-xx*) con decisión, razón, alternativas descartadas y consecuencias. Si una decisión cambia, se edita la entrada y se anota la fecha. No se crean entradas duplicadas.

---

## 1. Restricciones de partida (vienen de las especificaciones)

- Un jugador por navegador, sin servidor y sin juego simultáneo.
- **Modo manual únicamente:** cada época se confirma de forma explícita. SCM: 20 épocas trimestrales (5 años). Logística: 36 épocas mensuales.
- Motor basado en reglas y probabilidades, sin simulación física.
- Persistencia solo en `localStorage`; las corridas se exportan y se envían al profesor.
- Debe ser reproducible (semilla) y verificable por el profesor (*replay*).
- Debe soportar pruebas automatizadas y auto-juego masivo ([casos SCM](../simulador-scm-red/casos-de-prueba.md), [casos logística](../simulador-logistica-ultima-milla/casos-de-prueba.md)).

---

## 2. Arquitectura

### AD-01 ✔ Aplicación estática, 100% en el navegador

- **Decisión:** cada simulador se compila a **un solo archivo HTML autocontenido** (JS y CSS en línea, sin llamadas de red en tiempo de ejecución).
- **Razón:** se puede abrir desde GitHub Pages, subir a Canvas como archivo o abrir localmente sin internet. No hay servidor que mantener ni datos de alumnos fuera del navegador.
- **Descartado:** backend con base de datos (contradice la especificación); librerías por CDN en tiempo de ejecución (fallan sin red o en redes institucionales).
- **Consecuencia:** todas las dependencias van empaquetadas en el build.

### AD-02 ✔ TypeScript + Vite; Preact para la UI

- **Decisión:** TypeScript estricto. Vite con un plugin de archivo único para el build. **Preact** (~4 KB) con *signals* para el estado de la UI.
- **Razón:** el motor tiene muchas fórmulas y estructuras; los tipos evitan errores silenciosos en los KPIs. Preact da componentes sin el peso de React. Vite da desarrollo rápido y build de archivo único.
- **Descartado:** JS sin tipos (riesgo alto en el motor); React (más pesado sin beneficio aquí); frameworks con SSR (innecesarios).

### AD-03 ✔ Separación en tres capas

```
┌────────────────────────────────────────────────────────────┐
│ UI (Preact) — setup, decisiones, dashboard, mensajes,      │  depende de ↓
│ comparador, reporte. Sin lógica de negocio.                │
├────────────────────────────────────────────────────────────┤
│ Modelo del simulador (scm | lastmile) — escenarios,        │  depende de ↓
│ decisiones, fórmulas, reglas R-xx, eventos X-xx, KPIs K-xx │
├────────────────────────────────────────────────────────────┤
│ sim-core — PRNG, bucle de épocas/ticks, motor de reglas y  │  sin DOM
│ eventos, log causal, validación, persistencia, export,     │
│ replay, puntaje genérico                                   │
└────────────────────────────────────────────────────────────┘
```

- **Razón:** el motor (core + modelo) corre **sin navegador** en Node para pruebas, auto-juego y *replay*. La UI solo llama a la API del motor.
- **Consecuencia:** el core y el modelo no pueden importar nada del DOM. Una regla de lint lo verifica.

### AD-04 ✔ Estructura de carpetas

```
mt4035/
├── simuladores-comun/
│   ├── decisiones-arquitectura-ui.md      ← este documento
│   ├── core/                              ← paquete @mt4035/sim-core (TS, sin DOM)
│   ├── ui-kit/                            ← componentes Preact compartidos
│   └── tools/                             ← CLI: autoplay, replay, agregador del profesor
├── simulador-scm-red/
│   ├── especificacion.md · casos-de-prueba.md
│   └── app/                               ← modelo SCM + UI específica + params + pruebas
└── simulador-logistica-ultima-milla/
    ├── especificacion.md · casos-de-prueba.md
    └── app/                               ← modelo lastmile + UI específica + params + pruebas
```

- **Decisión:** cada `app/` tiene su `package.json` y depende de `core` y `ui-kit` por ruta local (`"file:../../simuladores-comun/core"`). No se usa un monorepo con workspaces.
- **Razón:** el repositorio es principalmente documental. Así se evita poner un `package.json` raíz en `mt4035/` y cada simulador se puede compilar por separado.
- **Consecuencia:** `node_modules/` y `dist/` se agregan al `.gitignore` cuando empiece la implementación.

### AD-05 ✔ Contrato del motor: funciones puras sobre un estado inmutable

```ts
createGame(config: SetupConfig, params: Params): GameState
validateDecisions(state, decisions): ValidationResult      // rangos, dependencias, reversibilidad
applyDecisions(state, decisions): GameState                // registra capex y proyectos con retraso
runEpoch(state): { state: GameState; report: EpochReport } // ticks internos → KPIs, reglas, eventos
finalReport(state): FinalReport                            // puntaje, trayectoria, resumen
```

- El estado es un objeto serializable (JSON) y nunca se muta: `runEpoch` devuelve uno nuevo.
- Un **modelo** implementa una interfaz común: `initState`, `decisionSchema`, `tick`, `aggregateKPIs`, `rules[]`, `events[]`, `scoreWeights`.
- **Razón:** facilita las pruebas (entrada → salida), el *replay*, la función "deshacer antes de confirmar" y comparar corridas.

### AD-06 ✔ Aleatoriedad con números aleatorios comunes

- **Decisión:** PRNG con contador basado en hash (*splitmix64* o *Philox*). Cada número se deriva de `(semilla, subsistema, época, tick, entidad)`. Los subsistemas son: demanda, tráfico, eventos, proveedores, clientes.
- **Razón:** si el jugador cambia una decisión, **los sorteos de los demás subsistemas no se recorren**. Así, dos corridas pareadas con la misma semilla difieren solo por el efecto de la decisión. Es indispensable para las pruebas causales (CAU) y para que el comparador de corridas sea justo.
- **Descartado:** un PRNG secuencial único (*mulberry32* global). Cualquier decisión que consuma un número de más desplaza todos los sorteos siguientes.

### AD-07 ✔ Reglas y eventos como catálogos de datos + funciones

```ts
type Rule  = { id: "R-01"; when(ctx): boolean; apply(ctx): Effect[]; explain(ctx): Driver[] }
type Event = { id: "X-01"; pBase(scn, period): number;
               modifiers: { when(ctx): boolean; factor: number; label: string }[];
               impact(ctx, severity): Effect[]; message(ctx): Message }
```

- Los IDs coinciden **exactamente** con los de la especificación (R-xx, X-xx, K-xx, D-xx, E-xx).
- **Razón:** trazabilidad entre especificación, código, pruebas y mensajes al alumno.

### AD-08 ✔ Log causal obligatorio (explicabilidad)

- Cada tick registra los *drivers* que movieron cada KPI: cambios de decisión, eventos, reglas y tendencias de escenario, con sus valores.
- La UI usa el log para el "¿Por qué pasó esto?". Las pruebas lo usan para medir la cobertura de explicabilidad (SCM-AUT-14, LOG-AUT-16: ≥ 95%).

### AD-09 ✔ Parámetros externos y versionados

- Todas las constantes de calibración viven en `app/params/params.v<N>.json`, con un esquema validado.
- Cada exportación guarda `simVersion` (semver del código) y `paramsVersion`.
- **Razón:** la calibración vía auto-juego cambia parámetros sin tocar código, y el *replay* sabe con qué versión correr.
- **Consecuencia:** cambiar `params` sube `paramsVersion` y regenera los *golden runs* (AD-15).

### AD-10 ✔ Validación con esquemas

- Se usa **zod** para el esquema de decisiones (rangos, opciones, dependencias tipo "CPFR requiere POS compartido"), para los parámetros y para los JSON importados.
- El mismo esquema genera metadatos para la UI (AD-21).

### AD-11 ✔ Persistencia

- Hay una interfaz `Storage` con dos implementaciones: `localStorage` (por omisión) y memoria (respaldo).
- Claves: `mt4035.scm.runs.v1` y `mt4035.lastmile.runs.v1`. Cada lectura y escritura va en `try/catch`. Si falla (modo privado, iframe de Canvas con almacenamiento bloqueado), el juego sigue en memoria y muestra un aviso persistente: "Exporta tu corrida antes de cerrar".
- Se guarda automáticamente al confirmar cada época.
- **Migraciones:** cada registro guarda la versión de esquema; las versiones viejas se migran al cargar o se marcan como de solo lectura.

### AD-12 ✔ Exportación, checksum y replay

- **JSON:** configuración, semilla, versiones, decisiones por época, KPIs, eventos y checksum SHA-256 (WebCrypto).
- **CSV:** KPIs por época (y por zona en logística).
- El checksum detecta alteraciones accidentales, **no** es seguridad: un alumno podría recalcularlo. La verificación real es el **replay**: la herramienta del profesor vuelve a correr la semilla con las decisiones y compara los KPIs.
- **Consecuencia:** se conservan los builds de cada `simVersion` publicada (tags de git) para poder repetir corridas viejas.

### AD-12b ✔ Notas de implementación de F1 (3-oct-2026)

- **Validación de dependencias:** la vista de validación expone `effective(id)` (incluye el cambio que se valida) y `previous(id)` (valor anterior: pendiente o vigente). Las restricciones "solo ampliar" o "no revertir" usan `previous`.
- **Orden dentro del tick:** eventos → `model.tick()` → reglas. El efecto de una regla sobre el estado se ve desde el tick siguiente.
- **Eventos:** `pBase` es probabilidad por época; el motor la convierte a probabilidad por tick para que P(≥1 ocurrencia en la época) = p. Un mismo evento no se apila mientras está activo.
- **Replay entre navegadores:** se compara con tolerancia relativa 1e-9 porque `Math.exp/log/cos` puede variar en el último bit entre motores de JavaScript.
- **Paquete:** `exports` apunta a las fuentes TypeScript (`src/index.ts`); las apps de Vite y Vitest las compilan directamente, sin paso de build propio del core.

### AD-12c ✔ PRNG reforzado (F2, 3-oct-2026)

La prueba Monte Carlo de eventos de F2 detectó un leve sesgo en la cola baja del PRNG: z = 2.1 en P(u < 0.0016) con 1.3 millones de muestras. Cada sorteo ahora usa dos claves independientes y un doble finalizador de MurmurHash3, y la cola queda en z = −0.25. El cambio altera las secuencias aleatorias, así que las corridas exportadas antes de este cambio no se pueden repetir con exactitud. No hubo corridas publicadas.

### AD-13 ✔ Herramientas de línea de comandos (`simuladores-comun/tools`)

**Implementación (F3):** `@mt4035/sim-tools` es una librería genérica: runner paralelo con `worker_threads`, reporte de coherencia y búsqueda BOT-H. Cada simulador tiene su adaptador y su CLI en `app/autoplay/`, ejecutado con `tsx`. En Node 20 los procesos de trabajo registran `tsx` con un arranque `.mjs`, porque no lo heredan con `--import`. El motor ya no clona el historial completo en cada época (antes el costo era cuadrático): una partida SCM bajó de ~180 ms a ~65 ms.

| Comando | Función |
|---|---|
| `autoplay --sim scm --bots A,B,C --seeds 200 --scenario all` | Corre los bots de referencia y genera el **reporte de coherencia** (Markdown + JSON) con las propiedades AUT y las alarmas de calibración |
| `replay corrida.json` | Verifica una corrida exportada y muestra el diff |
| `aggregate carpeta/` | Junta las corridas del grupo en un CSV resumen para el profesor |
| `sweep --param k --range ...` | Barridos de sensibilidad (formas de U, óptimos interiores) |

### AD-14 ✔ Rendimiento

- Presupuesto: < 50 ms por época en el navegador; 10,000 corridas de auto-juego en < 10 min en Node.
- El cálculo corre en el hilo principal. Si una época supera 100 ms, se mueve a un Web Worker; la API pura de AD-05 lo permite sin cambios.

### AD-15 ✔ Estrategia de pruebas

| Nivel | Herramienta | Cubre |
|---|---|---|
| Unitarias de fórmulas | Vitest 4 (Vitest 5 exige Node 22; el entorno usa Node 20) | §6.3 de cada especificación |
| Propiedades | Vitest + **fast-check** | Invariantes (INV) y matriz de signos |
| Pareadas causales | Vitest + números aleatorios comunes (AD-06) | CAU, REG |
| Monte Carlo | Vitest, suite `test:mc` con semillas fijas 1…N | EVT y frecuencias. **Deterministas**, sin pruebas intermitentes |
| Golden runs | Snapshots JSON de las corridas *as-is* por escenario | Detectan cambios involuntarios |
| Auto-juego | `tools/autoplay` | AUT y reporte de coherencia |
| UI | Pruebas de componentes y un flujo completo *end-to-end* con Playwright | Máquina de estados, confirmación, exportación |

- **CI (GitHub Actions):** unitarias, propiedades, pareadas y golden en cada push. Monte Carlo y auto-juego se corren manualmente o cada noche.

### AD-16 ✔ Publicación

- Una GitHub Action compila los dos `dist/index.html` y los publica en **GitHub Pages** del repositorio.
- Los HTML también se pueden descargar para subirlos a Canvas o abrirlos sin conexión.
- El repositorio es **público**: los simuladores solo contienen empresas y regiones ficticias. El material con copyright de `mt4035/references/` (casos Kellogg/Ivey, libros) **nunca** se importa ni se empaqueta.

### AD-17 ✔ Privacidad

- No hay analítica, cookies ni telemetría. El nombre del jugador es opcional y solo viaja dentro del JSON que el alumno decide exportar.

---

## 3. UI y experiencia

### AD-20 ✔ Máquina de estados de la partida

```
SETUP → DISEÑO_INICIAL (época 0) → DECIDIENDO ⇄ (deshacer) → CONFIRMANDO → SIMULANDO → REVISIÓN → DECIDIENDO … → FINAL
```

- **Confirmar** abre un resumen con el diff de decisiones, el costo inmediato, los proyectos con retraso y una advertencia para las decisiones irreversibles, que piden una segunda confirmación.
- No hay botón "correr todo": el modo es manual (especificaciones §3).
- Hasta confirmar, se puede deshacer y rehacer; después de confirmar, la época queda sellada.

### AD-21 ✔ Panel de decisiones generado desde el esquema

- Cada decisión del esquema zod lleva metadatos: `label`, `ayuda`, `costo`, `retraso`, `reversibilidad`, `dependencias` y `kpisAfectados`. La UI renderiza los controles a partir de ellos.
- **Razón:** una sola fuente de verdad. Agregar una decisión no requiere tocar la UI.
- **Pestañas:**
  - SCM: Red · Flujo · Inventario · Información.
  - Logística: Red · Asignación · Promesa · Flota · Zonas y ruteo · Cliente · Devoluciones · Datos y seguridad.
- **Previsualizador cualitativo:** cada cambio muestra flechas ↑↓ en los KPIs afectados, tomadas de la **matriz de signos** de los casos de prueba (§4.1). El mismo dato alimenta las pruebas de propiedades y la UI; nunca muestra números antes de simular.
- **Proyectos en curso:** línea de tiempo con las decisiones que aún no surten efecto (CD en construcción, curva de aprendizaje de TI, dark store).

### AD-22 ✔ Distribución de pantalla

```
┌──────────────────────────────────────────────────────────────────┐
│ Hoshi Mart · Red River   Época A2-T3   Caja   Proyectos (2)   ⚙   │
├───────────────┬──────────────────────────────────┬───────────────┤
│ Decisiones    │ Dashboard                        │ Mensajes (3)  │
│ [pestañas]    │ Tarjetas de KPI con semáforo     │ ● Crítico ... │
│               │ Gráficas de trayectoria          │ ▲ Alerta ...  │
│               │ Frontera servicio–costo          │ ○ Info ...    │
│ [Confirmar]   │ Waterfall de costo · Mapa        │ [¿Por qué?]   │
└───────────────┴──────────────────────────────────┴───────────────┘
```

- **Escritorio** (el uso principal es en laptop): tres columnas.
- **Pantallas angostas** (≥ 360 px): pestañas Decisiones / Dashboard / Mensajes, sin scroll horizontal.

### AD-23 ✔ Dashboard

- **Tarjetas de KPI:** valor, tendencia contra la época anterior y estado frente al guardrail. El estado se comunica con **ícono + texto + color** (no solo color).
- **Pares primario–guardrail** visibles juntos (§7.2 de cada especificación).
- **Gráficas** (Chart.js empaquetado):
  - trayectoria de cada KPI con la banda del guardrail;
  - **frontera servicio–costo** (SCM: OSA vs. CTS; logística: OTD vs. CPD) con las corridas previas del jugador;
  - waterfall de costo;
  - tablas por zona o categoría.
- **Mapa esquemático en SVG** propio: rejilla, *clusters* o zonas, nodos y flujos. Es ilustrativo, no geográfico.
- En logística, el modo de reporte promedio/p95 lo controla la decisión D-61; el reporte final muestra siempre ambos.

### AD-24 ✔ Bandeja de mensajes

- Tres niveles de severidad (Info, Alerta, Crítico), con filtros, fecha simulada y enlace al KPI afectado.
- **"¿Por qué pasó esto?"** despliega la cadena causal del log (AD-08) con valores concretos. Muestra qué decisiones del jugador agravaron o mitigaron el evento y qué mitigaciones existían. Ejemplo: *"Ruta media 3.4 h (R-01) + ola de calor (X-12) + hieleras en lugar de refrigerado (D-32)"*.

### AD-25 ⚠ Visibilidad del puntaje

- **Propuesta:** durante el juego solo se muestran los KPIs y el puntaje se revela en el reporte final. La opción `showScoreDuringGame` queda configurable por el profesor.
- **Razón:** evitar que el alumno juegue a optimizar la métrica en lugar de razonar las decisiones. Está pendiente en las dos especificaciones (§13).

### AD-26 ✔ Comparador y reporte final

- **Comparador:** 2–4 corridas guardadas; KPI por KPI, superpuestas en las gráficas, con el diff de decisiones por época.
- **Reporte final:** scorecard, trayectoria completa, decisiones clave, eventos enfrentados y comparación contra la estrategia declarada. Tiene una hoja de estilos para imprimir a PDF.

### AD-27 ✔ Modo profesor (oculto)

- Se activa con un parámetro de URL (`?profesor=1`). Permite:
  - importar varios JSON para comparar o hacer *replay*;
  - forzar eventos para demostraciones en clase;
  - fijar la semilla del grupo;
  - activar `showScoreDuringGame`.
- No es un mecanismo de seguridad, solo de conveniencia.

### AD-28 ✔ Idioma, formato y estilo

- Interfaz en **español**. Los KPIs llevan su **sigla en inglés** con nombre y fórmula en un *tooltip* (convención del curso).
- Formato numérico `es-MX`. **Moneda única USD** en ambos simuladores, incluso en Kaigan, para comparar regiones.
- **Tokens de diseño en CSS:** paleta neutra y un color de acento por empresa (Hoshi Mart: azul noche; Mercado Alba: naranja amanecer). Modo oscuro con `prefers-color-scheme`.
- **Accesibilidad:** navegación por teclado, foco visible, contraste AA y textos alternativos en gráficas (tabla de datos accesible).

### AD-28b ✔ Notas de implementación de F4 (4-oct-2026)

- **Dependencias del ui-kit:** Preact, Chart.js y zod son *peer dependencies* resueltas desde la app (`resolve.dedupe` en Vite y `paths` en TypeScript) para que haya una sola copia.
- **Panel de decisiones:** lee la estructura de los esquemas zod 4 (`type`, `options`, `minValue`/`maxValue`, `shape`). Los grupos de botones no van dentro de `<label>`: un `<label>` se asocia a su primer control y un clic en el texto elegía siempre la primera opción.
- **Proyectos en curso:** incluyen las decisiones con retraso del motor y los CD en obra, conversión o ampliación, cuyo retraso maneja el modelo por CD. El diálogo de confirmación indica cuándo opera cada CD.
- **JSON de parámetros:** se importa con `with { type: "json" }` para que el modelo también cargue en Node ESM (Playwright, tsx).
- **Guardado:** se guarda la exportación (semilla + decisiones) y, al continuar, la partida se reconstruye por replay (~65 ms).

### AD-29 ✔ Etiquetas de época

- SCM: `A1-T1 … A5-T4`. Logística: `A1-M01 … A3-M12` con el nombre del mes y marcadores de temporada pico en la línea de tiempo.

---

## 4. Ruta de implementación

| Fase | Entregable | Criterio de salida |
|---|---|---|
| **F0** ✔ | Especificaciones, casos de prueba y este documento | Publicados en el repo |
| **F1** ✔ | `sim-core`: PRNG con números aleatorios comunes, contrato del motor, reglas y eventos, log causal, persistencia, export y replay + arnés de pruebas ([core/README.md](./core/README.md)) | INV genéricas en verde; replay idéntico. Cumplido el 3-oct-2026: 65 pruebas (64 rápidas + 1 Monte Carlo) |
| **F2** ✔ | Modelo SCM (sin UI) + `params.v1` ([app/README.md](../simulador-scm-red/app/README.md)) | Casos SCM P1 en verde. Cumplido el 3-oct-2026: 56 pruebas (52 rápidas + 4 Monte Carlo) |
| **F3** ✔ | Auto-juego SCM y calibración ([tools/README.md](./tools/README.md), [reporte](../simulador-scm-red/app/autoplay/reports/latest.md)) | Reporte de coherencia sin alarmas P1. Cumplido el 4-oct-2026: P1 y P2 de auto-juego en verde, más 84 pruebas SCM (P1, P2 y P3) |
| **F4** ✔ | UI SCM ([ui-kit/README.md](./ui-kit/README.md), [app/README.md](../simulador-scm-red/app/README.md)) | Flujo *end-to-end* de 20 épocas + exportación. Cumplido el 4-oct-2026: 7 pruebas de punta a punta en Chromium (partida completa con replay del JSON exportado, CD irreversible, validación, recarga, sin `localStorage`, móvil 360 px, modo profesor) y 4 de componentes |
| **F5** | Modelo logística + `params.v1` | Casos LOG P1 en verde |
| **F6** | Auto-juego logística y calibración (incluye el fixture del mini-caso de S5) | Reporte sin alarmas P1 |
| **F7** | UI logística | Flujo *end-to-end* de 36 épocas |
| **F8** | Publicación en GitHub Pages + piloto con un grupo pequeño | Feedback incorporado antes de S4 (15-oct-2026) y S5 (5-nov-2026) |

⚠ Prioridad sugerida: SCM primero, porque se usa antes en el calendario (S4).

---

## 5. Decisiones pendientes

- [ ] AD-25: visibilidad del puntaje durante el juego.
- [ ] Normalización del puntaje por región o territorio (SCM-SCO-05, LOG-SCO-05). En SCM está implementada como propuesta (rangos y guardrails por región en `params.v1.json`, especificación §6.3b); falta confirmarla.
- [ ] Duración objetivo de una partida (20 y 36 épocas manuales): ¿solo en clase o clase + casa?
- [ ] Confirmar GitHub Pages como canal de publicación frente a solo subir el archivo a Canvas.

---

[← Simulador SCM](../simulador-scm-red/especificacion.md) · [Simulador Logística](../simulador-logistica-ultima-milla/especificacion.md)
