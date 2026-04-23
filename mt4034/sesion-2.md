# Sesión 2 — Gobierno de datos + Tecnologías emergentes

**Fecha:** 25 de abril de 2026 (sábado)
**Profesor:** Marcos
**Modalidad:** ⚠ *(por definir)*
**Ancla del packet:** Datos como insumo y tecnologías habilitadoras de la IA
**Ancla del plan de estudios:** Tema 2

---

## Descripción de la sesión

Esta sesión aterriza dos bloques complementarios sobre los que se sostiene cualquier iniciativa de IA confiable: **gobierno de datos** y **tecnologías emergentes**. En el bloque de gobernanza se exploran los pilares de la gestión efectiva de datos (calidad, privacidad, seguridad, ética) y los marcos organizacionales que los operacionalizan (roles, políticas, estándares, regulación aplicable). En el bloque de tecnologías emergentes se profundiza en **IoT**, **blockchain** y **digital twins** — introducidos brevemente en la sesión 1 — discutiendo arquitecturas, casos de uso y cómo se integran con sistemas de IA para generar, verificar o desplegar valor. El énfasis es aplicado: al final de la sesión, cada equipo debe poder identificar los datos que necesita su caso, qué riesgos de gobernanza enfrenta y qué tecnologías emergentes podrían amplificar o restringir su propuesta.

**Business question:** ¿Cómo se conectan los modelos de datos actuales con su gobernanza ante las incertidumbres que plantea la IA?

## Objetivos

Al finalizar la sesión, las y los estudiantes serán capaces de:

- Explicar los cuatro pilares del gobierno de datos — calidad, privacidad, seguridad, ética — y los roles organizacionales que los sostienen (CDO, data steward, data owner, DPO).
- Reconocer los marcos y estándares más relevantes (DAMA-DMBOK, ISO 27001, GDPR, LFPDPPP) y diferenciar qué problema resuelve cada uno.
- Evaluar las dimensiones de calidad de datos (completitud, exactitud, consistencia, oportunidad, unicidad, validez) y proponer métricas operativas.
- Diferenciar los mecanismos de privacidad (minimización, anonimización, seudonimización, consentimiento) y las señales de alerta cuando un flujo de datos los compromete.
- Explicar qué son IoT, blockchain y digital twins, cómo se arquitecturan a nivel conceptual y en qué casos se combinan con IA.
- Identificar los datos, riesgos de gobernanza y posibles tecnologías habilitadoras para el caso del proyecto del equipo.

---

## Estructura en clase (sugerida)

1. **Quiz inicial en línea (~15 min)** — evalúa los contenidos de la sesión 1.
2. **¿Por qué hablar de gobierno de datos antes que de modelos? (15 min):** datos de baja calidad arruinan sistemas de IA; sin gobernanza, el valor no se sostiene.
3. **Pilares del gobierno de datos (40 min):** calidad, privacidad, seguridad, ética; roles y artefactos típicos.
4. **Marcos y regulación aplicable (25 min):** DAMA-DMBOK, ISO 27001, GDPR, LFPDPPP (México), con referencia al EU AI Act y NIST AI RMF que se profundizan en la sesión 4.
5. **Tecnologías emergentes — bloque profundo (45 min):**
   - IoT: arquitectura, casos de uso, integración con IA.
   - Blockchain: propiedades, casos de uso (trazabilidad, contratos inteligentes), cuándo sí y cuándo no.
   - Digital twins: qué son, por qué ahora, casos en manufactura, logística y operaciones.
6. **Caso HBS *Mastercard* — actividad principal (50 min):** discusión guiada centrada en los 4 pilares de gobernanza y en el *AI Governance Council*; aterrizaje al caso del equipo.
7. **Cierre y continuidad (10 min):** puente a ética (sesión 3) y prácticas responsables (sesión 4).

---

## Subtemas (detalle)

> **Nota de alcance:** Gobierno de datos se ve desde la perspectiva organizacional. La ética algorítmica (sesgo, equidad, explicabilidad) se profundiza en la sesión 3 y los marcos regulatorios de IA como EU AI Act o NIST AI RMF se trabajan en la sesión 4.

### Bloque A — Pilares del gobierno de datos

- **Calidad de datos.** Dimensiones clásicas: completitud, exactitud, consistencia, oportunidad, unicidad, validez; métricas y monitoreo; ciclo de vida del dato (captura, almacenamiento, uso, archivado, eliminación).
- **Privacidad.** Principios: legalidad, finalidad, minimización, proporcionalidad, conservación limitada; roles (titular, controlador, encargado); mecanismos técnicos (anonimización, seudonimización, agregación, privacidad diferencial — intuición).
- **Seguridad.** Controles técnicos y organizativos; clasificación de información; respuesta a incidentes; ISO 27001 como referencia.
- **Ética de datos.** Uso secundario, consentimiento informado, impactos diferenciales, transparencia hacia los titulares.

### Bloque B — Roles y artefactos organizacionales

- **Roles típicos:** Chief Data Officer (CDO), data steward, data owner, data custodian, Data Protection Officer (DPO).
- **Artefactos:** políticas de datos, glosario de términos, catálogo de datos, matriz de responsabilidades (RACI), registro de tratamientos (ROPA), evaluaciones de impacto (DPIA).
- **Madurez de gobierno de datos:** desde reactiva hasta optimizada; modelos de referencia (DAMA-DMBOK, DCAM).

### Bloque C — Marcos y regulación aplicable

- **DAMA-DMBOK:** cuerpo de conocimiento para la gestión de datos; 11 áreas funcionales.
- **ISO 27001 / ISO 27701:** seguridad de la información y privacidad.
- **GDPR (UE):** regla de referencia global sobre protección de datos personales.
- **LFPDPPP / LGPDPPSO (México):** Ley Federal de Protección de Datos Personales en Posesión de los Particulares y Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados.
- **Panorama de regulaciones de IA** como preámbulo (EU AI Act, NIST AI RMF, ISO/IEC 42001) — *se profundizan en la sesión 4*.

> *No traslapa con Sesión 4:* el diseño de un programa de IA responsable alineado a estos marcos se trabaja allá.

### Bloque D — Tecnologías emergentes: IoT

- **Definición y arquitectura:** sensores → conectividad → ingesta → procesamiento (edge vs. cloud) → analítica → acción.
- **Casos de uso típicos:** mantenimiento predictivo, monitoreo de cadena de frío, flotas, *smart retail*, *smart city*.
- **Integración con IA:** IoT como fuente de datos para modelos (anomalías, pronóstico, visión por computadora).
- **Riesgos:** superficie de ataque, privacidad, calidad de señal, costo total.

### Bloque E — Tecnologías emergentes: blockchain

- **Propiedades clave:** inmutabilidad, descentralización, auditabilidad, programabilidad (contratos inteligentes).
- **Casos de uso donde sí aporta:** trazabilidad en cadenas de suministro, tokenización de activos, registros de propiedad, verificación de credenciales, auditoría de datos que alimentan IA.
- **Casos de uso donde no aporta:** un problema de IA no se arregla agregando blockchain; decisión de diseño, no moda.
- **Integración con IA:** verificabilidad de la procedencia de los datos; registro inmutable de decisiones algorítmicas; *tokenization* de datos/modelos.

### Bloque F — Tecnologías emergentes: digital twins

- **Definición:** réplica digital de un sistema físico (activo, proceso, instalación) actualizada con datos en tiempo real.
- **Niveles:** gemelo descriptivo (qué es), informativo (qué pasa), predictivo (qué pasará), prescriptivo (qué conviene hacer).
- **Casos de uso:** manufactura, logística, infraestructura, salud, *smart buildings*.
- **Integración con IA:** simulación con ML, optimización continua, prueba de escenarios antes de intervenir el sistema real.

### Bloque G — Puente a sesiones siguientes

- Gobierno de datos y tecnologías emergentes como **base** para IA generativa (sesión 3), ética algorítmica (sesión 3), prácticas responsables (sesión 4) y aplicaciones comerciales (sesión 5).
- El diagnóstico de esta sesión alimenta los entregables parciales del proyecto final.

---

## Actividad en clase

**Discusión del caso HBS *Mastercard's Ethical Approach to Governing AI*** (~50 min). La actividad principal aplica los cuatro pilares del gobierno de datos (Bloque A) y el mapa de roles y artefactos (Bloque B) al *AI Governance Council* de Mastercard. En equipos:

1. **Lectura guiada del framework (10 min):** cada equipo ubica los controles de Mastercard bajo los 4 pilares (calidad, privacidad, seguridad, ética).
2. **Análisis de las dos adquisiciones descartadas (20 min):** ¿qué criterios operaron? ¿qué habría pasado sin el AI Governance Council? ¿qué artefactos del Bloque B fueron decisivos?
3. **Aterrizaje al caso del equipo (15 min):** identificar **2 controles que adoptaría** y **1 que no aplica** a su contexto, con justificación.
4. **Plenaria breve (5 min):** cada equipo comparte el control más relevante para su caso.

**Entregable de la actividad:** ficha por equipo con los 2 controles adoptados + el control descartado con justificación.

### Microactividad opcional (si queda tiempo en clase o como ejercicio fuera de clase)

**Diagnóstico de gobierno de datos + mapa de tecnologías emergentes del caso del equipo.** Completar una ficha con:

- **Mapa de datos:** qué datos se necesitan, de dónde vienen, quién es el *owner*, qué riesgos de calidad/privacidad/seguridad/ética presenta cada fuente.
- **Matriz de madurez:** evaluación cualitativa (baja/media/alta) del caso actual en cada pilar de gobernanza.
- **Tecnologías emergentes pertinentes:** elegir 1 de las 3 (IoT, blockchain, digital twin) y justificar por qué aportaría al caso; descartar las otras 2 con justificación.

Esta microactividad alimenta directamente la tarea / entregable del equipo descrita abajo.

---

## Tarea / entregable

Vinculado al proyecto final: entregar una **ficha de datos y tecnologías** del caso del equipo (2 páginas), con:

- Inventario de datos y sus fuentes.
- Riesgos de gobernanza y mitigaciones propuestas.
- Tecnología emergente elegida y por qué (con descarte justificado de las otras 2).

---

## Caso HBS sugerido

- **Mastercard's Ethical Approach to Governing AI** (IMD Case No. IM1225, 2022). IMD / Harvard Business Publishing. [store.hbr.org/product/mastercard-s-ethical-approach-to-governing-ai/IM1225](https://store.hbr.org/product/mastercard-s-ethical-approach-to-governing-ai/IM1225)
  - **Por qué esta sesión:** Mastercard se posiciona como líder en *privacy by design* y construye un *AI Governance Council* con un marco explícito de responsabilidad de datos — cubre los cuatro pilares del Bloque A (calidad, privacidad, seguridad, ética), los roles del Bloque B y conecta gobernanza con una tecnología emergente (IA) en un caso real.
  - **Decisiones que ancla la discusión:** aplicación del framework a dos adquisiciones (ambas descartadas), vínculo entre AI Garage (2018) y Governance Council, tensión entre velocidad comercial y controles de datos.

## Libro de texto

- Rose, D. (2021). *Artificial intelligence for business: What you need to know about machine learning and neural networks* (2nd ed.). Pearson. — capítulos sobre datos.

## Lecturas recomendadas (APA)

- Ladley, J. (2019). *Data governance: How to design, deploy, and sustain an effective data governance program* (2nd ed.). Academic Press.
- DAMA International. (2017). *DAMA-DMBOK: Data management body of knowledge* (2nd ed.). Technics Publications. — caps. 1–3 (introducción y calidad).
- Iansiti, M., & Lakhani, K. R. (2020). *Competing in the age of AI: Strategy and leadership when algorithms and networks run the world*. Harvard Business Review Press. — cap. sobre la fábrica de IA.
- Diario Oficial de la Federación. (2010). *Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)*.

## Complementos

- Plantilla de *mapa de datos* y *matriz de madurez de gobernanza*.
- Tabla comparativa IoT vs. blockchain vs. digital twin: qué problema resuelve, qué no, cómo se integra con IA.
- Lista curada de reguladores y autoridades (IFT, INAI, CNBV) relevantes al contexto mexicano.

---

[← Volver al índice](./README.md)
