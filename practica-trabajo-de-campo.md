# Práctica — Trabajo de campo

**Tipo de trabajo:** En equipo (4–5 personas, mismos equipos del proyecto final)
**Extensión del reporte:** 8–12 páginas sin contar anexos
**Rúbrica de evaluación:** [rubrica-practica-trabajo-de-campo.md](./rubrica-practica-trabajo-de-campo.md) *(borrador preliminar)*

---

## Objetivo

Aplicar los conceptos del curso a un caso real: diagnosticar un proceso crítico de una empresa del sector retail, logística u otro giro estudiado en el curso, e identificar oportunidades de mejora apoyadas en analítica de datos.

---

## Instrucciones generales

Selecciona una empresa del sector retail (física, e-commerce o dual), logística u otro sector estudiado en el curso, y agenda una entrevista con un líder de la empresa seleccionada.

---

## 1. Perfil de la empresa

Documenta la siguiente información de la empresa seleccionada:

- Nombre y razón social
- Descripción de actividades, mercado y tipo de cliente
- Número aproximado de sucursales / puntos de operación
- Canales y medios digitales que opera (sitio web, app, marketplaces, redes sociales, WhatsApp Business, etc.)
- Rol y área del líder entrevistado

## 2. Entrevista: retos estratégicos y selección del proceso

La entrevista tiene dos propósitos: (i) entender los retos estratégicos que enfrenta la empresa y (ii) **seleccionar en conjunto con el entrevistado un proceso específico** que será el objeto del análisis posterior. Duración sugerida: 45–60 minutos.

Guía de preguntas (no es obligatorio hacerlas todas; úsalas como menú):

### A. Contexto del negocio

- ¿Cuáles son las principales líneas de negocio y segmentos de cliente de la empresa?
- ¿Qué canales (físico, web, app, marketplace, mayoreo) son más relevantes hoy y cuál está creciendo más rápido?
- ¿Qué KPIs siguen de cerca para medir el desempeño del negocio?

### B. Retos estratégicos

- ¿Cuáles son los 2–3 retos más importantes que enfrenta la empresa en los próximos 12–24 meses?
- ¿Qué decisiones del día a día son más difíciles de tomar por falta de datos o información confiable?
- ¿Qué cambios del entorno (competencia, tecnología, comportamiento del cliente, regulación) los están obligando a replantear cómo operan?

### C. Madurez en el uso de datos

- ¿Cómo describiría la madurez analítica de la empresa: reportería tradicional, dashboards, modelos predictivos, automatización?
- ¿Qué fuentes de datos tienen disponibles (POS, CRM, ERP, web/app, logística) y cómo se integran entre sí?
- ¿Hay áreas donde sientan que "los datos están, pero no se aprovechan"?

### D. Selección del proceso a analizar *(bloque clave)*

- ¿Cuáles son 2–3 procesos del negocio donde hoy perciben fricción, costos elevados u oportunidades desaprovechadas?
- De esos, acuerden con el entrevistado **uno solo** que cumpla con: (i) ser relevante para el negocio, (ii) tener datos disponibles o razonablemente obtenibles, (iii) poder beneficiarse de una solución analítica.
- ¿Qué métricas usan hoy para medir ese proceso? ¿Qué pasaría si se pudiera mejorar 10–20%?

### E. Cierre

- ¿Quién es el dueño del proceso o tomador de decisiones si se implementara una mejora?
- ¿Hay información sensible o confidencial que deba anonimizarse o excluirse del reporte?

Al final de esta sección, el equipo debe entregar una declaración breve (3–5 líneas) del **proceso seleccionado** y por qué lo eligieron.

## 3. Diagnóstico del proceso

Analiza el proceso de compra física y/o digital de la empresa (en el caso de retail) o un proceso crítico del negocio en caso de otro giro (ej. logística, última milla, abastecimiento), donde se considere que existe potencial de implementación de soluciones analíticas. Cubre los siguientes puntos:

### a) Descripción detallada del proceso

- Objetivo de negocio del proceso y por qué importa.
- Flujo paso a paso, de inicio a fin (diagrama simple si ayuda).
- Áreas y roles involucrados; dueño del proceso.
- Sistemas, herramientas y proveedores que lo soportan.
- Volumen y frecuencia (¿cuántas transacciones/eventos por día, semana, mes?).

### b) Datos relevantes del proceso

- **Datos existentes:** fuente, propietario, granularidad (por transacción, por cliente, por día), calidad observada y limitaciones conocidas.
- **Datos requeridos o deseables:** qué información sería útil pero hoy no se captura o no está integrada.
- **KPIs actuales vs. los que deberían existir:** qué miden hoy, qué no miden y qué sería valioso medir.

### c) Oportunidades de optimización

- Puntos de fricción, cuellos de botella o momentos de alta variabilidad.
- Decisiones que hoy se toman por intuición o reglas fijas, y que podrían apoyarse en datos.
- **Herramientas analíticas potencialmente aplicables** — usa la caja de herramientas de la Sesión 1 como marco de referencia: estadística descriptiva, segmentación, pronóstico, pruebas A/B, regresión, series de tiempo, análisis de sobrevivencia, detección de anomalías, optimización, etc. Para cada oportunidad, indica **qué herramienta aplicaría y por qué**.
- Impacto estimado en orden de magnitud (no se espera cifra exacta): ¿qué se movería y en qué dirección?

### d) Recomendaciones

- **Quick wins** (1–3 meses): acciones de bajo costo y bajo riesgo, implementables con datos ya disponibles.
- **Iniciativas de mediano plazo** (3–12 meses): requieren integración, modelos o inversión adicional.
- **Requisitos previos:** datos, tecnología, talento o procesos que deben existir antes.
- **Riesgos y supuestos** del análisis.

## 4. Reporte final

Genera un reporte estructurado con las recomendaciones del equipo. Extensión sugerida: **8–12 páginas sin contar anexos**. Estructura:

1. **Resumen ejecutivo** (½ – 1 página). Empresa, proceso analizado, hallazgo principal, recomendación más importante y el impacto esperado. Esta sección debe leerse sola.
2. **Contexto de la empresa.** Información de la sección 1 + rol del entrevistado + retos estratégicos declarados.
3. **Metodología.** Cómo se realizó la investigación: fuentes, entrevista (fecha, duración, persona), observación en sucursal o web/app, documentos revisados.
4. **Proceso analizado.** Descripción detallada del proceso (del punto 3.a), con diagrama de flujo si aplica.
5. **Diagnóstico.** Datos disponibles y faltantes, KPIs actuales, puntos de fricción, decisiones sin apoyo en datos (puntos 3.b y 3.c).
6. **Recomendaciones priorizadas.** Lista ordenada por impacto esperado y facilidad de implementación, usando la caja de herramientas analítica del curso. Para cada recomendación: problema que resuelve, técnica analítica sugerida, datos necesarios, indicador de éxito y horizonte (quick win / mediano plazo).
7. **Consideraciones de implementación.** Requisitos previos, riesgos, supuestos, dependencias organizacionales.
8. **Reflexiones finales.** Qué aprendieron del ejercicio y qué harían distinto si tuvieran más tiempo o más datos.
9. **Anexos.** Guión y notas de la entrevista, evidencias (fotos, screenshots, documentos públicos), cálculos o gráficas de apoyo.

---

## Entregables

- Reporte en PDF (8–12 páginas + anexos), subido a Canvas por un miembro del equipo.
- Guión y notas de la entrevista (puede ir como anexo dentro del PDF).
- Evidencias de la investigación de campo (fotos, capturas, enlaces a documentos públicos).

## Evaluación

La evaluación se realizará con la rúbrica: [rubrica-practica-trabajo-de-campo.md](./rubrica-practica-trabajo-de-campo.md). El peso de esta práctica dentro de la calificación global del curso está en definición.

---

[← Volver al índice](./README.md)
