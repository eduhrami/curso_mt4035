# Sesión 3 — IA generativa + Ética de la IA

**Fecha:** 30 de abril de 2026 (jueves)
**Profesor:** Eduardo
**Modalidad:** ⚠ *(por definir)*
**Ancla del packet:** IA generativa como frontera tecnológica y ética algorítmica como marco de control
**Ancla del plan de estudios:** Temas 3 y 4

---

## Descripción de la sesión

Sesión doble en contenido (mismo bloque de tiempo): primero profundiza en **IA generativa** — qué es, cómo funciona a nivel intuitivo, qué patrones de aplicación existen (chat, copilot, automatización, generación de contenido, agentes) y qué riesgos específicos introduce (alucinación, propiedad intelectual, privacidad, seguridad, costo) — y después conecta con **ética de la IA** como marco para controlar esos riesgos y los de cualquier sistema de IA: sesgo, equidad, transparencia, explicabilidad y accountability. El énfasis está en IA generativa porque es la familia de modelos con adopción más acelerada y porque introduce tensiones éticas nuevas que las organizaciones están aprendiendo a gobernar en tiempo real. La sesión cierra anudando ambos bloques: **toda aplicación de IA (en particular generativa) requiere un marco ético explícito antes de desplegarse a clientes o empleados**.

**Business question:** ¿Cómo puede la IA generativa transformar a las empresas y cómo se construye una estrategia de control ético sobre los datos y modelos que utiliza?

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Explicar qué es la IA generativa, sus familias principales (LLMs, modelos de difusión, multimodales) y sus capacidades y limitaciones actuales a nivel intuitivo.
- Identificar patrones de aplicación empresarial de IA generativa (RAG, agentes, fine-tuning, prompting) y elegir el adecuado para un problema dado.
- Reconocer los riesgos específicos de la IA generativa: alucinación, fuga de información, propiedad intelectual, prompt injection, costo y dependencia de proveedor.
- Diferenciar los tipos de sesgo (datos, modelo, despliegue) y las métricas de equidad más usadas, con sus trade-offs.
- Distinguir interpretabilidad intrínseca vs. explicabilidad post-hoc (LIME, SHAP como panorama) y cuándo se requiere cada una.
- Articular una estrategia ética mínima viable para un caso de IA generativa: principios, controles, medición y accountability.

---

## Estructura en clase (sugerida)

1. **Quiz inicial en línea (~15 min)** — evalúa los contenidos de la sesión 2.
2. **IA generativa — marco conceptual (30 min):** qué es, cómo funciona a nivel intuitivo, qué la hace distinta de la IA predictiva.
3. **Patrones de aplicación empresarial (30 min):** prompting, RAG, fine-tuning, agentes; cuándo usar cada uno.
4. **Riesgos específicos de IA generativa (25 min):** alucinación, PII, IP, prompt injection, costo, lock-in.
5. **Ética de la IA — marco conceptual (35 min):** sesgo, equidad, transparencia, explicabilidad, accountability.
6. **Actividad en clase (30 min):** diseño de caso de uso de IA generativa + matriz de riesgos éticos.
7. **Cierre y continuidad (10 min):** puente a prácticas responsables (sesión 4) como síntesis operativa.

---

## Subtemas (detalle)

> **Nota de alcance:** Esta sesión cubre los fundamentos y aplicaciones de IA generativa y la ética algorítmica como marco. Los marcos regulatorios (EU AI Act, NIST AI RMF, ISO/IEC 42001) se profundizan en la sesión 4; las aplicaciones comerciales específicas de IA (incluyendo generativa) se trabajan en la sesión 5.

### Bloque A — IA generativa: marco conceptual

- **Qué es** IA generativa: sistemas que generan contenido nuevo (texto, imágenes, audio, código, video) a partir de *prompts* o estímulos.
- **Familias principales:**
  - *Modelos de lenguaje (LLMs):* GPT, Claude, Gemini, Llama; qué es tokenización, contexto, temperatura, a nivel intuitivo.
  - *Modelos de difusión:* imagen y video (Stable Diffusion, Imagen, Sora) — qué los hace distintos.
  - *Modelos multimodales:* entrada y salida combinando texto, imagen, audio, video.
- **Cómo funcionan a nivel intuitivo:** entrenamiento en grandes corpus, predicción del siguiente token/pixel/muestra, aprendizaje por refuerzo con retroalimentación humana (RLHF) como ajuste fino.
- **Capacidades y limitaciones actuales:** razonamiento, memoria, uso de herramientas, calidad de salida; alucinación como falla estructural, no bug.

### Bloque B — Patrones de aplicación empresarial

- **Prompting:** ingeniería de instrucciones, prompting cero-shot vs. few-shot, cadena de pensamiento.
- **RAG (Retrieval-Augmented Generation):** combinar LLMs con fuentes de información propias; cuándo sí, cuándo no.
- **Fine-tuning:** cuándo vale la pena especializar un modelo vs. mantenerlo general; costo y gobernanza asociados.
- **Agentes:** LLMs que usan herramientas y ejecutan tareas encadenadas; patrones (ReAct, plan-and-execute); riesgos de autonomía.
- **Casos típicos por industria:** atención al cliente, generación de contenido, resumen de documentos, copilots internos, análisis de datos, traducción, programación asistida.

> *No traslapa con Sesión 5:* las aplicaciones comerciales y de mercadotecnia se profundizan allá.

### Bloque C — Riesgos específicos de la IA generativa

- **Alucinación:** el modelo produce información plausible pero falsa; por qué sucede y cómo mitigar (RAG, grounding, citación obligatoria).
- **Privacidad y PII:** datos sensibles en prompts, fuga entre clientes, retención por proveedor.
- **Propiedad intelectual:** derechos de los datos de entrenamiento, de los outputs, atribución, licencias.
- **Seguridad:** prompt injection, jailbreaking, exfiltración vía agentes.
- **Costo y sostenibilidad:** costo por token, latencia, consumo energético, dependencia de proveedor (lock-in).
- **Calidad inconsistente:** variabilidad entre ejecuciones, drift del proveedor, versiones del modelo.

### Bloque D — Ética de la IA: marco conceptual

- **Por qué ética ahora:** los sistemas de IA toman o sugieren decisiones que afectan personas; la escala amplifica tanto el valor como el daño.
- **Principios operativos recurrentes** (base para la sesión 4): accountability, equidad, transparencia, seguridad, privacidad, beneficio humano.
- **Tipos de sesgo:**
  - *De datos:* muestra no representativa, etiquetas sesgadas, ausencias.
  - *De modelo:* elección de features, objetivo mal formulado, overfit en subgrupos.
  - *De despliegue:* retroalimentación (el modelo afecta la realidad que mide), uso fuera del contexto de entrenamiento.
- **Métricas de equidad:** paridad demográfica, igualdad de oportunidad, calibración; por qué **no se pueden satisfacer todas al mismo tiempo** (teorema de imposibilidad) — implicación para decisiones.

### Bloque E — Transparencia, explicabilidad, accountability

- **Interpretabilidad intrínseca** (modelos simples explicables por construcción) vs. **explicabilidad post-hoc** (técnicas para explicar modelos complejos).
- **Técnicas post-hoc** a nivel panorámico: LIME, SHAP, *counterfactual explanations*.
- **Para quién se explica:** ingeniero, auditor, regulador, usuario final, afectado; el formato cambia con la audiencia.
- **Accountability:** trazabilidad, auditoría, *impact assessments*, cadena de responsabilidad.
- **Privacidad desde el ángulo algorítmico:** riesgo de reidentificación, privacidad diferencial (intuición), *federated learning*.

### Bloque F — Integración: estrategia ética para IA generativa

- Cómo pasar de principios a controles operativos: lista de verificación antes de desplegar un caso de uso generativo.
- Redacción de una *política de uso responsable* mínima para una organización.
- Puente con la sesión 4, donde estos elementos se anclan a marcos regulatorios (EU AI Act, NIST AI RMF, ISO/IEC 42001).

---

## Actividad en clase

**Diseño y diagnóstico de un caso de uso de IA generativa.** En equipos:

1. Partiendo del caso del proyecto del equipo, diseñar un **caso de uso candidato de IA generativa** con:
   - Problema de negocio y usuario objetivo.
   - Patrón de aplicación elegido (prompting, RAG, fine-tuning o agente) y por qué.
   - Datos que alimentan el sistema y controles de privacidad asociados.
   - **Matriz de riesgos éticos** con 4 filas mínimo (sesgo, privacidad, transparencia, accountability) — cada fila con: descripción del riesgo, impacto potencial, mitigación propuesta, métrica de control.
2. Cada equipo comparte 3 minutos al grupo: caso de uso y el riesgo ético más importante con su mitigación.

**Entregable de la actividad:** ficha por equipo con el caso y la matriz de riesgos éticos.

---

## Tarea / entregable

Vinculado al proyecto final: entregar un **caso de uso de IA generativa validado** (2 páginas) con el patrón elegido, los datos involucrados y la matriz de riesgos éticos, integrando el diagnóstico de la sesión 2 (gobernanza + tecnologías emergentes).

---

## Caso HBS sugerido

- **The Clueless: Navigating an Ethical AI Marketing Dilemma.** Pradhan, S., & Chattopadhyay, M. Ivey Publishing, Case No. **W39696**. Distribuido vía Harvard Business Publishing: [hbsp.harvard.edu/product/W39696-PDF-ENG](https://hbsp.harvard.edu/product/W39696-PDF-ENG).
  - **Por qué esta sesión:** ancla la discusión ética en un dilema real de IA aplicada a mercadotecnia — escenario natural para trabajar los bloques D (tipos de sesgo, métricas de equidad), E (transparencia, explicabilidad, accountability) y F (estrategia ética mínima viable) de esta sesión. La arista comercial del caso crea además un puente claro hacia los patrones de IA comercial que se profundizan en la sesión 5.

## Libro de texto

- Rose, D. (2021). *Artificial intelligence for business: What you need to know about machine learning and neural networks* (2nd ed.). Pearson.

## Lecturas recomendadas (APA)

- Barocas, S., Hardt, M., & Narayanan, A. (2023). *Fairness and machine learning: Limitations and opportunities*. MIT Press. https://fairmlbook.org — caps. 1–2 como referencia de intuición.
- Mitchell, M. (2019). *Artificial intelligence: A guide for thinking humans*. Farrar, Straus and Giroux. — caps. sobre redes profundas y sus limitaciones.
- McKinsey & Company. (2023). *The economic potential of generative AI: The next productivity frontier*. https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier
- Bommasani, R., et al. (2021). *On the opportunities and risks of foundation models* (Stanford CRFM report). — secciones introductorias.

## Complementos

- Demos guiadas en clase: prompting, RAG, comparación de respuestas entre modelos.
- Plantilla de *matriz de riesgos éticos* (sesgo, privacidad, transparencia, accountability).
- Tabla comparativa de métricas de equidad con sus supuestos y trade-offs.

---

[← Volver al índice](./README.md)
