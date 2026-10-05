# Guía del instructor — Simulador de Logística y Última Milla (Mercado Alba)

> ⚠ **Borrador preliminar** (5-oct-2026). Los puntos de la rúbrica y la asignación de escenarios son una propuesta; el peso de la práctica en la calificación del curso lo define el [syllabus](../syllabus.md), sección V.

**Sesión:** [Sesión 5](../sesion-5.md) (Eduardo, 5-nov-2026) · **Simulador:** <https://eduhrami.github.io/curso_mt4035/ultima-milla/> · **Especificación:** [especificacion.md](./especificacion.md) (escenarios §4.3, uso pedagógico §11)

La guía tiene dos partes: **(A) introducción a la práctica**, para preparar y conducir la sesión, y **(B) rúbrica**, para calificar el debrief que cada equipo entrega dentro del JSON de su corrida.

---

## A. Introducción a la práctica

### A.1 Propósito

Los equipos dirigen la logística en línea de Mercado Alba durante 36 meses y comprueban con KPIs que el servicio puede mejorar sin que el costo destruya el margen. La práctica conecta cuatro ideas de la sesión:

1. **La frontera servicio–costo:** entrega a tiempo (OTD, *On-Time Delivery Rate*: entregas a tiempo / entregas) contra costo por pedido (CPD, *Cost per Delivered order*: costo de última milla / entregas exitosas).
2. **El primer intento:** FADS (*First Attempt Delivery Success*: entregas exitosas al primer intento / intentos) depende de ventanas, avisos y validación de dirección, no solo de la flota.
3. **Promedio vs. días críticos:** el OTD promedio oculta los picos; el p95 los revela (R-12).
4. **Pares primario–guardrail:** cumplir un KPI sin romper otro (OTD con CPD, CPD con CSAT, velocidad con spoilage).

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
> Usen la **semilla del escenario** tal como aparece: así todos los equipos con el mismo escenario enfrentan los mismos picos y eventos, y las diferencias se deben a sus decisiones. El calendario de picos (Hot Sale, regreso a clases, Buen Fin, Navidad y quincenas) se conoce desde el inicio; su magnitud no.
>
> Cambien el reporte de promedio a **p95** en algún momento y comparen. Al terminar verán un reporte final con un **debrief de seis preguntas**. No podrán exportar la corrida hasta responderlo. Respondan con datos de su corrida: eso es lo que se califica, más que el puntaje.»

Muestre en pantalla un mes de ejemplo: pestañas de decisiones, el diálogo de confirmación, la frontera OTD–CPD y la bandeja de mensajes con «¿Por qué pasó esto?».

### A.4 Asignación de escenarios

Cada ficha del setup indica el concepto que ilustra y el territorio donde el contraste es más claro.

| Escenario | Territorio sugerido | Concepto | Semilla |
|---|---|---|---|
| Mercado base | Megalópolis Centro | Frontera OTD–CPD, FADS | 5101 |
| Carrera por la velocidad | Megalópolis Centro | El costo de la velocidad y la saturación en picos | 5202 |
| Margen apretado | Región Norte | Eficiencia: consolidación, BOPIS, lockers, segmentación | 5303 |
| Canasta compleja | Ciudad Bajío | Cadena de frío y logística inversa | 5404 |

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
- ¿La IA en ruteo mejoró algo antes de invertir en datos? (R-08)
- Entre equipos del mismo escenario: ¿qué decisión explica la diferencia en CPD?

---

## B. Rúbrica del debrief

### B.1 Requisitos para calificar

- El JSON pasa `npm run replay` (✓) y tiene `debrief_completo = sí`.
- La corrida está terminada (36 meses).

Si no se cumplen, devuelva la entrega para corrección antes de calificar.

### B.2 Criterios y niveles (100 puntos)

El puntaje del simulador **no** se califica directamente: se evalúa la calidad del razonamiento. Un equipo con puntaje bajo que diagnostica bien por qué le fue mal puede obtener la máxima calificación.

| Pregunta | Pts | Excelente (100%) | Satisfactorio (75%) | En desarrollo (50%) | Insuficiente (0–25%) |
|---|---|---|---|---|---|
| **DB-01** Red de *fulfillment* y promesa; decisión clave | 15 | Describe nodos (SFD, SFS, dark stores, lockers), niveles de servicio y flota, y justifica su coherencia con la estrategia **y** con el territorio (densidad, presencia en casa) | Describe la red y la decisión clave con alguna justificación | Lista decisiones sin explicar por qué encajan | Genérica o sin relación con la corrida |
| **DB-02** Par primario–guardrail con valores | 20 | Nombra el par (p. ej., OTD p95 y CPD), cita valores y explica cómo administró el *trade-off* | Cita el par y valores; el *trade-off* es superficial | Nombra KPIs sin valores o sin *trade-off* | Confunde KPIs o no responde |
| **DB-03** Pico más difícil | 15 | Ubica el mes, cuantifica OTD p95 y utilización, y distingue lo que preparó **antes** (contratos de pico, slotting, buffer) de lo que hizo **durante** | Identifica el pico y una medida tomada | Describe el pico sin datos ni medidas | No responde |
| **DB-04** Promedio vs. p95 | 15 | Compara valores promedio y p95 y explica qué oculta el promedio (R-12) y qué decisión cambió al verlo | Reporta la diferencia con una interpretación breve | Menciona el p95 sin valores | No distingue promedio de p95 |
| **DB-05** Pregunta del escenario | 20 | Responde con evidencia cuantitativa y demuestra el concepto del escenario (B.3) | Usa el concepto correctamente con poca evidencia | Usa el concepto de forma vaga | No conecta con el escenario |
| **DB-06** Qué cambiaría al repetir | 15 | Hipótesis explícita: decisión → mecanismo → KPI esperado, coherente con lo observado | Propone un cambio razonable con un mecanismo parcial | Cambio sin mecanismo | «Nada» o respuesta genérica |

### B.3 Guía de respuesta para DB-05 por escenario

Una respuesta excelente suele incluir los elementos indicados. No son respuestas únicas: premie el razonamiento que se apoye en la evidencia de la corrida.

**Mercado base** — *¿Dónde quedó la corrida en la frontera OTD–CPD? ¿Qué decisión la acercó? ¿Cuánto subió el FADS?*
- Ubica su punto en la gráfica de frontera y lo compara con el *as-is* o con otra corrida.
- Distingue las decisiones que mueven la frontera (SFS en zonas densas, zonificación y ruteo) de las que solo se desplazan sobre ella (pagar más por velocidad).
- Explica el FADS con ventanas angostas (D-21), aviso de ETA (D-50) y validación de dirección (D-51); con ventana «todo el día» y baja presencia en casa se dispara R-03.

**Carrera por la velocidad** — *¿Dónde valió la pena pagar por velocidad y dónde segmentar? ¿Cómo se comportaron el OTD p95 y la utilización en los picos?*
- Reconoce que el cliente premia la rapidez, pero que el express con densidad baja dispara R-04 (utilización < 50% y CPD alto).
- Segmenta: express o mismo día en zonas densas y día siguiente o lockers en la periferia (D-24).
- Reporta el OTD p95 en Hot Sale y Buen Fin y lo conecta con el buffer de promesa (D-23), el tope de capacidad (D-26) y los contratos de pico (D-36). Prometer sin buffer en pico activa R-06 (backlog de días).
- Con un crecimiento explosivo, la capacidad de nodos y flota se satura antes: una buena respuesta muestra cuándo.

**Margen apretado** — *¿Qué palancas de eficiencia usó y cuánto movieron el CPD y el margen?*
- Compara el CPD y el costo de envío como % de ingresos al inicio y al final.
- Discute la tarifa y el mínimo de compra (D-25) frente a un cliente sensible a la tarifa: subirlos protege el margen pero reduce pedidos.
- Menciona la consolidación: lockers (R-14, una parada para muchos pedidos), BOPIS (D-03), micro-hubs (D-07) y backhaul de devoluciones (R-11).
- Relaciona la escasez de choferes (X-06) y la gasolina volátil (X-15) con la mezcla y el tipo de flota (D-30, D-31).

**Canasta compleja** — *¿Cómo protegió la cadena de frío y qué efecto tuvo en el CSAT? ¿Qué canal de devolución eligió y cuánto costó?*
- Conecta el spoilage con la duración de ruta y el equipo de frío: rutas de más de 3 h con frescos y sin equipo disparan R-01, y luego R-02 (CSAT −, faltantes en piso). Menciona la secuencia de carga (D-45) y el equipo (D-32).
- Reporta el costo de devolución por unidad y compara canales (D-55): tienda, lockers, recolección a domicilio; y la consolidación (D-56): el backhaul baja los km vacíos pero alarga la ruta (R-11).
- Una respuesta excelente reconoce que la logística inversa se diseña desde el inicio, no como parche.

**Escenario propio** — *¿Qué factores cambió, qué quería probar y qué confirmó o refutó?*
- Plantea una hipótesis explícita sobre los factores de mercado y la contrasta con KPIs. Si es posible, compara contra una corrida en un escenario predefinido.

### B.4 Retroalimentación rápida

Para el comentario al equipo, basta con señalar: (1) la respuesta más sólida, (2) la de menor evidencia y (3) una pregunta para el checkpoint del proyecto final: ¿qué par primario–guardrail usarán para su empresa y por qué?

---

Las preguntas DB-01…DB-06 de esta guía reproducen las del simulador ([`app/src/debrief.ts`](./app/src/debrief.ts) y [`app/src/presets.ts`](./app/src/presets.ts)). Si cambian allá, actualícelas aquí.

[← Especificación](./especificacion.md) · [Sesión 5](../sesion-5.md) · [Volver al índice del curso](../README.md)
