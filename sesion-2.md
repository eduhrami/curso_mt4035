# Sesión 2 — Segmentación y perfilado (CLV, RFM, personalización)

**Fecha:** 29 de abril de 2026  
**Profesor:** Marcos  
**Ancla del packet:** La Sesión 2 incluye segmentación/perfilado  
**Ancla del plan de estudios:** Tema 2

---

## Descripción de la sesión

Esta sesión profundiza en la creación de valor a través del entendimiento del cliente. Se introducen los conceptos de valor de vida del cliente (CLV) y de segmentación basada en RFM, discutiendo cómo estos enfoques permiten priorizar clientes y diseñar propuestas diferenciadas. A partir de ejercicios prácticos, se conecta cada segmento con decisiones concretas de targeting, personalización, canales y medición de resultados.

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Explicar CLV e implementar lógica tipo RFM para clasificar clientes
- Traducir segmentos en acciones (targeting, personalización, ofertas) alineadas a objetivos de negocio
- Plantear hipótesis de segmentación y definir KPIs para evaluar el impacto de las acciones propuestas

---

## Estructura en clase

**Quiz inicial en línea (~15 min):** quiz en Canvas al inicio de la sesión, sobre los contenidos de la Sesión 1 (caja de herramientas analítica).

1. **Intuición de CLV** (unit economics, drivers de retención)
2. **Taller RFM** (pizarrón + hoja de cálculo)
3. **Segmento → oferta → canal → KPI**

## Subtemas (detalle)

- **Unit economics orientado a cliente:** margen de contribución, CAC, payback, churn/retención; por qué CLV es un puente entre marketing y finanzas
- **CLV (descriptivo):** cohortes, tasas de retención, frecuencia, ticket y margen; CLV histórico vs CLV "a futuro" (con descuento)
- **CLV (predictivo):** modelos simples de probabilidad de compra/retención; cuándo usar modelos estadísticos/ML vs reglas
- **RFM en práctica:** definición de ventanas (recency/frequency/monetary), scoring por cuantiles, estabilidad en el tiempo y riesgos de sobreinterpretación
- **Segmentación accionable:** segmentos por valor vs por necesidad/comportamiento; cómo evitar segmentos "bonitos" pero inútiles
- **Personalización y recomendaciones:** intuición de filtrado colaborativo (Amazon) y métricas de evaluación (CTR, conversión, AOV, margen)
- **Medición de impacto:** diseño de tests (holdout/A-B), incrementality vs correlación, guardrails (p. ej. margen, reclamos)
- **Riesgos y límites:** resolución de identidad (online/offline), sesgos, privacidad y compliance
- **Continuidad y no-overlap:** la taxonomía general de KPIs y el diccionario de métricas se ve en Sesión 1; demanda/inventario y sesgo por stock-outs se profundiza en Sesión 3

---

## Actividad en clase

Caso de segmentación presentado por el profesor en clase: a partir de una descripción breve (o dataset simple) de la cartera de clientes de un retailer, en equipos:

1. Proponer umbrales de scoring **RFM** y clasificar a los clientes en 4–5 segmentos accionables (por ejemplo *champions*, *leales*, *nuevos*, *en riesgo*, *durmientes*).
2. Para los 3 segmentos más grandes, proponer: **acción comercial**, **canal**, **KPI de éxito** y un **guardrail** (por ejemplo margen o tasa de reclamos).
3. Identificar al menos un **riesgo operativo o ético** de la segmentación propuesta (resolución de identidad, privacidad, sesgos por canal o por historial).

**Entregable de la actividad:** tabla del equipo con segmentos, acciones, KPIs y guardrails.

---

## Tarea / entregable

- Hipótesis de segmentación para el proyecto: segmentos esperados + acciones propuestas
- Definir 1 KPI principal de éxito (y 1 guardrail) para evaluar una acción por segmento

---

## Libro de texto

- Berman, B., Evans, J. R., & Chatterjee, P. M. (2021). *Retail management: A strategic approach* (13th ed.). Pearson.

## Lecturas recomendadas (APA)

- Linden, G., Smith, B., & York, J. (2003). Amazon.com recommendations: Item-to-item collaborative filtering. *IEEE Internet Computing, 7*(1), 76–80. https://doi.org/10.1109/MIC.2003.1167344

## Complementos

- Texto práctico de analítica de clientes/marketing analytics (capítulos de segmentación + CLV)

---

[← Volver al índice](./README.md)
