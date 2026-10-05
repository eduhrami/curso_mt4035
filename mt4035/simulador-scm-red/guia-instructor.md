# Guía del instructor — Simulador SCM + Diseño de red (Hoshi Mart)

> ⚠ **Borrador preliminar** (5-oct-2026). Los puntos de la rúbrica y la asignación de escenarios son una propuesta; el peso de la práctica en la calificación del curso lo define el [syllabus](../syllabus.md), sección V.

**Sesión:** [Sesión 4](../sesion-4.md) (Eduardo, 15-oct-2026) · **Simulador:** <https://eduhrami.github.io/curso_mt4035/scm/> · **Especificación:** [especificacion.md](./especificacion.md) (escenarios §4.3, uso pedagógico §11)

La guía tiene dos partes: **(A) introducción a la práctica**, para preparar y conducir la sesión, y **(B) rúbrica**, para calificar el debrief que cada equipo entrega dentro del JSON de su corrida.

---

## A. Introducción a la práctica

### A.1 Propósito

Los equipos dirigen la cadena de suministro de Hoshi Mart durante 5 años (20 trimestres) y comprueban con KPIs que el diseño de la red debe seguir a la propuesta de valor y a la geografía. La práctica conecta tres ideas de la sesión:

1. **Diseño de red como *trade-off*:** costo de servir (CTS, *Cost-to-Serve*: costo logístico / tiendas) contra disponibilidad en anaquel (OSA, *On-Shelf Availability*: tiempo con stock / tiempo total).
2. **Información y efecto látigo:** el bullwhip ratio (BWR, *Bullwhip Ratio*: Var(órdenes al proveedor) / Var(demanda en tienda)) como medida del efecto que los equipos ya vivieron en el Beer Game, ahora con decisiones de red e información.
3. **Decisiones con retraso:** varias decisiones tardan uno o más trimestres en surtir efecto (el simulador lo indica al confirmar); el equipo debe descubrir cuáles importan en su escenario.

### A.2 Antes de la sesión (solo el instructor)

Los alumnos no preparan nada antes de clase: todo ocurre en la sesión.

- Abrir el simulador en el equipo del aula y comprobar que carga; funciona sin conexión una vez abierto.
- Decidir la **asignación de escenarios** (A.4) y anotarla en el pizarrón o en Canvas.
- Crear en Canvas la tarea «Corrida SCM + debrief» que acepte archivos `.json`.
- Opcional: abrir el simulador con `?profesor=1` para ver el puntaje parcial durante el juego y proyectar ejemplos.

### A.3 Guion de introducción (~10 min, para leer o adaptar)

> «Hoshi Mart, una cadena de tiendas de conveniencia, compró Prairie Stop y el consejo evalúa entrar a Valle Metropolitano. Ustedes son la dirección de supply chain. Cada trimestre revisan resultados, ajustan decisiones de red, flujo, inventario e información, y confirman. Nada avanza solo: cada trimestre lo confirma el equipo.
>
> Antes de empezar eligen tres cosas: la **región**, el **escenario de mercado** que les asigné y la **propuesta de valor** que van a defender (frescura, bajo costo o conveniencia). Su puntaje se calcula según esa propuesta: el mismo KPI puede ser bueno o malo según lo que prometieron.
>
> Al elegir el escenario, el simulador llena la **semilla** en la sección «Jugador y semilla». **No la cambien**: así todos los equipos con el mismo escenario enfrentan la misma demanda y los mismos eventos, y las diferencias se deben a sus decisiones.
>
> Cuando un evento les pegue, abran **"¿Por qué pasó esto?"**: el simulador explica la cadena causal. Al terminar los 20 trimestres verán un reporte final con un **debrief de seis preguntas**. No podrán exportar la corrida hasta responderlo. Respondan con datos de su corrida: KPIs, trimestres y decisiones. Esa respuesta es lo que se califica, más que el puntaje.»

Muestre en pantalla un trimestre de ejemplo: pestañas de decisiones, el diálogo de confirmación (costo, retraso, reversibilidad) y la bandeja de mensajes.

### A.4 Asignación de escenarios

Cada ficha del setup indica el concepto que ilustra y la región donde el contraste es más claro.

| Escenario | Región sugerida | Concepto | Semilla |
|---|---|---|---|
| Mercado estable | Kaigan | Línea base: CTS vs. OSA sin ruido externo | 4101 |
| Demanda incierta | Valle Metropolitano | Efecto látigo con demanda volátil y proveedores poco confiables | 4202 |
| Presión de costos | Red River | Eficiencia vs. capacidad de respuesta cuando suben los costos | 4303 |
| Crecimiento acelerado | Valle Metropolitano | Planeación de capacidad con demanda creciente y cambiante | 4404 |

**Semillas y comparabilidad.** Las fichas del simulador no muestran la semilla; al elegir un escenario se llena sola con el valor de la tabla. Para comparar equipos o estrategias, todos deben usar el mismo escenario **y** esa semilla: así enfrentan la misma demanda y los mismos eventos, y la diferencia en KPIs se atribuye a las decisiones. Para variar entre grupos, puede asignar otra semilla (por ejemplo, una por grupo) y pedir que la escriban antes de comenzar. Las corridas con «Crear mi propio escenario» o con otra semilla no son comparables con las demás; la columna `semilla` del CSV agregado permite detectarlas.

Asignaciones recomendadas:

- **Comparar estrategias (recomendada):** dos equipos por escenario, con la misma región y semilla pero distinta propuesta de valor. En el plenario se comparan los pares.
- **Comparar escenarios:** todos los equipos en la misma región y con la misma propuesta de valor, cada uno con un escenario distinto. Así se aísla el efecto del entorno.
- **Escenario propio** («Crear mi propio escenario»): solo para exploración o como extensión. Esas corridas no son comparables y su pregunta 5 es distinta (B.3).

### A.5 Desarrollo de la sesión (~75 min)

| Tiempo | Actividad |
|---|---|
| 10 min | Introducción (A.3) y asignación de escenarios |
| 45–50 min | Juego en equipo: 20 trimestres, ≈2–3 min por trimestre. A la mitad, avise a los equipos que vayan rezagados |
| 10 min | Debrief escrito en el simulador (las seis preguntas) y exportación del JSON a Canvas |
| 10–15 min | Plenario (A.7) |

Si el tiempo no alcanza, los equipos pueden terminar fuera de clase. La partida se guarda en el navegador y el botón «Exportar JSON» de la barra superior permite continuarla en otro equipo.

### A.6 Entrega y verificación

El equipo entrega **un archivo JSON** por corrida. Contiene la semilla, las decisiones, los KPIs, el puntaje y el **debrief**, todo protegido por un checksum.

```bash
cd mt4035/simulador-scm-red/app
npm run replay -- /ruta/entregas/*.json                       # vuelve a correr cada JSON y verifica que los KPIs coinciden
npm run aggregate -- /ruta/entregas/ --out /ruta/grupo.csv   # una fila por corrida: escenario, semilla, puntaje, KPIs promedio y respuestas debrief_DB-01…DB-06
```

- Si el replay sale **✗**, la corrida fue alterada o se jugó con otra versión: revísela con el equipo antes de calificar.
- La columna `debrief_completo` debe decir «sí»; el simulador no exporta sin debrief completo.

### A.7 Plenario sugerido

Proyecte el CSV agregado ordenado por escenario y compare pares de equipos con la misma semilla.

- ¿Qué decisiones de Seven-Eleven Japan dependen de la geografía y cuáles no? ¿Qué evidencia de su corrida lo muestra?
- Entre equipos del mismo escenario: ¿quién tuvo mejor OSA y a qué CTS? ¿Qué decisión explica la diferencia?
- ¿Qué decisión de información o colaboración tomaron, qué KPI se movió primero y cuánto tardó?
- Si densificaron tiendas, ¿siguió rindiendo todo el tiempo? ¿Cómo lo saben?
- ¿Qué evento les dolió más y qué decisión previa lo agravó?

---

## B. Rúbrica del debrief

### B.1 Requisitos para calificar

- El JSON pasa `npm run replay` (✓) y tiene `debrief_completo = sí`.
- La corrida está terminada (20 trimestres).

Si no se cumplen, devuelva la entrega para corrección antes de calificar.

### B.2 Criterios y niveles (100 puntos)

El puntaje del simulador **no** se califica directamente: se evalúa la calidad del razonamiento. Un equipo con puntaje bajo que diagnostica bien por qué le fue mal puede obtener la máxima calificación. La rúbrica no tiene respuestas correctas predefinidas: califica la **evidencia** (datos de la propia corrida), la **causalidad** (decisión → mecanismo → KPI) y la **coherencia** con la propuesta de valor y el entorno elegidos.

| Pregunta | Pts | Excelente (100%) | Satisfactorio (75%) | En desarrollo (50%) | Insuficiente (0–25%) |
|---|---|---|---|---|---|
| **DB-01** Propuesta de valor y decisiones de red y flujo; decisión clave | 15 | Describe con precisión sus decisiones de red y flujo, señala una decisión clave y argumenta su coherencia con la propuesta de valor **y** con las características de la región | Describe sus decisiones y la clave con una justificación parcial | Lista decisiones sin explicar por qué encajan | Genérica o sin relación con la corrida |
| **DB-02** KPI primario y guardrail con valores y *trade-off* | 20 | Justifica la elección del par a partir de su propuesta de valor, cita valores de su reporte y explica cómo administró la tensión entre ambos | Nombra el par y cita valores; la explicación del *trade-off* es superficial | Nombra KPIs sin valores o sin *trade-off* | Confunde los KPIs o no responde |
| **DB-03** Decisión con retraso | 15 | Ubica el trimestre de la decisión y el del efecto observado, nombra el KPI afectado y propone una explicación del retraso | Identifica la decisión y el KPI con ubicación aproximada | Menciona un retraso sin evidencia de la corrida | No reconoce retrasos |
| **DB-04** Evento crítico y decisión previa | 15 | Reconstruye la cadena causal del evento con la explicación del simulador y argumenta qué decisión previa cambió su impacto | Identifica el evento y una decisión relacionada | Describe el evento sin causalidad | No responde o lo atribuye todo a la mala suerte |
| **DB-05** Pregunta del escenario | 20 | Responde todas las partes de la pregunta con evidencia cuantitativa y conecta el resultado con el concepto del escenario (B.3) | Responde con evidencia parcial o deja una parte sin atender | Responde de forma vaga, sin datos | No conecta con el escenario |
| **DB-06** Qué cambiaría al repetir | 15 | Formula una hipótesis verificable (decisión → mecanismo → KPI esperado) que se desprende de lo observado | Propone un cambio razonable con mecanismo parcial | Cambio sin mecanismo | «Nada» o respuesta genérica |

### B.3 Qué buscar en DB-05 por escenario

Los criterios describen la **evidencia y el razonamiento** que debe contener una respuesta excelente, no su conclusión. Distintos equipos pueden llegar a conclusiones distintas con la misma semilla; califique si la conclusión se sostiene con sus datos.

**Mercado estable**
- Presenta la composición de su CTS con cifras del desglose de costos y cómo cambió a lo largo de la partida.
- Compara al menos dos inversiones por su costo, su retraso y su efecto en KPIs, y argumenta cuál se recuperó antes.
- Separa lo que se debe a sus decisiones de lo que se debe al mercado.

**Demanda incierta**
- Reporta el BWR al inicio, en algún punto intermedio y al final, y ubica en el tiempo las decisiones que lo movieron.
- Compara el efecto de las palancas que usó (o explica por qué no usó alguna) con datos de BWR y OSA.
- Analiza si su configuración de red amplificó o amortiguó las fallas de proveedor, con algún evento concreto de su corrida.

**Presión de costos**
- Muestra cómo evolucionó el CTS y qué parte atribuye a factores externos y qué parte a sus decisiones.
- Evalúa sus decisiones de flujo y transporte con evidencia de costo y servicio, en lugar de afirmarlo.
- Muestra qué pasó con la OSA y las ventas perdidas mientras contenía el costo.

**Crecimiento acelerado**
- Ubica en la trayectoria cuándo decidió ampliar capacidad, cuándo surtió efecto y si hubo saturación.
- Discute el costo de su decisión de *timing* (anticipar o esperar) con datos de la corrida.
- Muestra cómo evolucionaron la merma y la OSA de frescos y lo relaciona con sus decisiones.

**Escenario propio**
- Plantea una hipótesis explícita sobre los factores de mercado que cambió y la contrasta con sus KPIs; idealmente, compara con una corrida en un escenario predefinido.

### B.4 Retroalimentación rápida

Para el comentario al equipo, basta con señalar: (1) la respuesta más sólida, (2) la de menor evidencia y (3) una pregunta para el proyecto final: ¿qué *trade-off* de la red de su empresa se parece al que enfrentaron?

---

Las preguntas DB-01…DB-06 de esta guía reproducen las del simulador ([`app/src/debrief.ts`](./app/src/debrief.ts) y [`app/src/presets.ts`](./app/src/presets.ts)). Si cambian allá, actualícelas aquí.

[← Especificación](./especificacion.md) · [Sesión 4](../sesion-4.md) · [Volver al índice del curso](../README.md)
