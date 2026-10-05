# Guía del instructor — Simulador SCM + Diseño de red (Hoshi Mart)

> ⚠ **Borrador preliminar** (5-oct-2026). Los puntos de la rúbrica y la asignación de escenarios son una propuesta; el peso de la práctica en la calificación del curso lo define el [syllabus](../syllabus.md), sección V.

**Sesión:** [Sesión 4](../sesion-4.md) (Eduardo, 15-oct-2026) · **Simulador:** <https://eduhrami.github.io/curso_mt4035/scm/> · **Especificación:** [especificacion.md](./especificacion.md) (escenarios §4.3, uso pedagógico §11)

La guía tiene dos partes: **(A) introducción a la práctica**, para preparar y conducir la sesión, y **(B) rúbrica**, para calificar el debrief que cada equipo entrega dentro del JSON de su corrida.

---

## A. Introducción a la práctica

### A.1 Propósito

Los equipos dirigen la cadena de suministro de Hoshi Mart durante 5 años (20 trimestres) y comprueban con KPIs que el diseño de la red debe seguir a la propuesta de valor y a la geografía. La práctica conecta tres ideas de la sesión:

1. **Diseño de red como *trade-off*:** costo de servir (CTS, *Cost-to-Serve*: costo logístico / tiendas) contra disponibilidad en anaquel (OSA, *On-Shelf Availability*: tiempo con stock / tiempo total).
2. **Información y efecto látigo:** el bullwhip ratio (BWR, *Bullwhip Ratio*: Var(órdenes al proveedor) / Var(demanda en tienda)) baja al compartir POS y colaborar, igual que en el Beer Game, pero con retrasos.
3. **Decisiones con retraso:** un CD tarda 2–4 trimestres y la colaboración madura en 2–3; quien no anticipa se satura.

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
> Usen la **semilla del escenario** tal como aparece. Así todos los equipos con el mismo escenario enfrentan la misma demanda y los mismos eventos, y las diferencias se deben a sus decisiones.
>
> Cuando un evento les pegue, abran **"¿Por qué pasó esto?"**: el simulador explica la cadena causal. Al terminar los 20 trimestres verán un reporte final con un **debrief de seis preguntas**. No podrán exportar la corrida hasta responderlo. Respondan con datos de su corrida: KPIs, trimestres y decisiones. Esa respuesta es lo que se califica, más que el puntaje.»

Muestre en pantalla un trimestre de ejemplo: pestañas de decisiones, el diálogo de confirmación (costo, retraso, reversibilidad) y la bandeja de mensajes.

### A.4 Asignación de escenarios

Cada ficha del setup indica el concepto que ilustra y la región donde el contraste es más claro.

| Escenario | Región sugerida | Concepto | Semilla |
|---|---|---|---|
| Mercado estable | Kaigan | Línea base CTS vs. OSA | 4101 |
| Demanda incierta | Valle Metropolitano | Efecto látigo, POS compartido, VMI/CPFR, cross-dock sin amortiguador | 4202 |
| Presión de costos | Red River | Eficiencia vs. capacidad de respuesta, densidad, frecuencia | 4303 |
| Crecimiento acelerado | Valle Metropolitano | Capacidad con retrasos, mezcla hacia frescos | 4404 |

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

- ¿Qué decisión de Seven-Eleven Japan depende de la geografía y cuál no? (La información sí se trasplanta; la frecuencia de 3 entregas al día no necesariamente.)
- Entre equipos del mismo escenario: ¿quién tuvo mejor OSA y a qué CTS? ¿Qué decisión explica la diferencia?
- ¿Qué KPI mejoró primero al activar el POS compartido y por qué tardó?
- ¿En qué punto la densificación (dominancia) dejó de rendir por canibalización?
- ¿Qué evento les dolió más y qué decisión previa lo agravó?

---

## B. Rúbrica del debrief

### B.1 Requisitos para calificar

- El JSON pasa `npm run replay` (✓) y tiene `debrief_completo = sí`.
- La corrida está terminada (20 trimestres).

Si no se cumplen, devuelva la entrega para corrección antes de calificar.

### B.2 Criterios y niveles (100 puntos)

El puntaje del simulador **no** se califica directamente: se evalúa la calidad del razonamiento. Un equipo con puntaje bajo que diagnostica bien por qué le fue mal puede obtener la máxima calificación.

| Pregunta | Pts | Excelente (100%) | Satisfactorio (75%) | En desarrollo (50%) | Insuficiente (0–25%) |
|---|---|---|---|---|---|
| **DB-01** Propuesta de valor y decisiones de red y flujo; decisión clave | 15 | Describe red, flujo por categoría y frecuencia, y justifica su coherencia con la propuesta de valor **y** con la geografía de la región | Describe la red y la decisión clave con alguna justificación | Lista decisiones sin explicar por qué encajan | Genérica o sin relación con la corrida |
| **DB-02** KPI primario y guardrail con valores y *trade-off* | 20 | Nombra el par (p. ej., OSA y CTS), cita valores del reporte y explica el mecanismo del *trade-off* y cómo lo administró | Cita el par y valores; el *trade-off* es superficial | Nombra KPIs sin valores o sin *trade-off* | Confunde KPIs o no responde |
| **DB-03** Decisión con retraso | 15 | Ubica el trimestre de la decisión y el del efecto, el KPI afectado y por qué tardó (construcción de CD, curva de aprendizaje) | Identifica la decisión y el KPI con ubicación aproximada | Menciona un retraso sin evidencia de la corrida | No reconoce retrasos |
| **DB-04** Evento crítico y decisión previa | 15 | Rastrea la cadena causal (evento → regla → KPI) con «¿Por qué pasó esto?» y señala qué decisión lo agravó o lo amortiguó | Identifica el evento y una decisión relacionada | Describe el evento sin causalidad | No responde o atribuye todo a la mala suerte |
| **DB-05** Pregunta del escenario | 20 | Responde con evidencia cuantitativa y demuestra el concepto del escenario (B.3) | Usa el concepto correctamente con poca evidencia | Usa el concepto de forma vaga | No conecta con el escenario |
| **DB-06** Qué cambiaría al repetir | 15 | Hipótesis explícita: decisión → mecanismo → KPI esperado, coherente con lo observado | Propone un cambio razonable con un mecanismo parcial | Cambio sin mecanismo | «Nada» o respuesta genérica |

### B.3 Guía de respuesta para DB-05 por escenario

Una respuesta excelente suele incluir los elementos indicados. No son respuestas únicas: premie el razonamiento que se apoye en la evidencia de la corrida.

**Mercado estable** — *¿Cómo se repartió el CTS entre transporte, inventario y CD? ¿Qué inversión se pagó más rápido?*
- Usa el desglose de costos en cascada; identifica el componente dominante según la región (en Kaigan, inmobiliario y laboral alto; transporte más bajo por densidad).
- Distingue inversiones de red (CD: capex alto, 2–4 trimestres) de las de información (POS, pronóstico causal: más baratas y con retraso más corto).
- Sin ruido externo, atribuye los cambios de KPI a sus decisiones, no al mercado.

**Demanda incierta** — *¿Cómo evolucionó el BWR y qué palanca lo redujo más? ¿Afectó el cross-dock ante fallas del proveedor?*
- Reporta el BWR antes y después y lo conecta con el Beer Game: el efecto látigo nace de la falta de información y de los retrasos.
- Compara las palancas: el inventario de seguridad amortigua pero no corrige la señal; el POS compartido (D-31) y VMI/CPFR (D-33) atacan la causa, con retraso. La regla R-08 (POS compartido + CPFR maduro) reduce el lead time −20% y su variabilidad −30%.
- Reconoce R-06: cross-dock sin inventario con proveedores poco confiables transmite la falla completa a la tienda (evento X-04). Una buena respuesta discute si convenía un CD con inventario para las categorías expuestas.

**Presión de costos** — *¿Siguió pagando la frecuencia de entregas? ¿Cómo contuvo el CTS sin perder OSA?*
- Muestra el CTS al inicio y al final y lo vincula con el combustible al alza y la escasez de choferes (X-07).
- Discute la frecuencia (D-11) frente a la distancia entre tiendas: en Red River, 3 entregas al día disparan R-05.
- Menciona palancas de eficiencia: consolidación por temperatura (D-12), horas valle con escaneo (R-12), densificación (R-10) con su límite de canibalización, y el tipo de flota (D-13).
- Cuida el guardrail: si bajó el CTS, ¿qué pasó con la OSA y las ventas perdidas, considerando la competencia agresiva (X-06)?

**Crecimiento acelerado** — *¿Cuándo anticipó capacidad y cuándo se saturó? ¿Cómo cambiaron la merma y la OSA de frescos?*
- Ubica el trimestre de saturación (utilización de CD > 90%, R-07) y lo compara con el momento en que decidió ampliar o abrir CD, considerando el retraso de 2–4 trimestres.
- Explica que el envejecimiento desplaza la mezcla hacia frescos: más merma si la frecuencia y la cadena fría no acompañan (R-01, R-02).
- Una respuesta excelente reconoce el costo de anticipar demasiado (capex ocioso) frente al de llegar tarde (ventas perdidas).

**Escenario propio** — *¿Qué factores cambió, qué quería probar y qué confirmó o refutó?*
- Plantea una hipótesis explícita sobre los factores E-20…E-27 y la contrasta con KPIs. Si es posible, compara contra una corrida en un escenario predefinido.

### B.4 Retroalimentación rápida

Para el comentario al equipo, basta con señalar: (1) la respuesta más sólida, (2) la de menor evidencia y (3) una pregunta para el proyecto final: ¿qué *trade-off* de la red de su empresa se parece al que enfrentaron?

---

Las preguntas DB-01…DB-06 de esta guía reproducen las del simulador ([`app/src/debrief.ts`](./app/src/debrief.ts) y [`app/src/presets.ts`](./app/src/presets.ts)). Si cambian allá, actualícelas aquí.

[← Especificación](./especificacion.md) · [Sesión 4](../sesion-4.md) · [Volver al índice del curso](../README.md)
