# Sesión 7 — Gestión de proyectos de IA

**Fecha:** 9 de mayo de 2026 (sábado, bloque 2 de la sesión doble)
**Profesor:** Marcos
**Modalidad:** ⚠ *(por definir)*
**Ancla del packet:** Definir, planificar, ejecutar y comunicar proyectos de IA
**Ancla del plan de estudios:** Tema 6

> **Relevancia para el examen final:** el contenido de esta sesión **no se evalúa mediante quiz** (no hay quiz para S8); se evalúa con énfasis específico en el **examen presencial** de la sesión 8.

---

## Descripción de la sesión

Esta sesión cierra el contenido temático del curso con la pregunta operativa que ninguna empresa puede esquivar: **¿cómo se hace realmente un proyecto de IA?** Recorre el ciclo de vida end-to-end — *scoping*, planificación, gestión de datos, construcción y validación, despliegue y operación, y comunicación ejecutiva — integrando todo lo visto en sesiones anteriores: gobierno de datos (sesión 2), ética e IA generativa (sesión 3), marcos regulatorios y controles (sesión 4), aplicaciones comerciales (sesión 5) y casos (sesión 6). El énfasis es práctico: estructura de un *business case*, gestión de stakeholders, *roadmap* realista, métricas de decisión, criterios de éxito y fracaso, cómo presentar resultados a audiencias ejecutivas. La sesión también dedica tiempo a **preparar las presentaciones finales** que cada equipo defenderá en la sesión 8, con un ensayo cruzado entre equipos.

**Business question:** ¿Qué y cómo presentar los resultados de un proyecto de IA para la toma de decisiones en una empresa?

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Definir un proyecto de IA con alcance acotado, hipótesis testeable, métricas de éxito y criterios de fracaso explícitos.
- Identificar y gestionar *stakeholders*, incluyendo los silenciosos (usuarios finales, afectados, reguladores, operación).
- Construir un *roadmap* realista del proyecto (descubrimiento → PoC → piloto → producto → operación), con hitos, dependencias y riesgos.
- Diseñar un plan de gestión de datos que satisfaga los requisitos de gobernanza (sesión 2) y prácticas responsables (sesión 4).
- Comunicar resultados y decisiones a audiencias ejecutivas con estructura clara, evidencia y honestidad metodológica.
- Ensayar y recibir retroalimentación estructurada sobre la presentación final del proyecto del equipo.

---

## Estructura en clase (sugerida)

> Esta sesión se imparte el **9-may en el bloque 2**, inmediatamente después de la sesión 6 (Casos empresariales) en el mismo día.

1. **Quiz en línea (~15 min)** — Quiz 6, evalúa los contenidos de la sesión 6.
2. **Por qué fracasan los proyectos de IA (15 min):** causas recurrentes y cómo diseñar el proyecto para evitarlas.
3. **Scoping y business case (25 min):** problema, hipótesis, métrica anchor, criterios de éxito/fracaso.
4. **Stakeholders, roadmap y riesgos (30 min):** mapa de stakeholders, comunicación, hitos realistas, contingencias.
5. **Gestión de datos y modelo (25 min):** datos, validación, despliegue, monitoreo, *guardrails*.
6. **Comunicación ejecutiva (20 min):** estructura de una presentación ejecutiva, *storytelling* con evidencia, honestidad metodológica.
7. **Revisión cruzada entre equipos (35 min):** cada equipo ensaya su presentación final y recibe retroalimentación estructurada.
8. **Cierre e instrucciones para la sesión 8 (10 min):** logística de presentaciones, examen presencial, entregables finales.

---

## Subtemas (detalle)

> **Nota de alcance:** Esta sesión sintetiza en un flujo de proyecto todo lo visto en el curso. No introduce marcos nuevos; los aplica a la ejecución. Los contenidos teóricos específicos se ven en las sesiones 1–5; los casos integradores en la sesión 6.

### Bloque A — Por qué fracasan los proyectos de IA

- **Mal planteamiento del problema:** objetivo difuso, sin métrica anchor, sin criterio de fracaso.
- **Datos imaginarios:** datos que no existen en producción, calidad baja, permisos bloqueados.
- **Problema organizacional disfrazado de técnico:** el modelo existe, pero nadie cambia el proceso.
- **Gobernanza ausente:** ética, privacidad, regulación atendidas al final (cuando ya es caro).
- **Dependencia ciega de proveedor:** sin *fallback*, sin control de costo, sin portabilidad.
- **Expectativas infladas:** narrativa ejecutiva desconectada de la realidad del piloto.

### Bloque B — Scoping y business case

- **Definición del problema:** usuario, fricción actual, medida del impacto, contexto de decisión.
- **Hipótesis** y teoría del cambio: por qué IA es parte de la solución (y no una feature más).
- **Métrica anchor** y métricas de guardia (*guardrails*): qué quiero mejorar y qué no puedo empeorar.
- **Criterios de éxito y de fracaso** definidos *antes* de empezar.
- **Opciones de construcción:** buy vs. build vs. partner; GPAI vs. especializado vs. interno.
- **Análisis costo-beneficio:** costos totales (datos, cómputo, talento, riesgo) vs. beneficio esperado.

### Bloque C — Stakeholders, roadmap y riesgos

- **Mapa de stakeholders:** patrocinador, usuarios, operación, legal/compliance, seguridad, datos, afectados, reguladores. Quién decide, quién ejecuta, quién se ve afectado.
- **Plan de comunicación:** cadencia, formato por audiencia, umbrales de escalamiento.
- **Roadmap realista:** descubrimiento → PoC → piloto controlado → despliegue limitado → operación. Hitos, criterios de paso, tiempos ejemplo.
- **Gestión de riesgos:** registro de riesgos con probabilidad, impacto, owner, mitigación. Tipos de riesgo: datos, modelo, gobernanza, regulatorio, reputacional, operativo, financiero.
- **Cambio organizacional:** capacitación, nuevos roles, *change management*, adopción.

### Bloque D — Gestión de datos y modelo en el proyecto

- **Datos:** inventario, procedencia, calidad, permisos, privacidad (alineado con sesión 2).
- **Validación del modelo:** métricas técnicas + métricas de negocio; pruebas de sesgo y equidad.
- **Despliegue:** arquitectura (batch vs. streaming, on-prem vs. cloud), *A/B testing* en producción, *rollback*.
- **Monitoreo:** drift de datos y de concepto, degradación, métricas de guardia; alarmas y *runbooks*.
- ***Guardrails*** de IA generativa: *content filtering*, *grounding*, límites de uso, *red-teaming*.

### Bloque E — Comunicación ejecutiva

- **Estructura de una presentación ejecutiva:** problema → hipótesis → evidencia → recomendación → riesgos → pregunta de decisión.
- **Storytelling con evidencia:** cómo mostrar resultados sin ocultar supuestos ni inflar incertidumbre.
- **Honestidad metodológica:** limitaciones, supuestos, lo que no se probó, lo que podría salir mal.
- **Anti-patrones de presentación:** *tech jargon*, demos sin métricas, p-hacking visual, *cherry picking*.

### Bloque F — Ensayo cruzado (preparación de la sesión 8)

- Cada equipo presenta en formato corto a otro equipo, que actúa como comité ejecutivo.
- Retroalimentación estructurada por rúbrica: claridad, evidencia, riesgos, recomendación, Q&A.
- Ajustes finales para la presentación de la sesión 8.

> *No traslapa con Sesión 6:* allí se analizan casos reales; aquí se construye la *capacidad* de gestionar y presentar un proyecto propio.

---

## Actividad en clase

**Revisión cruzada entre equipos.** Tras una exposición de 15 min de las plantillas y la rúbrica:

1. Cada equipo presenta su proyecto en **formato corto (8 min)** a otro equipo, que asume el rol de comité ejecutivo.
2. Retroalimentación estructurada (5 min) usando la rúbrica de evaluación del proyecto: claridad del problema, solidez de la evidencia, tratamiento de riesgos, viabilidad de la recomendación, desempeño en Q&A.
3. Cada equipo recibe y da retroalimentación a al menos otro equipo.
4. Ajustes de 10 min para incorporar observaciones antes de la sesión 8.

**Entregable de la actividad:** notas de retroalimentación recibidas + versión ajustada del outline de presentación.

---

## Tarea / entregable

Para la sesión 8:

- **Reporte final del proyecto** (equipo): versión consolidada que integra los entregables de las sesiones 2 a 6.
- **Presentación final** (equipo): soporte visual, guion de exposición, reparto de tiempos.
- **Autoevaluación del equipo:** reparto de roles, dinámica, aprendizajes.

## Caso HBS

> ⚠ **Pendiente de asignación.** Por seleccionar desde [hbsp.harvard.edu](https://hbsp.harvard.edu) como fuente oficial.

## Libro de texto

- Rose, D. (2021). *Artificial intelligence for business: What you need to know about machine learning and neural networks* (2nd ed.). Pearson. — capítulos sobre adopción y proyectos.

## Lecturas recomendadas (APA)

- Siegel, E. (2024). *The AI playbook: Mastering the rare art of machine learning deployment*. MIT Press.
- Wilson, H. J., & Daugherty, P. R. (2018). *Human + machine: Reimagining work in the age of AI*. Harvard Business Review Press. — caps. sobre implementación.
- Davenport, T. H., & Mittal, N. (2023). *All-in on AI: How smart companies win big with artificial intelligence*. Harvard Business Review Press. — caps. finales sobre operación y escalamiento.
- Google Cloud Architecture Center. *MLOps: Continuous delivery and automation pipelines in machine learning* (white paper). https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning

## Complementos

- Plantilla de *business case* de proyecto de IA.
- Plantilla de mapa de stakeholders, registro de riesgos y roadmap.
- Rúbrica de evaluación de la presentación final.
- Lista de verificación pre-despliegue de IA responsable.

---

[← Volver al índice](./README.md)
