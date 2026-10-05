# Guía del instructor — Simulador de Logística y Última Milla (Mercado Alba)

> ⚠ **Borrador preliminar** (5-oct-2026). Los puntos de la rúbrica y la asignación de escenarios son una propuesta; el peso de la práctica en la calificación del curso lo define el [syllabus](../syllabus.md), sección V.

**Sesión:** [Sesión 5](../sesion-5.md) (Eduardo, 5-nov-2026) · **Simulador:** <https://eduhrami.github.io/curso_mt4035/ultima-milla/> · **Especificación:** [especificacion.md](./especificacion.md) (escenarios §4.3, uso pedagógico §11)

La guía tiene dos partes: **(A) introducción a la práctica**, para preparar y conducir la sesión, y **(B) rúbrica**, para calificar el debrief que cada equipo entrega dentro del JSON de su corrida.

---

## A. Introducción a la práctica

### A.1 Propósito

Los equipos dirigen la logística en línea de Mercado Alba durante 36 meses y comprueban con KPIs que el servicio puede mejorar sin que el costo destruya el margen. La práctica conecta cuatro ideas de la sesión:

1. **La frontera servicio–costo:** entrega a tiempo (OTD, *On-Time Delivery Rate*: entregas a tiempo / entregas) contra costo por pedido (CPD, *Cost per Delivered order*: costo de última milla / entregas exitosas).
2. **El primer intento:** FADS (*First Attempt Delivery Success*: entregas exitosas al primer intento / intentos) como KPI que conecta operación y experiencia del cliente.
3. **Promedio vs. días críticos:** la diferencia entre medir con el promedio mensual y con el p95 de los días críticos.
4. **Pares primario–guardrail:** cumplir un KPI sin romper otro.

### A.2 Antes de la sesión (solo el instructor)

Los alumnos no preparan nada antes de clase: todo ocurre en la sesión.

- Abrir el simulador en el equipo del aula y comprobar que carga; funciona sin conexión una vez abierto.
- Decidir la **asignación de escenarios** (A.4) y anotarla en el pizarrón o en Canvas.
- Crear en Canvas la tarea «Corrida última milla + debrief» que acepte archivos `.json`.
- Opcional: abrir el simulador con `?profesor=1` para ver el puntaje parcial durante el juego.

### A.3 Guion de introducción (~10 min, para leer o adaptar)

> «Los pedidos en línea de Mercado Alba crecen a doble dígito, pero la operación se improvisó: todo sale del CD con camionetas de un 3PL, casi 1 de cada 5 entregas falla al primer intento y los frescos llegan tibios. Ustedes son la dirección de logística. Tienen 36 meses para decidir desde dónde surten, qué prometen, con qué flota y cómo rutean. Cada mes revisan resultados, ajustan y confirman.
>
> Antes de empezar eligen el **territorio**, el **escenario de mercado** que les asigné y la **estrategia de servicio** que van a defender (velocidad, confiabilidad o eficiencia). El puntaje se calcula según esa estrategia y siempre con los días críticos (p95).
>
> Al elegir el escenario, el simulador llena la **semilla** en la sección «Jugador y semilla». **No la cambien**: así todos los equipos con el mismo escenario enfrentan los mismos picos y eventos, y las diferencias se deben a sus decisiones.
>
> Cambien el reporte de promedio a **p95** en algún momento y comparen. Al terminar verán un reporte final con un **debrief de seis preguntas**. No podrán exportar la corrida hasta responderlo. Respondan con datos de su corrida: eso es lo que se califica, más que el puntaje.»

Muestre en pantalla un mes de ejemplo: pestañas de decisiones, el diálogo de confirmación, la frontera OTD–CPD y la bandeja de mensajes con «¿Por qué pasó esto?».

### A.4 Asignación de escenarios

Cada ficha del setup indica el concepto que ilustra y el territorio donde el contraste es más claro.

| Escenario | Territorio sugerido | Concepto | Semilla |
|---|---|---|---|
| Mercado base | Megalópolis Centro | Línea base: frontera OTD–CPD | 5101 |
| Carrera por la velocidad | Megalópolis Centro | El costo de la velocidad | 5202 |
| Margen apretado | Región Norte | Eficiencia con margen estrecho | 5303 |
| Canasta compleja | Ciudad Bajío | Cadena de frío y logística inversa | 5404 |

**Semillas y comparabilidad.** Las fichas del simulador no muestran la semilla; al elegir un escenario se llena sola con el valor de la tabla. Para comparar equipos o estrategias, todos deben usar el mismo escenario **y** esa semilla: así enfrentan la misma demanda y los mismos eventos, y la diferencia en KPIs se atribuye a las decisiones. Para variar entre grupos, puede asignar otra semilla (por ejemplo, una por grupo) y pedir que la escriban antes de comenzar. Las corridas con «Crear mi propio escenario» o con otra semilla no son comparables con las demás; la columna `semilla` del CSV agregado permite detectarlas.

Asignaciones recomendadas:

- **Comparar estrategias (recomendada):** dos equipos por escenario, con el mismo territorio y semilla pero distinta estrategia de servicio. En el plenario se comparan sus puntos en la frontera OTD–CPD.
- **Comparar escenarios:** todos en el mismo territorio y con la misma estrategia, cada equipo con un escenario distinto.
- **Escenario propio:** solo para exploración. Esas corridas no son comparables y su pregunta 5 es distinta (B.3).

### A.5 Desarrollo de la sesión (~85 min)

| Tiempo | Actividad |
|---|---|
| 10 min | Introducción (A.3) y asignación de escenarios |
| 55–60 min | Juego en equipo: 36 meses, ≈1.5–2 min por mes. Sugiera jugar rápido los meses sin pico y detenerse en mayo, agosto, noviembre y diciembre |
| 10 min | Debrief escrito en el simulador y exportación del JSON a Canvas |
| 10 min | Plenario (A.7) |

Si el tiempo no alcanza, los equipos pueden terminar fuera de clase. La partida se guarda en el navegador y el botón «Exportar JSON» de la barra superior permite continuarla en otro equipo.

### A.6 Entrega y verificación

El equipo entrega **un archivo JSON** por corrida. Contiene la semilla, las decisiones, los KPIs, el puntaje y el **debrief**, todo protegido por un checksum.

```bash
cd mt4035/simulador-logistica-ultima-milla/app
npm run replay -- /ruta/entregas/*.json                       # vuelve a correr cada JSON y verifica que los KPIs coinciden
npm run aggregate -- /ruta/entregas/ --out /ruta/grupo.csv   # una fila por corrida: escenario, semilla, puntaje, KPIs promedio y respuestas debrief_DB-01…DB-06
```

- Si el replay sale **✗**, la corrida fue alterada o se jugó con otra versión: revísela con el equipo antes de calificar.
- La columna `debrief_completo` debe decir «sí»; el simulador no exporta sin debrief completo.

### A.7 Plenario sugerido

Proyecte el CSV agregado y, si es posible, las fronteras OTD–CPD de dos equipos con la misma semilla.

- ¿Qué par primario–guardrail fue el más difícil de sostener en Buen Fin?
- ¿Cuánto del OTD «promedio» era real? ¿Qué vieron al cambiar a p95?
- ¿Dónde sí valió la pena pagar por velocidad y dónde convenía segmentar?
- Si usaron ruteo con IA, ¿qué tanto mejoró y de qué dependió?
- Entre equipos del mismo escenario: ¿qué decisión explica la diferencia en CPD?

---

## B. Rúbrica del debrief

### B.1 Requisitos para calificar

- El JSON pasa `npm run replay` (✓) y tiene `debrief_completo = sí`.
- La corrida está terminada (36 meses).

Si no se cumplen, devuelva la entrega para corrección antes de calificar.

### B.2 Criterios y niveles (100 puntos)

El puntaje del simulador **no** se califica directamente: se evalúa la calidad del razonamiento. Un equipo con puntaje bajo que diagnostica bien por qué le fue mal puede obtener la máxima calificación. La rúbrica no tiene respuestas correctas predefinidas: califica la **evidencia** (datos de la propia corrida), la **causalidad** (decisión → mecanismo → KPI) y la **coherencia** con la estrategia de servicio y el territorio elegidos.

| Pregunta | Pts | Excelente (100%) | Satisfactorio (75%) | En desarrollo (50%) | Insuficiente (0–25%) |
|---|---|---|---|---|---|
| **DB-01** Red de *fulfillment* y promesa; decisión clave | 15 | Describe con precisión desde dónde surtió, qué prometió y con qué flota, señala una decisión clave y argumenta su coherencia con la estrategia **y** con las características del territorio | Describe sus decisiones y la clave con una justificación parcial | Lista decisiones sin explicar por qué encajan | Genérica o sin relación con la corrida |
| **DB-02** Par primario–guardrail con valores | 20 | Justifica la elección del par a partir de su estrategia, cita valores y explica cómo administró la tensión entre ambos | Nombra el par y cita valores; la explicación del *trade-off* es superficial | Nombra KPIs sin valores o sin *trade-off* | Confunde los KPIs o no responde |
| **DB-03** Pico más difícil | 15 | Ubica el mes, cuantifica su efecto en servicio y capacidad, y distingue lo que preparó **antes** del pico de lo que hizo **durante** | Identifica el pico y una medida tomada | Describe el pico sin datos ni medidas | No responde |
| **DB-04** Promedio vs. p95 | 15 | Compara valores promedio y p95 de su corrida, interpreta la diferencia y explica si cambió alguna decisión al verla | Reporta la diferencia con una interpretación breve | Menciona el p95 sin valores | No distingue promedio de p95 |
| **DB-05** Pregunta del escenario | 20 | Responde todas las partes de la pregunta con evidencia cuantitativa y conecta el resultado con el concepto del escenario (B.3) | Responde con evidencia parcial o deja una parte sin atender | Responde de forma vaga, sin datos | No conecta con el escenario |
| **DB-06** Qué cambiaría al repetir | 15 | Formula una hipótesis verificable (decisión → mecanismo → KPI esperado) que se desprende de lo observado | Propone un cambio razonable con mecanismo parcial | Cambio sin mecanismo | «Nada» o respuesta genérica |

### B.3 Qué buscar en DB-05 por escenario

Los criterios describen la **evidencia y el razonamiento** que debe contener una respuesta excelente, no su conclusión. Distintos equipos pueden llegar a conclusiones distintas con la misma semilla; califique si la conclusión se sostiene con sus datos.

**Mercado base**
- Ubica su corrida en la gráfica OTD–CPD con valores y la compara con el punto de partida o con otra corrida.
- Identifica qué decisión movió su posición y distingue entre mejorar ambos KPIs a la vez y cambiar uno por otro.
- Reporta el FADS al inicio y al final y lo atribuye a decisiones concretas.

**Carrera por la velocidad**
- Distingue zonas o segmentos donde pagar por velocidad rindió de aquellos donde no, con datos de servicio y costo.
- Reporta OTD p95, CPD y utilización en los meses pico que menciona la pregunta.
- Explica cómo evolucionó la capacidad frente al crecimiento de la demanda y si llegó a saturarse.

**Margen apretado**
- Enumera las palancas de eficiencia que usó y cuantifica el cambio en CPD y en margen del canal en línea.
- Si modificó la tarifa o el mínimo de compra, cuantifica el efecto en el volumen de pedidos.
- Muestra si el ahorro tuvo costo en servicio o en satisfacción del cliente.

**Canasta compleja**
- Reporta el spoilage rate y el CSAT a lo largo de la partida y argumenta qué decisiones los movieron.
- Reporta el costo de devolución por unidad y justifica su canal de devolución frente a las alternativas.
- Explica si diseñó la logística inversa desde el inicio o reaccionó tarde, y qué le costó.

**Escenario propio**
- Plantea una hipótesis explícita sobre los factores de mercado que cambió y la contrasta con sus KPIs; idealmente, compara con una corrida en un escenario predefinido.

### B.4 Retroalimentación rápida

Para el comentario al equipo, basta con señalar: (1) la respuesta más sólida, (2) la de menor evidencia y (3) una pregunta para el checkpoint del proyecto final: ¿qué par primario–guardrail usarán para su empresa y por qué?

---

Las preguntas DB-01…DB-06 de esta guía reproducen las del simulador ([`app/src/debrief.ts`](./app/src/debrief.ts) y [`app/src/presets.ts`](./app/src/presets.ts)). Si cambian allá, actualícelas aquí.

[← Especificación](./especificacion.md) · [Sesión 5](../sesion-5.md) · [Volver al índice del curso](../README.md)
