# Sesión 6 — Casos empresariales

**Fecha:** 9 de mayo de 2026 (sábado, bloque 1 de la sesión doble)
**Profesor:** Marcos
**Modalidad:** ⚠ *(por definir)*
**Ancla del packet:** Integración del curso mediante casos empresariales
**Ancla del plan de estudios:** Tema integrador

---

## Descripción de la sesión

Esta sesión es **integradora**. Su propósito es revisar **casos reales de adopción de IA en empresas** para observar cómo se articulan en la práctica los temas vistos hasta aquí: fundamentos (sesión 1), gobierno de datos y tecnologías emergentes (sesión 2), IA generativa y ética (sesión 3), prácticas responsables y regulación (sesión 4) y aplicaciones comerciales (sesión 5). No introduce marcos nuevos; se concentra en **patrones de éxito y fracaso** que se repiten en la adopción empresarial de IA: cómo se decidió el alcance, qué datos se usaron, qué tropiezos de gobernanza o éticos aparecieron, qué resultados se obtuvieron, qué aprendizajes se transfieren. El formato es **intensivo en discusión**, con casos preparados por el profesor y, cuando sea posible, con una intervención de invitado(a) de industria. La sesión alimenta directamente al proyecto final porque obliga a los equipos a comparar su caso con empresas reales comparables.

**Business question:** ¿Qué patrones de éxito y fracaso se observan en la adopción empresarial de IA y cómo se transfieren a nuestro contexto?

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Analizar casos reales de adopción de IA aplicando los marcos del curso (gobernanza, ética, regulación, KPIs comerciales).
- Identificar patrones recurrentes de éxito (*lessons learned*) y fracaso (*anti-patterns*) en proyectos empresariales de IA.
- Comparar el caso del proyecto de su equipo con 2 empresas análogas y extraer implicaciones accionables.
- Articular el caso del equipo como *business case* defendible ante un comité ejecutivo.

---

## Estructura en clase (sugerida)

1. **Quiz inicial en línea (~15 min)** — evalúa los contenidos de la sesión 5.
2. **Marco de análisis de casos (15 min):** plantilla común para leer un caso (contexto, problema, solución, datos, gobernanza, resultados, riesgos, aprendizajes).
3. **Caso HBS — *The Rise and Fall of IBM Watson's AI Medical System* (45 min):** lectura crítica y discusión guiada sobre los retos de despliegue comercial de IA en salud, aplicando la plantilla común.
4. **Invitado/a de industria (30 min, si aplica):** conversación estructurada sobre la adopción real y los tradeoffs vividos.
5. **Actividad en clase (35 min):** benchmarking del caso del equipo con 2 empresas comparables.
6. **Transición a bloque 2 (10 min):** cierre e introducción a la sesión 7 (Gestión de proyectos de IA), que se imparte inmediatamente después.

> **Transición a S7 (bloque 2):** entre los dos bloques se aplica el **Quiz 6** — que evalúa el contenido de esta sesión 6 — antes de arrancar con gestión de proyectos de IA.

---

## Subtemas (detalle)

> **Nota de alcance:** Esta sesión integra los contenidos de las sesiones 1–5 vía casos. No introduce marcos nuevos. Los temas que siguen (gestión de proyectos de IA, presentación ejecutiva) se trabajan en la sesión 7, en el bloque inmediatamente siguiente del mismo día.

### Bloque A — Marco de análisis de casos

- **Plantilla común** para cada caso: contexto de la empresa → problema de negocio → solución de IA → datos y arquitectura → gobernanza y ética → resultados → riesgos asumidos → aprendizajes transferibles.
- **Cómo leer un caso críticamente:** distinguir narrativa de marketing vs. evidencia; buscar las decisiones difíciles que el caso suele esconder.
- **Cómo transferir aprendizajes:** qué es generalizable (el patrón) vs. qué es contextual (la decisión específica).

### Bloque B — Familias de casos a trabajar en clase

Los casos se eligen año a año por el profesor para reflejar los temas más relevantes; las familias típicas son:

- **Personalización y recomendación a escala:** e-commerce y servicios digitales globales (p. ej. Amazon, Netflix, Spotify).
- **Automatización y copilots internos:** adopción de IA generativa en funciones de servicio, finanzas o tecnología.
- **IA en industrias altamente reguladas:** banca, seguros, salud; adopción bajo restricciones de compliance.
- **IA en cadenas de valor físicas:** retail minorista, logística, manufactura; combinación con IoT y digital twins.
- **Casos de falla pública de IA:** incidentes de sesgo, decisiones automáticas injustas, despliegues revertidos.

### Bloque C — Patrones recurrentes de éxito (lessons)

- **Problemas bien acotados y métricas anchor** antes del modelo.
- **Infraestructura de datos consolidada** antes (o en paralelo) de la iniciativa de IA.
- **Gobernanza operativa** (roles, cadencia, artefactos) desde el día uno.
- **Integración organizacional:** el cambio operativo importa más que el modelo.
- **Monitoreo continuo** post-despliegue.
- **Ciclos cortos** de experimentación con *holdouts*.

### Bloque D — Anti-patrones recurrentes (fallas)

- **Solución en busca de problema:** IA como fin, no como medio.
- **Datos imaginados:** el modelo suponía datos que no existían en producción.
- **Proxy dañinos:** variables que correlacionan con atributos protegidos y producen discriminación indirecta.
- **Alucinación en flujos críticos** no protegidos por *grounding* o validación.
- **Gobernanza declarativa:** principios en papel sin controles auditables.
- **Dependencia ciega de un proveedor** sin estrategia de *fallback*.

### Bloque E — Lectura del caso del equipo contra empresas reales

- **Benchmarking corto:** cada equipo identifica 2 empresas comparables a su caso (por sector, tamaño, problema) y extrae aprendizajes.
- **Qué copiar, qué adaptar, qué evitar.**

> *No traslapa con Sesión 5:* las aplicaciones comerciales específicas se trabajaron allá; aquí se integran en narrativas empresariales completas.
> *No traslapa con Sesión 7:* la gestión del proyecto (alcance, stakeholders, planeación, comunicación) se cubre en el bloque siguiente del mismo día.

---

## Actividad en clase

**Benchmarking del caso del equipo con 2 empresas reales.** En equipos:

1. Identificar **2 empresas comparables** al caso del proyecto por sector, tamaño o problema.
2. Para cada una, completar una ficha corta con:
   - Descripción del caso en 3 líneas.
   - **Patrón de éxito** principal y qué permitió el resultado.
   - **Anti-patrón** evitado (o sufrido).
   - Qué es **transferible** al caso del equipo y qué no.
3. Consolidar **3 aprendizajes accionables** para el proyecto del equipo.
4. Cada equipo comparte 3 minutos al grupo: los 3 aprendizajes y cómo cambian (si cambian) el diseño de su propuesta.

**Entregable de la actividad:** ficha por equipo con el benchmarking y los 3 aprendizajes accionables.

---

## Tarea / entregable

Vinculado al proyecto final: integrar los **3 aprendizajes accionables** y el benchmarking al borrador del reporte final. El reporte consolidado se presenta en la sesión 8.

---

## Caso HBS sugerido

- **Challenges in Commercial Deployment of AI: Insights from The Rise and Fall of IBM Watson's AI Medical System.** Huy, Q., Vuori, T., Ojanpera, T., & Duke, L. S. (2023, febrero 13). INSEAD / Harvard Business Publishing, Case No. **IN1896-PDF-ENG** (16 páginas; disciplina: Strategy). Tiempo estimado de lectura previa: ~34 min. Disponible en [hbsp.harvard.edu/product/IN1896-PDF-ENG](https://hbsp.harvard.edu/product/IN1896-PDF-ENG).
  - **Por qué esta sesión:** caso integrador por excelencia — expone los retos de comercialización de IA en un dominio crítico (salud), combina fundamentos técnicos (sesión 1), gobernanza de datos (sesión 2), cuestiones éticas (sesión 3), prácticas responsables (sesión 4) y aplicaciones comerciales (sesión 5) en una narrativa real de éxito anticipado seguido de retracción. Permite discutir **patrones de éxito** (Bloque C) y **anti-patrones** (Bloque D) con evidencia documentada de una empresa top.
  - **Decisiones que ancla la discusión:** cómo IBM definió el alcance inicial; qué supuestos sobre los datos clínicos resultaron erróneos; cómo se manejaron la comunicación pública y las expectativas de mercado; qué señales de alarma fueron ignoradas; qué aprendizajes son transferibles a cualquier despliegue comercial de IA.

## Libro de texto

- Rose, D. (2021). *Artificial intelligence for business: What you need to know about machine learning and neural networks* (2nd ed.). Pearson.

## Lecturas recomendadas (APA)

- Davenport, T. H., & Mittal, N. (2023). *All-in on AI: How smart companies win big with artificial intelligence*. Harvard Business Review Press. — casos por industria.
- Iansiti, M., & Lakhani, K. R. (2020). *Competing in the age of AI: Strategy and leadership when algorithms and networks run the world*. Harvard Business Review Press. — *AI factories* y casos (Ant Financial, Ocado, Microsoft).
- Wilson, H. J., & Daugherty, P. R. (2018). *Human + machine: Reimagining work in the age of AI*. Harvard Business Review Press. — casos de *collaborative intelligence*.
- MIT Sloan Management Review. (varios años). Casos seleccionados sobre adopción de IA en empresas. https://sloanreview.mit.edu/

## Complementos

- Plantilla de ficha de caso (contexto / problema / solución / datos / gobernanza / resultados / riesgos / aprendizajes).
- Plantilla de benchmarking contra empresas comparables.
- Invitado/a de industria sugerido — preferiblemente un/a líder que haya vivido adopción real.

---

[← Volver al índice](./README.md)
