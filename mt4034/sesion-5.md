# Sesión 5 — IA comercial y mercadotecnia

**Fecha:** 8 de mayo de 2026 (viernes)
**Profesor:** Marcos
**Modalidad:** ⚠ *(por definir)*
**Ancla del packet:** IA aplicada a decisiones comerciales y experiencia del cliente
**Ancla del plan de estudios:** Tema 5

---

## Descripción de la sesión

Esta sesión se concentra en las aplicaciones **comerciales y de mercadotecnia** de la IA: cómo los sistemas de IA apoyan la toma de decisiones basada en datos, automatizan procesos, personalizan experiencias y habilitan analítica predictiva. Se presentan los patrones de uso más consistentes (segmentación, recomendación, *pricing*, personalización, *marketing automation*, predicción de comportamiento) con casos reales por industria y con un hilo conductor: **toda aplicación comercial de IA debe apoyarse en los marcos de gobernanza y prácticas responsables trabajados en las sesiones 2 a 4** — los datos de clientes, los algoritmos que deciden sobre ellos y los contenidos que se les generan tienen restricciones éticas y regulatorias que no son opcionales. La sesión cierra con una actividad de priorización de casos de uso (valor vs. esfuerzo vs. riesgo) aplicada al caso del proyecto del equipo.

**Business question:** ¿Cómo puede la IA transformar la automatización y la personalización para generar experiencias digitales únicas?

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Identificar los patrones más recurrentes de IA aplicada a decisiones comerciales: segmentación, recomendación, pricing, personalización, predicción de churn, automatización de marketing.
- Diferenciar analítica descriptiva, diagnóstica, predictiva y prescriptiva en el contexto comercial y elegir el enfoque adecuado para un problema dado.
- Reconocer los principales KPIs comerciales que se optimizan con IA (CLV, retención, conversión, AOV, ROAS, NPS) y cómo se diseñan experimentos para medir impacto.
- Aterrizar una aplicación comercial de IA respetando los marcos de gobernanza (sesión 2), ética (sesión 3) y prácticas responsables (sesión 4).
- Priorizar casos de uso comerciales con una matriz valor / esfuerzo / riesgo.

---

## Estructura en clase (sugerida)

1. **Quiz inicial en línea (~15 min)** — evalúa los contenidos de la sesión 4.
2. **Marco: IA como palanca comercial (20 min):** qué cambia en marketing y ventas cuando la IA entra al *stack*.
3. **Patrones de aplicación (50 min):**
   - Segmentación y perfilado de clientes.
   - Recomendación y personalización.
   - Pricing dinámico y optimización de promociones.
   - Marketing automation y *next best action*.
   - Predicción de churn y retención.
   - Customer experience: chatbots, asistentes, copilots.
4. **Medición e impacto (25 min):** KPIs comerciales, diseño de experimentos (A/B), atribución, lectura responsable de resultados.
5. **Riesgos específicos de IA comercial (20 min):** manipulación, *dark patterns*, sesgo hacia clientes rentables, discriminación indirecta.
6. **Caso HBS — *Generative AI in Marketing* con rol-simulación del Marco 4 A's (65 min):** aplicación inductiva del marco a las cuatro viñetas + escenario nuevo, deliberación estructurada y presentación ejecutiva al cierre.
7. **Cierre y continuidad (10 min):** puente a casos empresariales (sesión 6) y gestión de proyectos (sesión 7).

---

## Subtemas (detalle)

> **Nota de alcance:** Esta sesión trata las aplicaciones comerciales específicas de IA. Las fundaciones técnicas (fundamentos, ML, DL) se ven en la sesión 1; la IA generativa — también aplicable aquí — se profundizó en la sesión 3; la gestión del proyecto de IA se trabaja en la sesión 7.

### Bloque A — IA como palanca comercial

- Qué cambia cuando los procesos de marketing, ventas y servicio pasan a estar mediados por IA: velocidad, escala, personalización, aprendizaje continuo.
- El *customer journey* moderno: adquisición → activación → retención → expansión → referencia, con IA en cada etapa.
- Limites estructurales: problemas donde la IA ayuda vs. problemas donde el modelo organizacional es el cuello de botella.

### Bloque B — Segmentación y perfilado

- **Segmentación clásica (demográfica, geográfica, psicográfica)** vs. **segmentación aprendida (clustering, embeddings).**
- **RFM (Recency, Frequency, Monetary)** y **CLV (Customer Lifetime Value)** como KPIs anchor.
- Paso de segmentos estáticos a segmentos dinámicos y micro-segmentos.
- Riesgos de gobernanza: uso de datos sensibles, etiquetas sesgadas, proxies de atributos protegidos.

### Bloque C — Recomendación y personalización

- Tipos de sistemas de recomendación: colaborativos, basados en contenido, híbridos, basados en modelos.
- **Personalización 1:1** vs. contextual vs. por segmento; cuándo escala y cuándo no.
- Contenido personalizado: ofertas, productos, copy, imágenes, experiencias de producto.
- Ética: *filter bubbles*, manipulación, impacto en autonomía del consumidor.

### Bloque D — Pricing y promociones

- Pricing dinámico: factores, señales, elasticidad aprendida.
- Optimización de promociones: cupones, bundling, *yield management*.
- Riesgos de *price discrimination*; consideraciones regulatorias y reputacionales.
- Cómo medir impacto sin confundir canibalización con crecimiento.

### Bloque E — Marketing automation y next best action

- Flujos de *marketing automation* multicanal (email, SMS, push, WhatsApp, in-app).
- **Next Best Action / Next Best Offer** como orquestador basado en modelos.
- Frecuencia óptima, *fatigue management*, *opt-out* y cumplimiento regulatorio.

### Bloque F — Predicción de comportamiento y retención

- Predicción de churn: definiciones, ventanas, señales tempranas.
- Retención activa (campañas, ofertas) vs. retención estructural (producto).
- Análisis de sobrevivencia aplicado a clientes (intuición).
- Métricas: CLV, LTV/CAC, retención por cohortes.

### Bloque G — Customer experience e IA generativa aplicada

- Chatbots y asistentes conversacionales con LLMs — escalado, límites, handover humano.
- Copilots de ventas y servicio; IA en contact centers.
- Generación y variación de creativos con IA generativa; gobernanza de contenido.

> *Remite a Sesión 3:* los patrones (RAG, agentes, prompting) y riesgos (alucinación, IP, PII) son los discutidos allí.

### Bloque H — Medición e impacto

- KPIs comerciales anchor: CLV, conversión, AOV, *repeat rate*, *share of wallet*, NPS, ROAS.
- Experimentación: A/B tests, *holdouts*, *uplift modeling*, incrementalidad.
- Atribución: last-click, multi-touch, basada en modelos.
- Cómo leer resultados evitando p-hacking, *cherry picking* y sobre-optimización.

### Bloque I — Riesgos específicos y puente a prácticas responsables

- Manipulación, *dark patterns*, *nudging* no consentido.
- Sesgo hacia clientes rentables y discriminación indirecta (proxies).
- Cumplimiento: consentimiento de marketing, comunicación comercial no solicitada, datos de menores.
- Cómo los controles trabajados en la sesión 4 (EU AI Act, NIST AI RMF, ISO/IEC 42001) se aplican al stack comercial.

---

## Actividad en clase

La actividad principal en clase es la **discusión y rol-simulación del caso HBS *Generative AI in Marketing* con el Marco de las 4 A's** (65 min). Ver especificación, dinámica y objetivo de aprendizaje en la sección "Caso HBS sugerido" más abajo.

---

## Tarea / entregable

Vinculado al proyecto de investigación: **priorización de casos de uso comerciales de IA** para el caso del equipo (2 páginas). Entregable sugerido como trabajo fuera de clase:

1. Generar una lista de **6 a 10 casos de uso candidatos** de IA comercial / mercadotecnia pertinentes al caso del proyecto del equipo.
2. Para cada caso, estimar:
   - **Valor esperado** (bajo / medio / alto): impacto en KPI comercial anchor.
   - **Esfuerzo** (bajo / medio / alto): datos, integraciones, modelos, cambio organizacional.
   - **Riesgo** (bajo / medio / alto): gobernanza, ética, regulación — usando los marcos de la sesión 4.
3. Priorizar con una **matriz valor vs. esfuerzo** y filtrar por riesgo.
4. Elegir los **top 2 casos** y definir para cada uno: KPI a optimizar, métrica de éxito, hipótesis de impacto, control de riesgo mínimo.

**Entregable:** matriz de priorización + ficha expandida de los top 2 casos con su hipótesis de impacto.

---

## Caso HBS sugerido

- **Generative AI in Marketing.** Israeli, A. (2025, octubre 15). Harvard Business School Publishing, Case No. **526022-PDF-ENG** (5 páginas; disciplina: Marketing). Tiempo estimado de lectura previa: ~11 min. **Duración en clase: 65 min** (según *Teaching Notes* de HBS). Disponible en [hbsp.harvard.edu/product/526022-PDF-ENG](https://hbsp.harvard.edu/product/526022-PDF-ENG).
  - **Por qué esta sesión:** el caso usa cuatro viñetas para exponer la tensión estratégica de adoptar IA generativa en marketing; conecta de forma directa con los patrones de personalización, *marketing automation* y experiencia del cliente del Bloque de "Patrones de aplicación", y obliga a los equipos a aterrizar las decisiones dentro del marco de prácticas responsables trabajado en la sesión 4 (riesgos específicos: alucinaciones, *brand safety*, derechos de uso de datos del cliente, *dark patterns*).
  - **Decisiones que ancla la discusión:** cuándo sí y cuándo no usar IA generativa en cada viñeta; trade-offs entre velocidad de *go-to-market*, calidad de contenido, riesgo reputacional y costo de supervisión humana; cómo generalizar las lecciones de marketing a otras funciones.
  - **Dinámica propuesta en clase — rol-simulación con el Marco de las 4 A's.** Los equipos aplican inductivamente el marco (**A**umentación, **A**lineación, **U**mbral de Riesgo Aceptable y Rendición de Cuentas — *A*ccountability) a las cuatro viñetas del caso y, posteriormente, a un escenario nuevo presentado por el profesor. La actividad combina trabajo en equipo, deliberación estructurada y presentación ejecutiva al cierre.
  - **Objetivo de aprendizaje de la dinámica:** que las y los estudiantes pasen del **diagnóstico** (identificar por qué falló o funcionó la IA en cada viñeta) a la **prescripción** (diseñar un plan de gobernanza accionable), desarrollando criterio gerencial sobre cuándo desplegar, modificar o retirar aplicaciones de IA generativa.

## Libro de texto

- Rose, D. (2021). *Artificial intelligence for business: What you need to know about machine learning and neural networks* (2nd ed.). Pearson.

## Lecturas recomendadas (APA)

- Davenport, T. H., & Mittal, N. (2023). *All-in on AI: How smart companies win big with artificial intelligence*. Harvard Business Review Press.
- Davenport, T. H. (2018). *The AI advantage: How to put the artificial intelligence revolution to work*. MIT Press.
- Iansiti, M., & Lakhani, K. R. (2020). *Competing in the age of AI: Strategy and leadership when algorithms and networks run the world*. Harvard Business Review Press. — caps. sobre personalización y estrategia.
- Brynjolfsson, E., & McAfee, A. (2017, July–August). The business of artificial intelligence. *Harvard Business Review*. https://hbr.org/2017/07/the-business-of-artificial-intelligence

## Complementos

- Plantilla de **matriz valor / esfuerzo / riesgo** para priorización.
- Tabla de KPIs comerciales anchor con su definición, fórmula y usos típicos.
- Lista de verificación de controles de IA responsable aplicados al stack de marketing.
- Invitado de industria sugerido (responsable de analítica o CRM).

---

[← Volver al índice](./README.md)
