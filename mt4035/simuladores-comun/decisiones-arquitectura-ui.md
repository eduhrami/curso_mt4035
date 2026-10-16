# Simuladores MT4035 — Decisiones de arquitectura y UI

**Aplica a:** [Simulador SCM + Diseño de red](../simulador-scm-red/especificacion.md) (S4) y [Simulador Logística y Última Milla](../simulador-logistica-ultima-milla/especificacion.md) (S5).
**Estado:** v0.1. Las decisiones marcadas **✔** están tomadas; las marcadas **⚠** son propuestas pendientes de confirmar con el profesor.
**Formato:** registro de decisiones (*AD-xx*) con decisión, razón, alternativas descartadas y consecuencias. Si una decisión cambia, se edita la entrada y se anota la fecha. No se crean entradas duplicadas.

---

## 1. Restricciones de partida (vienen de las especificaciones)

- Un jugador por navegador, sin servidor y sin juego simultáneo.
- **Modo manual únicamente:** cada época se confirma de forma explícita. SCM: 12 épocas trimestrales (3 años). Logística: 36 épocas mensuales jugadas en 12 turnos trimestrales (AD-34). Ambos duran 12 trimestres (AD-37).
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
- Implementación (F8): la rama huérfana `gh-pages` contiene `scm/index.html`, `ultima-milla/index.html` (los `dist/index.html` de cada app), la portada `index.html` y `.nojekyll`. La portada (enlaces a ambos simuladores, profesores y nota de entrega) se versiona en [`portada/index.html`](./portada/index.html); al republicar se copia junto con los simuladores. Si la versión de la portada cambia, se actualiza ahí primero.
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

- **Escritorio** (el uso principal es en laptop): tres columnas. Anchos (5-oct-2026, ampliados porque los controles de decisión no cabían): decisiones 450–570 px, dashboard flexible, mensajes 220–280 px; entre 761 y 1100 px, dos columnas (decisiones 380–510 px + dashboard) con mensajes debajo. La barra superior es compacta para caber en una línea desde 1280 px.
- **Mapas:** en SCM cada celda lleva una etiqueta «Z#» en color de acento y el número de tiendas en grande (abajo a la derecha); en última milla, cada zona tiene etiqueta y borde de color según su tipo (urbana, periferia, ciudad foránea, rural) y el número de tiendas en grande.
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

- SCM: `A1-T1 … A3-T4`. Logística: `A1-M01 … A3-M12` con el nombre del mes y marcadores de temporada pico en la línea de tiempo.

### AD-30 ✔ Escenarios de mercado predefinidos (5-oct-2026)

- El setup ya no muestra el panel libre de condiciones de mercado como opción principal: ofrece cuatro fichas **EM-01…EM-04** por simulador (perfil completo + concepto de clase + región sugerida; ni los ids EM-xx ni la semilla se muestran en la ficha: la semilla se llena sola en «Jugador y semilla» y su uso se explica en la guía del instructor). El panel libre queda bajo «Crear mi propio escenario» (`<details>`).
- Componente compartido `ScenarioPicker` en `ui-kit/src/components/scenarios.tsx`; los datos viven en el modelo de cada simulador (`app/src/presets.ts`, `PRESETS` y `presetOf`) para que pruebas y herramientas los usen sin la UI.
- Elegir una ficha fija el perfil y la semilla; la corrida guarda `scenario.preset`. El campo es opcional y el motor no lo lee, así que el replay y las corridas anteriores no cambian. `presetOf` solo acepta el id si el perfil coincide, y reconoce corridas viejas por perfil.
- El escenario se muestra en la barra superior, el reporte final y una fila «Escenario (semilla)» del comparador, para detectar corridas no comparables.

### AD-31 ✔ Debrief obligatorio al final de la partida (5-oct-2026)

- El reporte final termina con `DebriefPanel` (`ui-kit/src/components/debrief.tsx`): nombre y concepto del escenario, notas de «qué revisar en tu corrida» (antes «qué observar» en las fichas) y seis preguntas DB-01…DB-06. DB-05 depende del escenario. Las preguntas viven en el modelo (`app/src/debrief.ts`, `debriefFor`).
- El store (`debriefQuestions`, `debrief`, `debriefComplete`) guarda el borrador con la corrida en `localStorage` al salir de cada campo y lo restaura al cargarla. Mínimo de 60 caracteres por respuesta.
- El botón «Exportar corrida con debrief (JSON)» del reporte final se habilita solo con el debrief completo. El «Exportar JSON» de la barra superior se oculta al terminar la partida para que no haya otra vía de exportación sin debrief.
- `RunExport.debrief` (`{ complete, answers[{ id, question, answer }] }`) es opcional en el esquema, lo cubre el checksum y el replay lo ignora. `aggregate` lo agrega como columnas `debrief_completo` y `debrief_DB-xx`.
- Guías del instructor por simulador: introducción a la práctica y rúbrica de las preguntas. Viven en el repositorio privado `eduhrami/curso_mt4035-privado` (14-oct-2026), no en el público.

### AD-32 ✔ Glosario y definiciones al pasar el mouse (5-oct-2026)

- Cada simulador define su glosario en `app/ui/glossary.ts` (sigla, nombre completo en inglés cuando aplica, definición, alias y categoría) y lo provee con `GlossaryContext.Provider` en `App`.
- `GlossaryDialog` (ui-kit, `components/glossary.tsx`): diálogo con todas las entradas agrupadas por categoría y búsqueda sin acentos. Se abre desde el botón «Glosario» de la barra superior (siempre visible) y desde el texto del inicio.
- `Gloss` marca en un texto la primera aparición de cada término con `<abbr class="gloss" title="…">` (subrayado punteado, cursor de ayuda). Coincidencia sin distinguir mayúsculas y sin letras pegadas, con el término más largo primero. Se usa en etiquetas y ayudas de decisiones, mensajes, confirmación, fichas de escenario, debrief, inicio y reporte final.
- Donde no cabe marcado (botones de opción, `<select>`, chips «Mueve:» y tarjetas de KPI), `glossaryTitle` agrega las definiciones al atributo `title`.
- Limitación: en pantallas táctiles no hay *hover*; el glosario completo cubre ese caso.
- Créditos del curso en el inicio: `CourseCredits` (ui-kit, `components/credits.tsx`) con los profesores y sus perfiles públicos.

### AD-33 ✔ Pronóstico de demanda con datos históricos (última milla, 13-oct-2026)

- **Proceso oculto:** cada partida sortea con la semilla nivel, crecimiento (rango continuo según E-20), índices semanales, quincena, magnitud típica de cada pico con variación anual y CV del ruido diario (`app/src/forecast.ts`, `drawTruth`). La demanda del mercado por día y zona es una función determinista de la semilla (`marketByZone`), así que el CSV de datos se regenera igual en el replay y no se guarda en el estado.
- **Datos:** CSV con 2 años de historia y los meses jugados (`demandCsv`), descargable desde la pestaña «Pronóstico». Las fichas, los textos del inicio y los mensajes de tendencia ya no revelan el volumen, el crecimiento ni la magnitud de los picos.
- **Decisión F-01:** el pronóstico es una decisión más (esquema zod, editor propio `ForecastEditor`), válida solo en enero y para el año en curso; queda en el registro de decisiones, se exporta y se reproduce. La UI no deja confirmar enero sin capturarlo; el motor, sin captura, usa un pronóstico nominal (pruebas y bots).
- **Acoplamiento con la operación:** el pronóstico dimensiona el 3PL (con holgura por CV y compromiso mínimo pagado), el contrato anticipado de picos y la capacidad publicada. La necesidad reactiva del mes anterior (`baseNeed`) deja de usarse para contratar.
- **Puntaje:** `scoreRun` devuelve operación, pronóstico y final = 70/30 (`params.forecast.score`). La calidad por año se calcula con sumas mensuales en los KPIs `FC_*`; el WAPE se califica sobre el error del pronóstico perfecto (`FC_ORACLE`), para no castigar el ruido de la partida.
- **Pruebas:** las de mecanismos usan pronóstico perfecto (`truthForecast` en el helper `start`); `test/forecast.test.ts` cubre LOG-FC; los bots de auto-juego pronostican perfecto salvo BOT-L (nominal), y LOG-AUT-17 exige que pronosticar bien pague. `params` pasa a `p2` y el simulador a 0.2.0: las corridas exportadas con `p1` ya no se reproducen idénticas.

### AD-34 ✔ Turno trimestral y utilidad como puntaje (última milla, 13-oct-2026)

- **Turno ≠ época:** el motor sigue con 36 épocas mensuales y ticks diarios (eventos, retrasos, picos, KPIs y pruebas sin cambios). El store del ui-kit acepta `epochsPerTurn`: una confirmación aplica las decisiones en la primera época y corre hasta la siguiente época múltiplo del turno. Última milla usa 3 → 12 turnos (A1-T1 … A3-T4). El registro de decisiones solo tiene épocas 0, 3, 6…, así que el replay es el mismo de siempre. SCM no cambia (turno = época).
- La UI muestra el turno (`turnLabel`, `turnOf`), la bandeja de mensajes muestra el último trimestre (`lastCount`) y el pronóstico F-01 se captura en el primer trimestre de cada año.
- **Utilidad:** KPIs mensuales del estado de resultados (`GROSS_MARGIN`, `FEES`, `LAST_MILE_COST`, `REFUNDS`, `LATE_COST`, `PROFIT_OP`, `CAPEX`, `PROFIT`). Para el capex, el `EpochContext` del núcleo expone ahora el `ledger` de la época (cambio compatible: SCM no lo usa). La compensación por retraso solo entra a la utilidad, no al CPD ni al margen del canal.
- **Puntaje definitivo:** utilidad acumulada en USD (`scoreRun(...).profit`, `finalScore` de la exportación). El índice 0–100 (70% operación + 30% pronóstico) queda como referencia en el reporte final.

### AD-35 ✔ Pronóstico de demanda con datos históricos en SCM (13-oct-2026)

- Misma lógica que AD-33 (última milla), adaptada a semanas y trimestres: proceso de demanda por tienda oculto por partida (nivel, crecimiento continuo según E-20, forma estacional por trimestre con amplitud según E-21, choque semanal común con CV según E-22), CSV de 104 semanas de historia + semanas jugadas, decisión F-01 en T1 de cada año (A1…A3) con editor propio y bloqueo de la confirmación.
- **Acoplamiento:** el pronóstico fija el inventario objetivo y el stock de seguridad de las tiendas (μ·k y SS·k·razón de CV, z efectivo para el fill rate). Con pronóstico perfecto el inventario es idéntico al del modelo anterior. La estacionalidad sinusoidal semanal pasa a índices trimestrales.
- **Puntaje:** 70% operación + 30% pronóstico (`scoreRun` devuelve operación, pronóstico y total). SCM sigue con turno = época y no tiene aún métrica de utilidad como puntaje definitivo.
- Pruebas `test/forecast.test.ts` (SCM-FC), helper `start` con pronóstico perfecto, BOT-L y SCM-AUT-15. `params` p2 y simulador 0.2.0.

### AD-36 ✔ Utilidad con guardrails de servicio y peso del pronóstico (ambos simuladores, 13-oct-2026)

- **Criterio:** la utilidad acumulada es el puntaje definitivo en los dos simuladores (SCM: EBITDA logístico − capex y cargos − penalizaciones; última milla: §7.5). El índice 0–100 queda como diagnóstico. Razón: es lo que evalúa una dirección real e integra pronóstico, capex, merma y flota ociosa sin pesos arbitrarios.
- **Guardrails de servicio:** para que no se gane sacrificando al cliente y para que la estrategia declarada siga importando, cada periodo con un guardrail de servicio de la estrategia roto resta un % de las ventas del periodo (`money.serviceGuardrails`, `servicePenaltyShare`; umbrales = guardrails calibrados por región o territorio + ajuste por estrategia). `serviceGuardrails()` en `score.ts`.
- **Economía del pronóstico:** ambos errores cuestan de forma realista y sin que convenga inflar el pronóstico. SCM: de menos, la disponibilidad cae en proporción al error (amortiguado por el POS diario); de más, rebajas sobre lo comprado de más. Última milla: compromiso del 3PL sobre la necesidad pronosticada, flota spot de último momento, personal de surtido planeado con el pronóstico.
- **Peso del pronóstico:** `npm run forecast-impact` (auto-juego) mide qué parte de la brecha de utilidad entre la operación inicial y la mejor encontrada se explica por pronosticar bien. Promedio ≈ 59% en SCM (Kaigan ≈ 94%, Red River ≈ 39%, Valle ≈ 45%) y ≈ 28% en última milla (Megalópolis ≈ 21%, Bajío ≈ 38%, Norte ≈ 26%). No se fuerza por región: en qué casos pesa más es parte del aprendizaje.

### AD-37 ✔ Horizonte homologado: 12 trimestres en ambos simuladores (14-oct-2026)

- **Criterio:** las dos partidas duran 3 años = 12 trimestres que el jugador confirma. SCM: 12 épocas trimestrales (`A1-T1 … A3-T4`, 156 semanas); última milla: 36 meses del motor en 12 turnos trimestrales (AD-34). Razón: la misma duración y el mismo ritmo de juego en clase (≈4 min por turno) y utilidades acumuladas sobre el mismo horizonte.
- **Implementación SCM:** `params.epochs = 12` (como en última milla); el motor, la UI, el auto-juego y las pruebas leen `EPOCHS`/`YEARS` de `src/model.ts`. Pronóstico F-01 en A1-T1, A2-T1 y A3-T1. `SIM_VERSION` 0.3.0: las exportaciones de 20 épocas ya no se reproducen.
- **Calibración:** el auto-juego de 200 semillas con búsqueda sigue sin alarmas P1 y con todas las propiedades SCM-AUT en verde; el diseño adaptado sigue superando a la operación inicial en utilidad en las tres regiones (§7.6).

### AD-38 ✔ Estrategia fija durante toda la partida (ambos simuladores, 14-oct-2026)

- **Criterio:** la propuesta de valor (SCM) o la estrategia de servicio (última milla), D-00, se elige en el setup y no se puede cambiar durante la partida. Razón: el equipo debe vivir con su estrategia; el aprendizaje es alinear la red y la operación con ella, no cambiarla cuando los KPI no favorecen.
- **Implementación:** D-00 dejó de ser una decisión del motor (sin pestaña «Estrategia» ni `strategyChangePenalty`); el motor rechaza un cambio como decisión desconocida. La estrategia vive en el escenario de la partida (`scenario.strategy`) y se muestra en la barra superior. SCM-LAG-04 y LOG-LAG-09 lo verifican. `SIM_VERSION` 0.3.0 en ambos simuladores.


### AD-39 ✔ El buscador optimiza la utilidad (sim-tools y SCM, 14-oct-2026)

- **Criterio:** el bot buscador de SCM (BOT-H) maximiza la utilidad acumulada, que es el puntaje definitivo (AD-36), no el índice 0–100. Última milla puede adoptarlo con el mismo gancho; por ahora su buscador (BOT-I) sigue con el índice. Las propiedades de coherencia siguen en puntos del índice. `sim-tools` acepta un objetivo opcional del adaptador (`searchScore`, `searchScoreLabel`) y lo usa el buscador; sin él, usa `score`.
- **Búsqueda más robusta:** varios arranques (`multiStart` y `starts`, que en SCM incluyen diseños con 4 y 8 CD nuevos) y un grupo que explora juntos número y tipo de CD con los cuatro flujos. El ascenso desde la red actual no daba el salto «construir CD + mover flujos» y se quedaba en óptimos locales.
- **CSL de frescos aparte (SCM):** el espacio de búsqueda separa el CSL de frescos del de las demás categorías. En perecederos, más stock de seguridad que la vida de anaquel aguanta se vuelve merma (R-02), así que un CSL único arrastraba a todas las categorías.
- **`profitFor` (SCM):** la propuesta de valor solo entra a la utilidad por las penalizaciones de servicio, así que una corrida evalúa las tres propuestas (SCO-07).
- **Red de referencia por escenario:** `npm run network-optima` parte de los óptimos del buscador, refina la ubicación de los CD (mover, quitar o agregar uno a la vez) y repite el ascenso en cada escenario predefinido con su semilla.
- **Reportes privados:** los reportes de auto-juego contienen los óptimos de cada escenario, así que se escriben en el repositorio privado (`app/autoplay/reports-dir.ts`) y no en el público.

### AD-40 ✔ El POS se paga en dos años (SCM, 14-oct-2026)

- **Criterio:** el sistema de información de tienda (D-30) debe recuperar su inversión en ≤ 8 trimestres sobre la operación óptima de Red River y Valle, con el error de pronóstico de un equipo típico (±10%).
- **Parámetros:** POS diario: capex US$ 1,500 por tienda, opex US$ 10 por tienda-semana, CV ×0.75, 1 trimestre de implantación; con terminal: US$ 4,000, US$ 20, CV ×0.6, 2 trimestres; madura en un trimestre (antes US$ 3,000/8,000, US$ 20/40, CV ×0.85/0.75, 2–3 trimestres + 2 de aprendizaje).
- **Hallazgo:** con pronóstico perfecto el POS casi no aporta (2–6 M USD en 3 años), porque su valor principal es corregir con las ventas reales el pronóstico equivocado del equipo. Por eso el buscador y la red de referencia juegan con ±10% de error de nivel (`searchForecastError`, paridad de la semilla); los demás bots siguen con pronóstico perfecto.
- **Resultado:** con ±10% de error, el POS se recupera entre el trimestre 2 y el 7 en Red River y Valle, y el buscador lo elige.

### AD-41 ✔ Proveedores como dato del escenario (SCM, 14-oct-2026)

- **Criterio:** los proveedores son externos: el jugador no decide si son dedicados (antes D-07). Cada región trae sus plantas en el mapa (`regions.*.supplierSites`, E-08): Kaigan, planta dedicada de alimentos preparados (zona 12) y planta de lácteos (zona 25); Valle, central de abasto (zona 14) y parque industrial (zona 30); Red River, proveedores fuera de la región.
- **Mecánica:** con planta en la región, Hoshi Mart paga el flete de la planta al CD (`supplier.inboundCostPerCaseKm` × cajas × distancia), y el tránsito se suma al lead time y a la edad de los frescos. En DSD, el reparto sale de la planta. Sin planta, el flete va en el precio. La planta dedicada acorta el lead time (×0.5) y mitiga X-04 y X-09. Nuevo KPI `INBOUND_COST` en el estado de resultados y en el CTS.
- **Decisión del jugador:** cuántos CD y dónde, cerca de las plantas (menos flete de entrada, frescos más jóvenes) o de las tiendas (menos reparto). El mapa dibuja las plantas (◆, rellena = dedicada) y las lista.

### AD-42 ✔ Sin ritmo de apertura o cierre de tiendas (SCM, 14-oct-2026)

- **Criterio:** el ritmo anual de apertura o cierre (antes D-06) es una política, no una decisión. El equipo la ejerce con controles manuales cada trimestre: lotes de apertura (D-08, ubicados según la estrategia de apertura D-05) y cierres por zona (D-09, con indemnización que consume el tope anual).

### AD-43 ✔ Tope de gasto anual en decisiones (SCM, 14-oct-2026)

- **Criterio:** los costos de decisiones de un año tienen un tope por región (`money.capexBudgetPerYear`): Kaigan US$ 20 M, Red River US$ 12 M, Valle US$ 15 M ⚠. Cuentan todas las decisiones con costo: CD nuevos, conversiones, ampliaciones y cierres (indemnización); lotes de apertura y cierres de tiendas; escaneo y POS. Con las redes de referencia, el tope obliga a escalonar en Red River (red regional en dos años) y en Valle (cierres de CD en dos años). En Kaigan deja margen para gastar más de lo que la utilidad justifica: decidir cuánto gastar es parte de la reflexión del alumno.
- **Motor:** `sim-core` admite restricciones del turno completo (`ModelDef.validateTurn(state, costs, params)`), evaluadas después de validar cada decisión con el costo inmediato de cada cambio, y un desglose del costo por tipo de cargo (`DecisionSpec.costs`; D-01 separa inversión e indemnización en el ledger). SCM suma lo gastado en el año (ledger de las épocas del año, fuente `D-xx`) y rechaza el turno que excede el tope con un mensaje que dice cuánto queda. Se renueva en T1. `GameConfig.test.budget: "off"` lo desactiva en las pruebas de mecanismos (SCM-LAG-10 lo prueba activo).
- **UI:** la barra superior muestra «Inversión A#: queda X de Y».
- **Auto-juego (`withBudget`, `app/autoplay/budget.ts`):** el bot invierte como un equipo. Lo que cabe se ejecuta; lo que no, se reintenta en T1 de cada año, cuando el tope se renueva, con prioridad por plazo de impacto: red de CD (cada conversión, cierre o CD nuevo por separado), POS, escaneo, cierres y aperturas de tiendas. Lo de efecto más largo va primero para que se recupere antes de que termine la partida. Lo que depende de algo diferido también se difiere. Un CD que no cabe ni con el tope completo baja de tamaño.
- **Buscador:** al final elige, para cada estrategia, el mejor de todo lo evaluado en la región, incluidos los ascensos de las otras estrategias (una corrida puntúa las tres).
- **SCM-AUT-06 (15-oct-2026):** solo cuentan el número de CD y el CSL de frescos. Las frecuencias se excluyen porque el modelo no tiene un límite de capacidad (flota, choferes, andenes) que haga infactible visitar más veces: una frecuencia en el extremo no indica un problema de calibración.

### AD-44 ✔ Redes iniciales sub-óptimas (SCM, 14-oct-2026)

- **Criterio:** las tres regiones arrancan lejos de su red óptima para que diseñar la red sea la primera decisión. Óptimo estructural medido con la red ya existente desde el inicio (sin sesgo de costo de cierre, ±10% de error de pronóstico): Kaigan 6–12 CD combinados (meseta; el máximo en 10–12), Red River 6–8 CD de inventario chicos, Valle 1–2 CD de inventario chicos.
- **Efecto en el peso del pronóstico:** con redes por diseñar, la operación pesa más en las tres regiones: el pronóstico explica ≈ 41% de la brecha de utilidad (Kaigan 38%, Red River 38%, Valle 47%; spec §7.6).
- **Redes de referencia resultantes** (`network-optima`, con tope): Kaigan construye 1 CD combinado; Red River, 3 CD de inventario chicos en dos años; Valle conserva sus 4 CD con frescura y cierra 2 con bajo costo o conveniencia (la propuesta de valor decide la red).
- **Redes iniciales:** Kaigan 1 CEDIS grande con inventario (AD-52), Red River 1 CEDIS central con inventario (AD-51), Valle 4 CD de inventario medianos heredados de una expansión (sobran y son del tipo equivocado). Con esto, la operación inicial puntúa más bajo (SCO-05 acepta 10–60).

### AD-45 ✔ «¿Cómo impacta?» en lugar de «Mueve:» (ambos simuladores, 14-oct-2026)

- **Criterio:** cada decisión muestra un botón discreto «¿Cómo impacta?» que, al pasar el mouse o con un toque, abre un párrafo con la dirección en que mueve los KPIs y el porqué (recurso didáctico). El texto vive en `labels[id].impact` de cada simulador (`IMPACT` en `app/ui/labels.ts`, alineado con el mapa de decisiones, el diagrama causal y las reglas de cada especificación); ambos simuladores tienen un párrafo por decisión. Sin texto, el panel listaría los KPIs que mueve.

### AD-46 ✔ Sin códigos internos en la interfaz (ambos simuladores, 15-oct-2026)

- **Criterio:** los códigos de la especificación (D-xx, R-xx, X-xx, E-xx, F-01, AD-xx) no significan nada para el alumno: no aparecen en la interfaz ni en el glosario. El ui-kit ya no muestra el código de cada decisión, del diálogo de confirmación ni de los mensajes; la explicación causal de un KPI muestra el nombre de la causa (`causeNames`, `CAUSE_NAMES` en `app/ui/labels.ts` de cada simulador). Los textos nombran la decisión o el concepto. Los códigos siguen en el código, las pruebas, la especificación y la exportación JSON. La prueba de punta a punta del SCM revisa que ninguna pestaña los muestre.


### AD-47 ✔ Solo decisiones con dilema (SCM, 15-oct-2026)

- **Criterio:** una decisión se queda si su mejor opción cambia según la región, la propuesta de valor o el momento, y se pondera contra el tope de gasto y las otras opciones. Un barrido opción por opción sobre la red de referencia mostró decisiones donde la misma opción ganaba en las 9 combinaciones sin costo relevante.
- **Datos fijos de la región:** flota, tipo de vehículo y telemetría, ventana de entrega, mantenimiento de flota y retiro de frescos dejan de ser decisiones. Toman el valor inicial de la región y se trabajan en el simulador de última milla.
- **Nivel de servicio por la estrategia:** el CSL por categoría lo fija la propuesta de valor (`params.strategyCsl`). La disponibilidad real puede quedar abajo de la meta.
- **Binarias con costo:** compartir POS es sí o no, con implementación (consume el tope) y opex por tienda. El pronóstico del sistema de tiendas es básico (promedios móviles) o avanzado (Holt-Winters con variables causales y equipo de analítica: implementación y costo fijo semanal). Ambas convienen solo en algunas regiones o propuestas.
- **Se queda:** la capacitación, porque cambia el resultado en Kaigan (con *tanpin kanri*).
- **Auto-juego:** como la estrategia cambia la operación (CSL), `sim-tools` admite `perStrategyRuns`: cada estrategia se juega en su propia partida y se califica con ella (`config(scenario, seed, strategy)`). Se retiró `profitFor`. SCM-AUT-06 evalúa solo el número de CD. La validación cuesta el triple.

### AD-48 ✔ CPFR como mejora con momento óptimo (SCM, 15-oct-2026)

- **Criterio:** todas las regiones parten de RMI (*Retailer-Managed Inventory*): el minorista pronostica y repone. CPFR es la mejora: suma el pronóstico del proveedor. VMI sale del modelo.
- **Mecánica:** cuesta una implementación (US$ 2.5 M, consume el tope) y un equipo de planeación conjunta (US$ 15,000 por semana) ⚠. Requiere compartir POS. Entra un trimestre después y madura en tres (`cpfrMaturity`, KPI `CPFR_MATURITY`). Con la madurez, los efectos van de RMI a CPFR: CV ×0.85, lead time ×0.8, variabilidad del lead time ×0.7, fill rate +2 pp. La regla R-08 exige CPFR maduro.
- **El momento importa:** en Kaigan, implantarlo en A1 suma mucho más que en A2; en A3 apenas se paga. En Red River y Valle compite por el tope con la red y el POS.
- **Auto-juego:** el buscador decide el año (`cpfrAt`: nunca, A1, A2 o A3) y `withBudget` lo prioriza después de la red, el POS y el pronóstico.

### AD-49 ✔ La distancia al CEDIS limita la frecuencia de entrega (SCM, 15-oct-2026)

- **Criterio (Eduardo):** la cantidad y la ubicación de los CEDIS determinan cuántas veces por semana se puede visitar cada tienda. El máximo global es de **2 visitas al día** (14 por semana) para tiendas cerca de un CEDIS. Conforme la tienda se aleja, el máximo baja hasta **1 visita por semana**.
- **Mecánica:** el tope depende del tiempo de ida y vuelta CEDIS→zona, con la velocidad de la región y su congestión media (`params.dc.maxFreqByRoundTrip`): ≤ 5 h → 14/semana; ≤ 10 h → 7; ≤ 18 h → 3; ≤ 28 h → 2; más → 1 ⚠. La frecuencia efectiva de cada zona y categoría es `min(D-11, tope)`. D-11 conserva su rango de decisión (frescos 7–14, refrigerado 3–14).
- **Reglas:** R-13 avisa cuántas zonas quedan limitadas por distancia. R-05 (frecuencia alta con tiendas dispersas) solo considera las zonas que sí reciben la frecuencia pedida, para que el alumno no reciba dos mensajes contradictorios sobre la misma zona.
- **Umbrales sin respaldo empírico:** los cortes de horas y frecuencias son supuestos de diseño. No hay forma de fijarlos sin experiencia práctica documentada de operadores; se marcan ⚠ hasta validarlos.
- **Efectos en la calibración:** con 2 visitas al día como máximo, Kaigan *as-is* baja a ~6.4 camiones por tienda al día y la referencia SEJ con 8 CEDIS queda en OSA ≈ 95.5% y merma de frescos ≈ 13% (SEJ repone ciertos frescos 3 veces al día). Pruebas: REG-13 nueva; INV-12, REG-05, CAU-02/03/04 y ESC-01 ajustadas.

### AD-50 ✔ CEDIS como sigla del centro de distribución (ambos simuladores, 15-oct-2026)

- **Criterio (Eduardo):** por convención regional, la interfaz, el glosario, los mensajes y las guías usan **CEDIS** (centro de distribución). El glosario conserva «CD» como alias.
- **Alcance:** solo texto visible para el alumno, incluidos los nombres de los CEDIS iniciales y nuevos (`CEDIS-1`…). Los identificadores del código (`dc`, `DC_COUNT`, `D-01`) y la documentación técnica pueden seguir usando «CD».

### AD-51 ✔ Todo pasa por un CEDIS: se retira la entrega directa (SCM, 15-oct-2026)

- **Criterio (Eduardo):** delegar la distribución a los proveedores no es factible. En la práctica solo unos cuantos proveedores estratégicos entregan directo a tienda; la gran mayoría no tiene capacidad de distribución. La decisión de red es **cuántos CEDIS y dónde** (D-01, con tipo y tamaño), no CEDIS vs. DSD.
- **Se retira D-10** (flujo por categoría) junto con los parámetros del DSD (`dsdFreqPerWeek`, `dsdFeePerDelivery`, `dsdSharedDensity`, `supplierDistKm`) y las entregas directas fijas por tienda (`otherDirectPerDay`): no se modelan proveedores estratégicos con entrega directa.
- **Red River arranca con 1 CEDIS central con inventario** (zona 14, mediano; `initial.dcs.zones`) en lugar de 0. Sigue siendo una red insuficiente a propósito (AD-44): las zonas lejanas reciben 1–3 visitas por semana.
- **Frescos en CEDIS con inventario (Eduardo):** se almacenan como el resto y envejecen. Es deliberado: el alumno debe explorar CEDIS *cross-dock* o combinados para los frescos. Con las redes iniciales de Red River y Valle (solo CEDIS con inventario), la merma de frescos supera 45% y la operación pierde dinero; en Red River, sumar 4 CEDIS combinados al central rinde más que sumar 4 con inventario (≈190 vs. ≈138 M USD en 3 años, merma de frescos 6% vs. 15%, prueba determinista). BOT-C de Red River usa CEDIS combinados.
- **Sin CEDIS no hay venta (R-14):** una zona con tiendas y sin CEDIS activo (greenfield antes del primero, el único CEDIS caído) no recibe mercancía y pierde toda su venta. Validaciones: la red no puede quedar vacía con tiendas abiertas, y abrir tiendas exige al menos un CEDIS planeado.
- **R-04** (más de 15 camiones por tienda al día) se queda: con consolidación por proveedor, cada proveedor llega en su propio camión.
- **Tope de Valle de US$ 6 M a 15 M/año (Eduardo):** con 6 M, convertir un CEDIS (≈ US$ 4 M) desplazaba la inversión en información y perdía, así que la referencia de Valle nunca exploraba CEDIS combinados aunque sin tope ganaban ≈ 80 M en 3 años.
- **Recalibración del índice y del auto-juego:** los bots y las propiedades de coherencia se comparan con la utilidad acumulada (el índice 0–100 quedaba saturado en el piso); SCM-AUT-02 solo exige que el trasplante pierda contra el diseño adaptado; SCM-AUT-09 usa una medida sin escala (σ(A) < 20% de la diferencia C − A); BOT-L es el diseño adaptado sin pronosticar (SCM-AUT-15 compara C contra L). Rangos y guardrails por región: ver especificación §6.3b. BOT-C de Red River y de Valle usan CEDIS combinados. La red de referencia prueba conversiones de tipo y CEDIS nuevos de cualquier tipo, con la consolidación combinada junto a los combinados.
- **Versiones:** `params` p5, `SIM_VERSION` 0.6.0 (las exportaciones previas no se pueden volver a jugar). Pruebas: REG-14 nueva; INV-12, CAU-01/02/07/15, ESC-02/04/06/07/10, LAG-10 e INV-16 ajustadas; CAU-08 retirada. Auto-juego: el espacio de búsqueda pierde los flujos por categoría y el «0 CEDIS»; SCM-AUT-08 pasa a «frescos ≤ 1×/día y CEDIS con inventario en Red River».
---

### AD-52 ✔ Kaigan arranca lejos de la red ideal; el pronóstico como reflexión (SCM, 15-oct-2026)

- **Criterio (Eduardo):** con 5 CEDIS combinados, Kaigan empezaba demasiado cerca de la solución. Ahora arranca con **un solo CEDIS grande con inventario** a la mitad de la costa (zona 12) y consolidación por proveedor, para que el equipo explore construir y/o convertir. Las tres regiones arrancan con CEDIS con inventario donde los frescos envejecen.
- **Pruebas de mecanismo con fijación:** las pruebas pareadas que usaban Kaigan como operación que funciona corren sobre una fijación con la red clásica (5 CEDIS combinados, `fixtureParams` en `test/helpers/run.ts`), como el «minicaso» de última milla. Las de escenario (SCM-ESC-01, SCO-05) usan la red real (`realEngine`).
- **SCM-AUT-04 en Kaigan:** con un CEDIS para 1,800 tiendas, invertir todo el tope es casi lo correcto: el maximalista (BOT-D) queda dentro del ruido del diseño adaptado (gana ≈ 30% de las semillas en bajo costo). Se reporta como nota y no cuenta como falla en Kaigan. BOT-C de Kaigan convierte el CEDIS central y construye 3 combinados.
- **Referencia de Kaigan:** el diseño de la política adaptada (BOT-C: convertir el CEDIS central a combinado y construir 3 combinados medianos, consolidación combinada, frescos 2×/día, CPFR). Supera a la red refinada por `network-optima`, que con un arranque tan lejano queda en un óptimo local. Los rangos del índice no se recalibran: Kaigan arranca en el piso del índice y SCM-SCO-05 se evalúa en Red River y Valle.
- **Se retira SCM-AUT-15** («pronosticar bien gana al nominal en ≥ 80% de las semillas») y BOT-L. Un pronóstico es una estimación de una variable aleatoria: en una sola partida, un pronóstico ingenuo puede acertar más que uno elaborado por azar, como en otros fenómenos (en la competencia M4, solo uno de los métodos puros de aprendizaje automático superó a un pronóstico ingenuo; Makridakis, Spiliotis y Assimakopoulos, 2018). Queda como reflexión en el debrief (DB-07) y en la guía del instructor; el valor del pronóstico se mide en promedio con `forecast-impact`.

### AD-53 ✔ Meta de utilidad para autoevaluarse (SCM, 16-oct-2026)

- **Criterio (Eduardo):** el alumno ve cuál es la utilidad que puede lograr con decisiones bien alineadas, para autoevaluarse.
- **Fuente:** por región × propuesta × escenario de mercado, la mejor utilidad acumulada de 3 años entre la red de referencia y la política adaptada (BOT-C), con ±10% de error de pronóstico (`autoplay/targets.ts` → `src/targets.json`; se regenera al final de `npm run network-optima`). Solo cifras, sin decisiones, así que vive en el repositorio público. Los escenarios predefinidos usan su semilla; el perfil propio usa la referencia del mercado base.
- **Interfaz:** tarjeta «Meta de referencia» antes del primer trimestre, en el dashboard (cuánto lleva el equipo y qué % de la meta) y en el reporte final. Aclara que son valores de jugadas de prueba del simulador y no necesariamente el máximo posible; con escenario propio u otra semilla, solo orientativa. No aparece en *greenfield*.

## 4. Ruta de implementación

| Fase | Entregable | Criterio de salida |
|---|---|---|
| **F0** ✔ | Especificaciones, casos de prueba y este documento | Publicados en el repo |
| **F1** ✔ | `sim-core`: PRNG con números aleatorios comunes, contrato del motor, reglas y eventos, log causal, persistencia, export y replay + arnés de pruebas ([core/README.md](./core/README.md)) | INV genéricas en verde; replay idéntico. Cumplido el 3-oct-2026: 65 pruebas (64 rápidas + 1 Monte Carlo) |
| **F2** ✔ | Modelo SCM (sin UI) + `params.v1` ([app/README.md](../simulador-scm-red/app/README.md)) | Casos SCM P1 en verde. Cumplido el 3-oct-2026: 56 pruebas (52 rápidas + 4 Monte Carlo) |
| **F3** ✔ | Auto-juego SCM y calibración ([tools/README.md](./tools/README.md), reporte en el repositorio privado) | Reporte de coherencia sin alarmas P1. Cumplido el 4-oct-2026: P1 y P2 de auto-juego en verde, más 84 pruebas SCM (P1, P2 y P3) |
| **F4** ✔ | UI SCM ([ui-kit/README.md](./ui-kit/README.md), [app/README.md](../simulador-scm-red/app/README.md)) | Flujo *end-to-end* de la partida completa + exportación. Cumplido el 4-oct-2026: 7 pruebas de punta a punta en Chromium (partida completa con replay del JSON exportado, CD irreversible, validación, recarga, sin `localStorage`, móvil 360 px, modo profesor) y 4 de componentes |
| **F5** ✔ | Modelo logística + `params.v1` ([app/README.md](../simulador-logistica-ultima-milla/app/README.md); notas en la §6.3b de la [especificación](../simulador-logistica-ultima-milla/especificacion.md)) | Casos LOG P1 en verde. Cumplido el 4-oct-2026: 66 pruebas (63 rápidas + 3 Monte Carlo), con el fixture del mini-caso de S5 calibrado (LOG-ESC-04) |
| **F6** ✔ | Auto-juego logística y calibración (reporte en el repositorio privado) | Reporte sin alarmas P1. Cumplido el 4-oct-2026: 6,000 partidas + búsqueda de BOT-I; 15 propiedades LOG-AUT en verde (LOG-AUT-15 pendiente); puntaje normalizado por territorio |
| **F7** ✔ | UI logística ([app/README.md](../simulador-logistica-ultima-milla/app/README.md#interfaz-f7)) | Flujo *end-to-end* de 36 épocas. Cumplido el 4-oct-2026: 8 pruebas de punta a punta en Chromium (partida completa con replay del JSON exportado, dark store irreversible, validación, vista p95 de D-61, recarga, sin `localStorage`, móvil 360 px, modo profesor) y 4 de interfaz |
| **F8** ✔ | Publicación en GitHub Pages | Ambos simuladores accesibles en línea. Cumplido el 5-oct-2026: <https://eduhrami.github.io/curso_mt4035/> (rama `gh-pages`: `scm/`, `ultima-milla/` y portada), verificados en Chromium desde la URL pública |

⚠ Prioridad sugerida: SCM primero, porque se usa antes en el calendario (S4).

---

## 5. Decisiones pendientes

- [ ] AD-25: visibilidad del puntaje durante el juego.
- [ ] Normalización del puntaje por región o territorio (SCM-SCO-05, LOG-SCO-05). En SCM está implementada como propuesta (rangos y guardrails por región en `params.v1.json`, especificación §6.3b); falta confirmarla.
- [ ] Duración objetivo de una partida (20 y 36 épocas manuales): ¿solo en clase o clase + casa?
- [ ] Confirmar GitHub Pages como canal de publicación frente a solo subir el archivo a Canvas.
- [ ] Extender la meta de utilidad (AD-53) al simulador de última milla: ver su especificación §13.
- [ ] Trabajo futuro: pronóstico propio del equipo (sin método impuesto), totalizado o por categoría, en el SCM: ver su especificación §13.

---

[← Simulador SCM](../simulador-scm-red/especificacion.md) · [Simulador Logística](../simulador-logistica-ultima-milla/especificacion.md)
