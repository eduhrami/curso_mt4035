# Sesión 1 — Fundamentos analíticos para retail y e-commerce

**Fecha:** 23 de abril de 2026  
**Profesores:** Eduardo y Marcos (co-impartida; distribución de temas por definir)  
**Ancla del packet:** Fundamentos analíticos y marco metodológico del curso  
**Ancla del plan de estudios:** Tema 1

---

## Descripción de la sesión

Esta sesión es de carácter **metodológico**. Su propósito es construir la caja de herramientas estadística y analítica que se usará de forma transversal en el resto del curso, presentando cada herramienta desde un punto de vista **conceptual, no formal**: qué pregunta de negocio responde, qué supuestos tiene, cómo se interpreta y dónde se aplica en retail, e-commerce y supply chain. Primero se establece el marco general (qué es analítica en retail, de dónde vienen los datos, cómo se pasa de dato a decisión y cómo una taxonomía de KPIs organiza los resultados del negocio). Sobre esa base se recorre la caja de herramientas: variabilidad y distribuciones, muestreo y representatividad, pruebas de hipótesis y p-value, correlación vs. causalidad, regresión, series de tiempo y análisis de sobrevivencia. El objetivo no es profundizar en fórmulas, sino dejar un lenguaje común y criterios de elección que las sesiones posteriores aplicarán a problemas concretos.

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Explicar qué es analítica en retail, de dónde vienen los datos (POS, web/app, CRM, supply chain) y cómo se encadena dato -> KPI -> pregunta de negocio -> decisión.
- Distinguir las familias de analítica (descriptiva, diagnóstica, predictiva, prescriptiva) y relacionarlas con la taxonomía de KPIs del curso.
- Reconocer los principales tipos de distribuciones estadísticas y qué fenómenos de negocio tienden a representar (normales, heavy/long tail, tiempos entre eventos, conteos raros).
- Interpretar conceptualmente una prueba de hipótesis: hipótesis nula vs. alternativa, estadístico de prueba, p-value, y cuándo tiene sentido una prueba de una cola vs. dos colas.
- Diferenciar correlación y causalidad, y reconocer cuándo una regresión explica, cuándo predice y cuándo engaña.
- Entender el propósito de técnicas de series de tiempo y análisis de sobrevivencia como herramientas para modelar tendencias, estacionalidad y fenómenos de tiempo-a-evento en retail.
- Argumentar por qué el muestreo y la representatividad son condición previa a cualquier análisis cuantitativo serio.

---

## Estructura en clase (sugerida)

1. **Mapa del curso (10 min):** técnicas analíticas -> clientes -> operaciones -> supply chain -> tecnologías emergentes, y dónde se conecta cada sesión.
2. **Del dato a la decisión + taxonomía de KPIs (25 min):** fuentes, granularidades, familias de analítica y KPIs como mapa de resultados de negocio.
3. **Caja de herramientas estadística — bloque conceptual (75 min):**
   - Variabilidad y distribuciones (qué fenómenos representan).
   - Muestreo y representatividad.
   - Pruebas de hipótesis, estadístico de prueba y p-value.
   - Correlación vs. causalidad.
   - Regresión, series de tiempo y análisis de sobrevivencia.
4. **Mini-caso guiado (20 min):** "Si fueras CDO de un retailer, ¿qué herramienta de la caja usarías para cada pregunta de negocio?" — se asigna una herramienta por pregunta sin resolver cálculos.
5. **Cierre y continuidad (10 min):** cómo cada herramienta reaparece en las sesiones 2–7.

---

## Subtemas (detalle)

> **Nota de alcance:** Esta sesión es metodológica y conceptual. Se nombran y explican herramientas; **no** se desarrollan derivaciones, demostraciones ni ejercicios de cálculo. Las aplicaciones operativas se profundizan en sesiones posteriores (ver notas de no-traslape al final de cada bloque).

### Bloque A — Marco general

- **Qué es "analítica" en retail:** descriptivo (qué pasó), diagnóstico (por qué pasó), predictivo (qué pasará), prescriptivo (qué conviene hacer); por qué un mismo problema suele requerir varias de estas capas.
- **Fuentes de datos y granularidad:** POS (ticket/SKU), e-commerce (sesión/eventos), marketing (campañas), CRM/lealtad, inventarios, logística/entregas, devoluciones; unidades de observación y periodicidad.
- **De dato a decisión:** métrica -> KPI -> pregunta de negocio -> método analítico -> decisión -> medición del resultado.
- **Taxonomía de KPIs como mapa:** crecimiento, rentabilidad, retención, experiencia y cumplimiento; qué tipo de preguntas ayuda a formular cada familia y cómo orienta la comparación entre periodos, canales y segmentos.

### Bloque B — Variabilidad y distribuciones

- **Estadística descriptiva y variabilidad:** media, mediana, percentiles, dispersión, outliers; por qué el promedio casi siempre "miente" en retail y cuándo conviene leer la distribución completa.
- **Distribuciones y fenómenos que representan (visión conceptual):**
  - *Normal / gaussiana:* errores de medición, agregados grandes, desviaciones alrededor de un objetivo (p. ej., tiempos de proceso estables).
  - *Log-normal y heavy / long tail (incluye power-law):* ventas por SKU, ticket de compra, valor del cliente, tamaño de pedidos; muchas métricas de retail son de cola pesada y por eso el promedio es un mal resumen.
  - *Exponencial / Weibull:* tiempos entre eventos (tiempo entre compras, tiempo a la siguiente visita, vida útil de un equipo).
  - *Poisson:* conteo de eventos raros en una ventana (llegadas a caja, reclamos, intentos de fraude por hora).
  - *Binomial / Bernoulli:* conversiones, tasas de click, éxitos vs. fracasos.
  - *Uniforme:* cuando asumimos "no hay preferencia" como punto de partida.
- **Por qué identificar la distribución importa:** elegir el resumen correcto (media vs. mediana vs. cuantiles), detectar cuándo un método "normal" no aplica, y reconocer que las decisiones en colas pesadas las mueven unos pocos casos extremos.

> *No traslapa con Sesión 3:* aquí no se ajustan modelos de demanda; solo se nombran las distribuciones y los fenómenos que representan.

### Bloque C — Muestreo y representatividad

- **Por qué importa el muestreo:** todo análisis asume que los datos observados hablan por una población mayor; si el marco muestral está torcido, el análisis lo estará también.
- **Sesgos frecuentes en retail:** encuestas sólo a clientes activos, paneles autoseleccionados, datos de lealtad que ignoran al comprador anónimo, registros de e-commerce sin offline.
- **Representatividad y tamaño:** intuición sobre por qué muestras más grandes no arreglan un sesgo de selección, y por qué "más datos" no equivale a "mejores datos".

### Bloque D — Pruebas de hipótesis (visión conceptual)

- **La lógica del contraste:** planteamos una hipótesis nula (H0, "no hay efecto" o "nada cambió") y una alternativa (H1); los datos se usan para decidir si H0 resulta inverosímil.
- **Estadístico de prueba:** cómo resumimos la evidencia en un solo número que mide "qué tan lejos" están los datos observados del mundo donde H0 es cierta.
- **P-value e interpretación correcta:** probabilidad de observar un resultado al menos tan extremo como el observado *si H0 fuera cierta*; **no** es la probabilidad de que H0 sea cierta, ni el tamaño del efecto, ni una medida de importancia de negocio. Discusión de malinterpretaciones frecuentes en tableros y reportes ejecutivos.
- **Una cola vs. dos colas:** cuándo la pregunta es "¿cambió?" (dos colas) y cuándo es "¿mejoró en una dirección específica?" (una cola); la elección debe hacerse **antes** de ver los datos.
- **Errores tipo I y tipo II (intuición):** el costo de "ver efectos donde no hay" vs. "no ver efectos donde sí los hay", y cómo este trade-off se traduce en decisiones de negocio (ej.: lanzar o no una promoción).

> *No traslapa con Sesión 3:* el diseño operativo y la ejecución de pruebas A/B se trabaja allá; aquí solo se construye la lógica conceptual que A/B usa.

### Bloque E — Correlación, causalidad y regresión

- **Correlación no es causalidad:** cómo dos curvas pueden moverse juntas por una tercera variable (confusor), por efecto estacional, o por pura coincidencia en series cortas.
- **Criterios informales para sospechar causalidad:** temporalidad, plausibilidad, dosis-respuesta, mecanismo; y por qué los experimentos (A/B) son la manera limpia de romper la ambigüedad.
- **Regresión (intuición):** modelar cómo una variable de resultado depende de otras; diferencia entre usarla para **explicar** (entender el efecto de un driver) y usarla para **predecir** (anticipar un valor). Qué dice y qué no dice un coeficiente.
- **Señales de alarma:** variables omitidas, colinealidad, extrapolación fuera del rango observado, "ensalada de variables" sin hipótesis previa.

> *No traslapa con Sesión 2:* RFM/CLV y modelos de segmentación aplicados se ven allá; aquí sólo se presenta la lógica de relacionar variables.

### Bloque F — Tiempo y eventos

- **Series de tiempo (intuición):** componentes de tendencia, estacionalidad (semanal, mensual, anual, festividades), ciclo y ruido; horizonte de decisión y noción de error de pronóstico; por qué el mismo dato se ve distinto según el nivel de agregación.
- **Análisis de sobrevivencia (intuición):** herramientas pensadas para modelar **tiempo hasta un evento** (churn de cliente, tiempo a la siguiente compra, vida útil de un activo, tiempo a stock-out). Idea clave de "censura" (clientes que todavía no han churneado al cierre del análisis) y por qué usar regresiones ordinarias sobre estos tiempos lleva a conclusiones equivocadas.
- **Experimentación A/B (vista conceptual):** aterrizaje de pruebas de hipótesis al diseño de experimentos controlados; grupos comparables, asignación aleatoria, métricas primarias declaradas antes del experimento.

> *No traslapa con Sesión 3:* pronósticos operativos de demanda; *ni con Sesión 5:* KPIs logísticos y ruteo; *ni con Sesión 6:* detección de fraude.

### Bloque G — Cierre metodológico

- **Optimización y modelos matemáticos (intuición):** cuándo el problema deja de ser "medir/predecir" y pasa a ser "decidir bajo restricciones" (trade-offs, costo-servicio); por qué aparece en inventarios, red y logística.
- **Diccionario de métricas y calidad de datos:** definiciones, ventanas de tiempo, fuentes, owner, trazabilidad y consistencia; por qué sin esto cualquier análisis es frágil.
- **Continuidad del curso:** cómo la caja de herramientas aterriza en segmentación/CLV (Sesión 2), demanda, inventario y A/B testing (Sesión 3), red e inventarios (Sesión 4), logística (Sesión 5), pricing y fraude (Sesión 6) y tecnologías emergentes (Sesión 7).

---

## Actividad en clase

Análisis de un **retailer omnicanal y sus KPIs** aplicando la caja de herramientas estadística del día. En equipos:

1. Seleccionar (o recibir del profesor) un retailer omnicanal real — con presencia física y digital — sobre el que se tenga información pública suficiente (prensa, reportes anuales, sitio web, observación directa).
2. Identificar **5–7 KPIs** relevantes para el retailer, cubriendo distintas familias: crecimiento, rentabilidad, retención, experiencia y cumplimiento.
3. Para cada KPI, anotar:
   - La probable **distribución** de los datos subyacentes (normal, heavy / long tail, Poisson, exponencial, etc.) y por qué.
   - La(s) **herramienta(s)** de la caja del día que usarían para analizarlo (estadística descriptiva, pruebas de hipótesis, regresión, series de tiempo, sobrevivencia, experimento, etc.) y por qué.
   - Una **pregunta de negocio** que el KPI ayuda a responder y la decisión que habilitaría.
4. Cada equipo comparte 2 minutos al grupo: retailer elegido, 2 KPIs con herramienta asignada y una decisión de negocio que habilitarían.

**Entregable de la actividad:** hoja resumen por equipo con los KPIs, distribuciones esperadas, herramientas asignadas y decisiones habilitadas.

---

## Tarea / entregable

- Formar equipos; shortlist de empresas candidatas (con presencia física + online) para el proyecto final.

---

## Libro de texto

- Berman, B., Evans, J. R., & Chatterjee, P. M. (2021). *Retail management: A strategic approach* (13th ed.). Pearson.

## Lecturas recomendadas (APA)

- Davenport, T. H. (2006, January). Competing on analytics. *Harvard Business Review*. https://hbr.org/2006/01/competing-on-analytics
- Downey, A. B. (2025). *Think stats: Exploratory data analysis in Python* (3rd ed.). O'Reilly Media. Versión abierta en notebooks: https://allendowney.github.io/ThinkStats/
- Okunev, R. (2022). *Analytics for retail: A step-by-step guide to the statistics behind a successful retail business*. Apress. https://doi.org/10.1007/978-1-4842-7830-7

> *Guía de lectura de Think Stats (3e) para esta sesión:* capítulos iniciales sobre distribuciones, estadística descriptiva, pruebas de hipótesis y relaciones entre variables. Leerlos como **construcción de intuición**, no como referencia de implementación.
>
> *Guía de lectura de Okunev (2022) para esta sesión — técnicas analíticas:* caps. 1–3 (estadística descriptiva, curva normal, probabilidad), cap. 6 (comunicación visual de frecuencias y porcentajes), caps. 7–9 (pruebas de hipótesis, correlación de Pearson y regresión lineal, t-test independiente) y cap. 10 (caso integrador tipo campaña de email). Usarlos como **catálogo de técnicas estadísticas aplicadas al retail**, complementario a la intuición de Downey.

## Complementos

- Handout del profesor sobre "árboles de KPI de retail" y "medición omnicanal".
- Tabla-resumen de la caja de herramientas estadística: herramienta -> pregunta de negocio típica -> supuesto clave -> sesión del curso en que se profundiza.

## Bibliografía complementaria (Manning)

- Khalil, M. (2025). *Effective data analysis: Hard and soft skills to accelerate your career*. Manning. https://www.manning.com/books/effective-data-analysis
- Gold, C. S. (2020). *Fighting churn with data: The science and strategy of customer retention*. Manning. https://www.manning.com/books/fighting-churn-with-data

---

[← Volver al índice](./README.md)
