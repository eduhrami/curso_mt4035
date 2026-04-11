# Sesión 3 — Analítica de ventas e inventario (pronóstico, demanda, pruebas A/B)

**Fecha:** 6 de mayo de 2026  
**Profesor:** Marcos  
**Ancla del plan de estudios:** Tema 3  
**Nota:** El packet combina ventas/inventario con segmentación antes; esta guía lo separa para crear 8 sesiones

---

## Descripción de la sesión

En esta sesión se analizan de forma crítica los datos de ventas e inventario, diferenciando entre lo que el cliente quiso comprar, lo que efectivamente compró y lo que se perdió por falta de producto. Se presenta una visión general de los flujos de pronóstico de demanda, incorporando patrones de estacionalidad y eventos especiales. Finalmente, se introduce el uso de experimentos y pruebas A/B en retail para evaluar cambios comerciales u operativos de forma rigurosa.

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Distinguir demanda vs ventas vs ventas perdidas y comprender el sesgo por quiebres de stock
- Trazar un flujo de pronóstico de demanda que incorpore estacionalidad y eventos relevantes
- Identificar cuándo y cómo usar experimentos (A/B) para medir el impacto de decisiones sobre ventas e inventario

---

## Estructura en clase

**Quiz inicial en línea (~15 min):** quiz en Canvas al inicio de la sesión, sobre los contenidos de la Sesión 2 (segmentación y perfilado de clientes).

1. **Demanda vs ventas vs quiebres** (por qué "ventas" puede mentir)
2. **Visión general de pronóstico** (baseline, estacionalidad, eventos)
3. **Pruebas A/B en retail:** guardrails, KPIs, errores comunes

## Subtemas (detalle)

- **Demanda censurada:** ventas observadas vs demanda real; cómo los stock-outs "recortan" la serie y sesgan conclusiones
- **Ventas perdidas y sustitución:** señales (agotado online, sustituciones, cancelaciones) y aproximaciones para cuantificar pérdida
- **Datos de inventario:** snapshots, inventario disponible vs inventario en tránsito, on-shelf availability y sus trampas
- **Forecasting pipeline:** limpieza, agregación jerárquica (SKU-tienda vs categoría), baselines (naive, moving average), estacionalidad y eventos/promociones
- **Métricas de pronóstico:** MAPE/WAPE, sesgo (bias), intervalos; por qué el error impacta fill rate y costo de inventario
- **Intervenciones medibles:** cambios de surtido, planogramas, reposición, UI de disponibilidad; qué KPI toca cada uno
- **Experimentos en retail (operación/merchandising):** diseño A/B (tiendas/zona), efectos de estacionalidad, interferencia y guardrails
- **Alternativas a A/B:** diferencias-en-diferencias / before-after con controles cuando no hay randomización
- **Continuidad y no-overlap:** definición general de KPIs/diccionario se ve en Sesión 1; segmentación/CLV se ve en Sesión 2; políticas de inventario (EOQ/ROP) y red se profundizan en Sesión 4

---

## Actividad en clase

Lectura y discusión en clase del caso **Tesco Group Food** (HBS 514022, incluido en las lecturas de la sesión). En equipos:

1. Lectura individual guiada (≈15 min) de las secciones clave del caso.
2. Identificar: (i) dónde hay posible **demanda censurada** por stock-outs, (ii) qué decisiones de surtido, reposición o disponibilidad tomarían a partir de los datos del caso, (iii) qué **sesgos o datos faltantes** limitan el análisis.
3. Diseño rápido de un **experimento** (A/B o cuasi-experimento) para probar una intervención operativa o de merchandising: hipótesis, métrica primaria, grupos comparables, guardrail.

**Entregable de la actividad:** ficha del equipo con hallazgos del caso y diseño del experimento.

---

## Tarea / entregable

- Proyecto: definir 3 KPIs operativos de inventario/disponibilidad y cómo medirlos
- Proponer 1 hipótesis de mejora que pueda evaluarse con experimento o cuasi-experimento

---

## Libro de texto

- Agrawal, N., & Smith, S. A. (Eds.). (2015). *Retail supply chain management: Quantitative models and empirical studies* (2nd ed.). Springer.

## Lecturas recomendadas (APA)

- Alvarez, J. B., McLoughlin, D. P., & Shelman, M. (2014, January 16). *Tesco Group Food* (Case No. 514022). Harvard Business School. https://store.hbr.org/product/tesco-group-food/514022

## Complementos

- Manual/primer de experimentación y pruebas A/B (capítulos seleccionados)

---

[← Volver al índice](./README.md)
