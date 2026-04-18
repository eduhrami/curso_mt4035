#!/usr/bin/env python3
"""Build an initial IMSCC export for MT4035 from the repo content.

Takes the original IMSCC export provided by EGADE as the base, patches the
pages of the "Programa de estudios" module with the authoritative content of
the repo (`mt4035/syllabus.md` and related docs), renames the 8 session
modules with their real titles and dates, publishes them, and re-packages the
cartridge following the Canvas IMSCC requirements (ZIP_STORED compression,
imsmanifest.xml as the first entry).

Deliberately does NOT modify:
  - Perfiles docentes in `bienvenida-y-equipo-docente.html` (already correct).
  - Institutional onboarding pages (`primeros-pasos`, `ayuda`, etc.).
  - Assignment groups (will be redesigned once real assignments are added).
  - The template items inside each session module (pending — see TODOs.md).

Run from the repo root:
    python3 mt4035/canvas/build_imscc.py
"""

from __future__ import annotations

import hashlib
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / (
    "aplicaciones-de-la-analitica-de-datos-"
    "comercio-minorista-comercio-electronico-"
    "y-cadena-de-suministro-gpo-50-export.imscc"
)
OUT = HERE / "mt4035-initial-export.imscc"

GRADIENT_BAR = (
    '<div style="width: 100%; height: 3px; background-image: '
    'linear-gradient(to right, #062EBF, #ffffff); margin-bottom: 20px;">'
    '&nbsp;</div>'
)


# ---------------------------------------------------------------------------
# HTML body fragments (authoritative content from mt4035/syllabus.md)
# ---------------------------------------------------------------------------

COMPETENCIAS_BLOCK = """<p><strong>Competencia institucional:</strong> <em>Data Business Strategy</em> &mdash; diseñar estrategias innovadoras a través de la relación entre los datos y la estrategia del negocio, utilizando la infraestructura y herramientas de datos para desarrollar iniciativas que permitan la evolución hacia una organización transformada digitalmente con un <em>data-driven mindset</em>.</p>
<p><strong>Competencias transversales:</strong></p>
<ul>
<li><strong>Pensamiento crítico 3:</strong> generar soluciones estratégicas basadas en un juicio informado e información sólida.</li>
<li><strong>Innovación 2:</strong> resolver necesidades mediante procesos de innovación.</li>
</ul>
<p>La <strong>práctica de trabajo de campo</strong> es la actividad formal que evalúa la competencia institucional <em>Toma de decisiones estratégicas</em>: el equipo selecciona una empresa real del sector, entrevista a un líder, diagnostica un proceso crítico y elabora un reporte con recomendaciones apoyadas en la caja de herramientas analítica del curso.</p>"""


SYLLABUS_BODY = f"""{GRADIENT_BAR}
<h2><strong>Objetivo general del curso</strong></h2>
<p>Implementar herramientas de analítica de datos en un caso práctico de una empresa de comercio minorista, e-commerce, logística o cadena de suministro, con el propósito de identificar los indicadores clave de desempeño (KPIs) y aplicar las técnicas analíticas que permitan optimizar procesos y mejorar la toma de decisiones estratégicas.</p>

<h2><strong>Logística del curso</strong></h2>
<ul>
<li><strong>Modalidad:</strong> Presencial</li>
<li><strong>Salón:</strong> EG-215</li>
<li><strong>Horario:</strong> 18:30 – 21:45</li>
<li><strong>Periodo:</strong> del 23 de abril al 10 de junio de 2026 (8 sesiones)</li>
<li><strong>Día de la semana:</strong> varía por sesión &mdash; las sesiones 1 y 5 son en jueves; las sesiones 2, 3, 4, 6, 7 y 8 son en miércoles (ver tabla).</li>
</ul>

<h2><strong>Calendario y temas por sesión</strong></h2>
<table style="width: 100%; border-collapse: collapse; border: 1px solid #cccccc;" border="1" cellspacing="0" cellpadding="6">
<thead>
<tr>
<th style="background-color: #0350a1; color: #ffffff;">#</th>
<th style="background-color: #0350a1; color: #ffffff;">Fecha</th>
<th style="background-color: #0350a1; color: #ffffff;">Día</th>
<th style="background-color: #0350a1; color: #ffffff;">Profesor</th>
<th style="background-color: #0350a1; color: #ffffff;">Tema</th>
<th style="background-color: #0350a1; color: #ffffff;">Business question</th>
</tr>
</thead>
<tbody>
<tr><td>1</td><td>23-abr</td><td>Jueves</td><td>Eduardo y Marcos</td><td>Fundamentos analíticos para retail y e-commerce</td><td>¿Qué herramientas estadísticas debo conocer para tomar decisiones basadas en datos en retail?</td></tr>
<tr><td>2</td><td>29-abr</td><td>Miércoles</td><td>Marcos</td><td>Segmentación y perfilado de clientes</td><td>¿Cómo identifico a mis clientes más valiosos y cómo les ofrezco experiencias diferenciadas?</td></tr>
<tr><td>3</td><td>6-may</td><td>Miércoles</td><td>Marcos</td><td>Analítica de ventas e inventario</td><td>¿Qué debería vender, cuánto inventario necesito, y cómo sé si mis cambios funcionan?</td></tr>
<tr><td>4</td><td>13-may</td><td>Miércoles</td><td>Eduardo</td><td>SCM, inventario y diseño de red</td><td>¿Cómo diseño una red que balancea costo de operar vs nivel de servicio al cliente?</td></tr>
<tr><td>5</td><td>21-may</td><td>Jueves</td><td>Eduardo</td><td>Transporte y logística omnicanal</td><td>¿Cómo hago llegar mis pedidos al cliente al menor costo sin romper la promesa de entrega?</td></tr>
<tr><td>6</td><td>27-may</td><td>Miércoles</td><td>Marcos</td><td>Precios, promociones, fraude y seguridad</td><td>¿Cómo fijo precios y promos que impulsan ventas sin destruir margen, y cómo protejo el negocio contra el fraude?</td></tr>
<tr><td>7</td><td>3-jun</td><td>Miércoles</td><td>Eduardo</td><td>Tecnologías emergentes</td><td>¿Qué tecnologías emergentes generan valor real en retail y supply chain, y cómo las implemento sin caer en buzzwords?</td></tr>
<tr><td>8</td><td>10-jun</td><td>Miércoles</td><td>Eduardo y Marcos</td><td>Presentaciones finales + examen</td><td>¿Puedo integrar todo el curso en una recomendación defendible frente a un líder de negocio?</td></tr>
</tbody>
</table>
<p>El detalle de cada sesión (estructura, subtemas, actividad en clase, entregables y bibliografía específica) se presenta dentro del módulo correspondiente a cada sesión.</p>

<h2><strong>Metodología del curso</strong></h2>
<p>El curso opera bajo un modelo de <strong>aprendizaje activo</strong> que combina exposición conceptual, casos de empresa, talleres aplicados y trabajo de equipo sobre un caso real del sector retail, e-commerce o logística.</p>
<h3><span style="color: #0350a1;">Actividades conducidas por el profesor</span></h3>
<ul>
<li>Clases y exposiciones donde se presentan conceptos, marcos y herramientas analíticas.</li>
<li>Análisis de casos de empresa (Seven-Eleven Japan, Tesco, Walmart, entre otros) y foros de discusión.</li>
<li>Talleres aplicados en clase donde los equipos aplican las herramientas de la sesión al caso del proyecto final.</li>
<li><strong>Quizzes en línea</strong> aplicados al inicio de las sesiones 2 a 7 para consolidar el contenido de la sesión inmediatamente anterior.</li>
</ul>
<h3><span style="color: #0350a1;">Actividades independientes del estudiante</span></h3>
<ul>
<li>Lecturas previas y preparación específica por sesión (detalladas en cada módulo).</li>
<li>Trabajo en equipo sobre el proyecto final: selección de empresa, entrevista con un líder, diagnóstico de un proceso crítico, análisis de datos y elaboración de reportes.</li>
<li>Reflexión individual posterior a cada sesión para integrar los conceptos al caso del proyecto.</li>
</ul>

<h2><strong>Compromisos del estudiante</strong></h2>
<ul>
<li>Involucrarse al 100% en las actividades de aprendizaje, tanto conducidas en clase como independientes.</li>
<li>Conocer el contenido y las expectativas del curso antes de cada sesión, incluyendo las lecturas previas indicadas.</li>
<li>Mantener comunicación activa con los profesores y con los miembros del equipo del proyecto final.</li>
<li>Asistir puntualmente a cada sesión y realizar los quizzes en línea dentro de los tiempos establecidos.</li>
<li>Contribuir al equipo con una actitud de colaboración, respeto y disposición para enseñar y aprender de los demás.</li>
<li>Participar activamente en discusiones, casos y talleres, aportando argumentos basados en datos y evidencia.</li>
<li>Cumplir con las políticas institucionales de integridad académica y uso responsable de datos e información de las empresas analizadas.</li>
</ul>
<p>&nbsp;</p>"""


EVALUACION_BODY = f"""{GRADIENT_BAR}
<p>La calificación mínima aprobatoria para el curso es 70 puntos. Las calificaciones se reportan a escolar dentro de la escala del 0 al 100. Los decimales iguales o mayores a 0.5 serán redondeados al entero inmediato superior; los decimales menores serán redondeados al entero inmediato inferior.</p>
<ul>
<li>Se recomienda que consultes semanalmente tus puntos acumulados en el botón <strong>Calificaciones</strong>, disponible en el menú izquierdo de la plataforma.</li>
<li>Una vez publicada la calificación y la retroalimentación de cada actividad, tendrás <strong>una semana</strong> para solicitar aclaración o revisión; después de ese plazo, la calificación se considera definitiva.</li>
</ul>
<p>La evaluación se compone de 5 elementos. El esquema distingue entre actividades <strong>individuales</strong> (32%) y <strong>colaborativas/en equipo</strong> (68%).</p>

<table style="width: 100%; border-collapse: collapse; border: 1px solid #cccccc; margin-left: auto; margin-right: auto;" border="1" cellspacing="0" cellpadding="6">
<caption><strong>Composición de la evaluación</strong></caption>
<thead>
<tr>
<th style="background-color: #0350a1; color: #ffffff; text-align: left;">Componente</th>
<th style="background-color: #0350a1; color: #ffffff; text-align: center;">Modalidad</th>
<th style="background-color: #0350a1; color: #ffffff; text-align: center;">Valor</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" style="background-color: #f1f1f1;"><strong>Actividades individuales</strong></td>
<td style="text-align: center; background-color: #f1f1f1;"><strong>32%</strong></td>
</tr>
<tr><td>Quizzes en línea (6 quizzes, uno al inicio de cada sesión de la 2 a la 7)</td><td style="text-align: center;">Individual</td><td style="text-align: center;">12%</td></tr>
<tr><td>Examen final presencial (sesión 8)</td><td style="text-align: center;">Individual</td><td style="text-align: center;">20%</td></tr>
<tr>
<td colspan="2" style="background-color: #f1f1f1;"><strong>Actividades colaborativas</strong></td>
<td style="text-align: center; background-color: #f1f1f1;"><strong>68%</strong></td>
</tr>
<tr><td>Reportes de casos y actividades de clase (6 entregables)</td><td style="text-align: center;">Equipo</td><td style="text-align: center;">18%</td></tr>
<tr><td>Tareas (2 tareas)</td><td style="text-align: center;">Equipo</td><td style="text-align: center;">10%</td></tr>
<tr><td>Proyecto final (trabajo de análisis + trabajo de campo + presentación + coevaluación)</td><td style="text-align: center;">Equipo</td><td style="text-align: center;">40%</td></tr>
<tr>
<td colspan="2" style="background-color: #696969; color: #ffffff; text-align: right;"><strong>Total</strong></td>
<td style="background-color: #696969; color: #ffffff; text-align: center;"><strong>100%</strong></td>
</tr>
</tbody>
</table>

<h3><span style="color: #0350a1;"><strong>Notas sobre los componentes</strong></span></h3>
<ul>
<li><strong>Quizzes en línea:</strong> 6 quizzes en Canvas, individuales, con tiempo limitado. Cada quiz evalúa el contenido de la sesión inmediatamente anterior. La sesión 8 no tiene quiz; ese contenido (sesión 7) se integra al examen final presencial.</li>
<li><strong>Examen final presencial:</strong> individual, en sesión 8, cubre todo el curso con énfasis en la sesión 7 (tecnologías emergentes).</li>
<li><strong>Reportes de casos y actividades de clase:</strong> seis entregables de equipo generados durante los talleres en clase, uno por sesión.</li>
<li><strong>Tareas:</strong> dos tareas asignadas por el profesor, entregadas fuera de clase por cada equipo.</li>
<li><strong>Proyecto final:</strong> integra el trabajo de campo (evaluación de la competencia institucional <em>Toma de decisiones estratégicas</em>), el trabajo de análisis sobre un dataset, la presentación final y la coevaluación entre pares. Se evalúa con rúbrica; la coevaluación representa al menos 10% de la calificación del proyecto.</li>
</ul>
<p>&nbsp;</p>"""


BIBLIOGRAFIA_BODY = f"""{GRADIENT_BAR}
<p>Los materiales que se listan a continuación serán indispensables para realizar las actividades del curso y para lograr los objetivos planteados. Todas las referencias se presentan en formato APA.</p>

<h2><strong>Bibliografía obligatoria</strong></h2>
<ul>
<li>Berman, B., Evans, J. R., &amp; Chatterjee, P. M. (2021). <em>Retail management: A strategic approach</em> (13th ed.). Pearson. &mdash; <strong>libro de texto principal de retail.</strong></li>
<li>Downey, A. B. (2025). <em>Think stats: Exploratory data analysis in Python</em> (3rd ed.). O'Reilly Media. Disponible en abierto: <a href="https://allendowney.github.io/ThinkStats/" target="_blank">https://allendowney.github.io/ThinkStats/</a> &mdash; <strong>referencia metodológica para la sesión 1.</strong></li>
<li>Okunev, R. (2022). <em>Analytics for retail: A step-by-step guide to the statistics behind a successful retail business</em>. Apress. &mdash; <strong>técnicas estadísticas aplicadas a retail.</strong></li>
</ul>

<h2><strong>Bibliografía complementaria</strong></h2>
<ul>
<li>Chaubard, F. (2023). <em>AI for retail: A practical guide to modernize your retail business with AI and automation</em>. Wiley.</li>
<li>Prajapat, R. (2024). <em>AI-powered ecommerce: How machine learning is transforming online shopping</em>. Apress.</li>
<li>Agrawal, N., &amp; Smith, S. A. (Eds.). (2015). <em>Retail supply chain management: Quantitative models and empirical studies</em> (2nd ed.). Springer.</li>
<li>Fernie, J., &amp; Sparks, L. (Eds.). (2018). <em>Logistics and retail management: Emerging issues and new challenges in the retail supply chain</em> (5th ed.). Kogan Page.</li>
<li>Iansiti, M., &amp; Lakhani, K. R. (2020). <em>Competing in the age of AI: Strategy and leadership when algorithms and networks run the world</em>. Harvard Business Review Press.</li>
</ul>

<p>Cada sesión del curso contiene, además, lecturas específicas dentro del módulo correspondiente.</p>

<div style="width: calc(100% - 30px); background-color: #f4f4f4; border: 1px solid #616161; margin: 20px 0px; padding: 10px;">
<p>Recuerda que la <a href="https://biblioteca.tec.mx" target="_blank">Biblioteca Digital</a> del Tec de Monterrey está a tu disposición para apoyar tu proceso de aprendizaje. Si requieres apoyo de un bibliotecario o asistencia en tiempo real, visita el <a href="https://biblioteca.tec.mx/centrodeatencion">Centro de Atención</a>.</p>
</div>
<p>&nbsp;</p>"""


# "B. Políticas propias del curso" — replaces the ordered list inside the
# existing anchor a12 to reflect the 5-component evaluation scheme.
POLITICAS_B_LIST = """<ol type="a">
<li><strong>Integración de equipos:</strong> los equipos del proyecto final serán de <strong>3 a 5 integrantes</strong>. Se forman durante la primera sesión.</li>
<li><strong>Quizzes en línea (12%, individual):</strong> los 6 quizzes se aplican al inicio de cada sesión de la 2 a la 7, en Canvas, con tiempo limitado. No se permite reposición fuera del plazo salvo causa justificada aprobada por el profesor.</li>
<li><strong>Reportes de casos y actividades de clase (18%, equipo):</strong> se entregan durante o al cierre de cada sesión, según la fecha específica indicada en Canvas. Se espera asistencia puntual y participación activa del equipo; en sesiones remotas, cámara encendida.</li>
<li><strong>Tareas (10%, equipo):</strong> dos tareas asignadas por el profesor, entregadas fuera de clase por cada equipo en la fecha indicada en Canvas.</li>
<li><strong>Examen final presencial (20%, individual):</strong> se realiza en la sesión 8. Es individual, sin apoyo de materiales salvo los explícitamente autorizados por los profesores.</li>
<li><strong>Proyecto final (40%, equipo):</strong> integra el trabajo de campo, el trabajo de análisis, la presentación final y la coevaluación entre pares. Se evalúa con rúbrica; la coevaluación representa al menos 10% de la calificación del proyecto.</li>
<li><strong>Medio oficial de comunicación:</strong> el correo electrónico institucional de los profesores. Todos los mensajes deben incluir nombre, matrícula y curso.</li>
<li><strong>Retroalimentación:</strong> la calificación y retroalimentación de cada actividad estará disponible a más tardar 7 días naturales después de la fecha límite. Una vez publicada, tendrás 7 días para solicitar aclaración; pasada esa fecha, la calificación se considera definitiva.</li>
<li><strong>Entregas fuera de tiempo:</strong> no se aceptan entregas fuera de tiempo, salvo acuerdo previo con los profesores titulares.</li>
<li><strong>Integridad académica y uso de IA generativa:</strong> se aplica la política institucional del Tecnológico de Monterrey. El uso de herramientas de IA generativa debe ser declarado y alineado con las reglas específicas que los profesores fijarán en la primera sesión.</li>
<li><strong>Fallas tecnológicas:</strong> ante una falla de Canvas, el entregable se enviará a la cuenta de correo de los profesores dentro del plazo original, acompañado de evidencia del error.</li>
</ol>"""


# ---------------------------------------------------------------------------
# Sessions — metadata + descripción + objetivos
#
# Source of truth: mt4035/sesion-N.md (extracted manually; kept in code to
# avoid coupling the build with a markdown parser).
# ---------------------------------------------------------------------------

SESSIONS: dict[int, dict] = {
    1: {
        "titulo": "Fundamentos analíticos para retail y e-commerce",
        "fecha": "23 de abril de 2026",
        "dia": "Jueves",
        "profesores": "Eduardo y Marcos (co-impartida)",
        "business_question": "¿Qué herramientas estadísticas debo conocer para tomar decisiones basadas en datos en retail?",
        "descripcion": (
            "Esta sesión es de carácter metodológico. Su propósito es construir la caja de herramientas "
            "estadística y analítica que se usará de forma transversal en el resto del curso, presentando "
            "cada herramienta desde un punto de vista conceptual, no formal: qué pregunta de negocio "
            "responde, qué supuestos tiene, cómo se interpreta y dónde se aplica en retail, e-commerce y "
            "supply chain. Primero se establece el marco general (qué es analítica en retail, de dónde "
            "vienen los datos, cómo se pasa de dato a decisión y cómo una taxonomía de KPIs organiza los "
            "resultados del negocio). Sobre esa base se recorre la caja de herramientas: variabilidad y "
            "distribuciones, muestreo y representatividad, pruebas de hipótesis y p-value, correlación vs. "
            "causalidad, regresión, series de tiempo y análisis de sobrevivencia. El objetivo no es "
            "profundizar en fórmulas, sino dejar un lenguaje común y criterios de elección que las sesiones "
            "posteriores aplicarán a problemas concretos."
        ),
        "objetivos": [
            "Explicar qué es analítica en retail, de dónde vienen los datos (POS, web/app, CRM, supply chain) y cómo se encadena dato → KPI → pregunta de negocio → decisión.",
            "Distinguir las familias de analítica (descriptiva, diagnóstica, predictiva, prescriptiva) y relacionarlas con la taxonomía de KPIs del curso.",
            "Reconocer los principales tipos de distribuciones estadísticas y qué fenómenos de negocio tienden a representar (normales, heavy/long tail, tiempos entre eventos, conteos raros).",
            "Interpretar conceptualmente una prueba de hipótesis: hipótesis nula vs. alternativa, estadístico de prueba, p-value, y cuándo tiene sentido una prueba de una cola vs. dos colas.",
            "Diferenciar correlación y causalidad, y reconocer cuándo una regresión explica, cuándo predice y cuándo engaña.",
            "Entender el propósito de técnicas de series de tiempo y análisis de sobrevivencia como herramientas para modelar tendencias, estacionalidad y fenómenos de tiempo-a-evento en retail.",
            "Argumentar por qué el muestreo y la representatividad son condición previa a cualquier análisis cuantitativo serio.",
        ],
        "temas": "Marco de analítica en retail · Variabilidad y distribuciones · Muestreo y representatividad · Pruebas de hipótesis y p-value · Correlación vs. causalidad · Regresión · Series de tiempo · Análisis de sobrevivencia",
    },
    2: {
        "titulo": "Segmentación y perfilado de clientes",
        "fecha": "29 de abril de 2026",
        "dia": "Miércoles",
        "profesores": "Marcos",
        "business_question": "¿Cómo identifico a mis clientes más valiosos y cómo les ofrezco experiencias diferenciadas?",
        "descripcion": (
            "Esta sesión profundiza en la creación de valor a través del entendimiento del cliente. Se "
            "introducen los conceptos de valor de vida del cliente (CLV) y de segmentación basada en RFM, "
            "discutiendo cómo estos enfoques permiten priorizar clientes y diseñar propuestas diferenciadas. "
            "A partir de ejercicios prácticos, se conecta cada segmento con decisiones concretas de "
            "targeting, personalización, canales y medición de resultados."
        ),
        "objetivos": [
            "Explicar CLV e implementar lógica tipo RFM para clasificar clientes.",
            "Traducir segmentos en acciones (targeting, personalización, ofertas) alineadas a objetivos de negocio.",
            "Plantear hipótesis de segmentación y definir KPIs para evaluar el impacto de las acciones propuestas.",
        ],
        "temas": "CLV (valor de vida del cliente) · Segmentación RFM · Targeting y personalización · KPIs de impacto por segmento",
    },
    3: {
        "titulo": "Analítica de ventas e inventario",
        "fecha": "6 de mayo de 2026",
        "dia": "Miércoles",
        "profesores": "Marcos",
        "business_question": "¿Qué debería vender, cuánto inventario necesito, y cómo sé si mis cambios funcionan?",
        "descripcion": (
            "En esta sesión se analizan de forma crítica los datos de ventas e inventario, diferenciando "
            "entre lo que el cliente quiso comprar, lo que efectivamente compró y lo que se perdió por falta "
            "de producto. Se presenta una visión general de los flujos de pronóstico de demanda, "
            "incorporando patrones de estacionalidad y eventos especiales. Finalmente, se introduce el uso "
            "de experimentos y pruebas A/B en retail para evaluar cambios comerciales u operativos de forma "
            "rigurosa."
        ),
        "objetivos": [
            "Distinguir demanda vs. ventas vs. ventas perdidas y comprender el sesgo por quiebres de stock.",
            "Trazar un flujo de pronóstico de demanda que incorpore estacionalidad y eventos relevantes.",
            "Identificar cuándo y cómo usar experimentos (A/B) para medir el impacto de decisiones sobre ventas e inventario.",
        ],
        "temas": "Demanda vs. ventas vs. ventas perdidas · Pronóstico de demanda · Estacionalidad y eventos · Pruebas A/B en retail",
    },
    4: {
        "titulo": "SCM, inventario y diseño de red",
        "fecha": "13 de mayo de 2026",
        "dia": "Miércoles",
        "profesores": "Eduardo",
        "business_question": "¿Cómo diseño una red que balancea costo de operar vs. nivel de servicio al cliente?",
        "descripcion": (
            "La sesión introduce la perspectiva de supply chain management (SCM) aplicada al retail, "
            "enfatizando la relación entre decisiones de diseño y control (red, inventarios y reposición) y "
            "el desempeño en tiempo, costo y nivel de servicio. Se revisan KPIs clave de supply chain y se "
            "presenta una introducción al diseño de red (qué nodos existen, dónde posicionar inventario y "
            "capacidad, y cómo se balancea costo vs. servicio). Luego se revisan modelos básicos de gestión "
            "de inventario como EOQ y ROP, resaltando sus supuestos y limitaciones. A través del caso "
            "7-Eleven Japan, se discute cómo el uso inteligente de datos puede convertirse en una ventaja "
            "competitiva a lo largo de la cadena. La sesión incluye además la simulación Beer Game — un "
            "ejercicio clásico de cadena de suministro (originalmente desarrollado en MIT por Sterman) que "
            "permite experimentar de primera mano el efecto bullwhip en un canal de distribución de 4 "
            "niveles."
        ),
        "objetivos": [
            "Conectar KPIs de supply chain (tiempo, costo, nivel de servicio) con decisiones analíticas y operativas.",
            "Entender el rol del diseño de red (nodos, echelons, posicionamiento de inventario) y sus tradeoffs costo-servicio.",
            "Entender EOQ/ROP, sus supuestos y límites en contextos reales de retail.",
            "Identificar oportunidades de creación de valor a partir del uso de datos en casos como 7-Eleven.",
        ],
        "temas": "KPIs de supply chain · Diseño de red (nodos, echelons) · EOQ/ROP · Caso 7-Eleven Japan · Simulación Beer Game (efecto bullwhip)",
    },
    5: {
        "titulo": "Transporte y logística omnicanal",
        "fecha": "21 de mayo de 2026",
        "dia": "Jueves",
        "profesores": "Eduardo",
        "business_question": "¿Cómo hago llegar mis pedidos al cliente al menor costo sin romper la promesa de entrega?",
        "descripcion": (
            "En esta sesión se abordan los retos analíticos de transporte y logística en entornos "
            "omnicanal, construyendo sobre el diagrama de red y KPIs definidos en la Sesión 4. Se conectan "
            "decisiones de fulfillment (por ejemplo: ship-from-store vs. CD, dark stores, "
            "micro-fulfillment, cross-docking) con promesa de entrega, cumplimiento, costo y capacidad. "
            "Además, se introducen de forma intuitiva los problemas de ruteo y su impacto en la experiencia "
            "del cliente y la rentabilidad, incluyendo el papel emergente de la IA en logística."
        ),
        "objetivos": [
            "Definir KPIs logísticos clave y proponer intervenciones analíticas para mejorarlos.",
            "Comparar alternativas de diseño de red/fulfillment (nodos y flujos) y anticipar su impacto en costo, servicio y capacidad.",
            "Entender los tradeoffs de última milla y las restricciones básicas de ruteo en contextos reales.",
            "Relacionar decisiones de diseño logístico con la promesa y el cumplimiento de entrega al cliente final.",
        ],
        "temas": "KPIs logísticos · Alternativas de fulfillment omnicanal · Ruteo y última milla · IA aplicada a logística",
    },
    6: {
        "titulo": "Precios, promociones, fraude y seguridad",
        "fecha": "27 de mayo de 2026",
        "dia": "Miércoles",
        "profesores": "Marcos",
        "business_question": "¿Cómo fijo precios y promos que impulsan ventas sin destruir margen, y cómo protejo el negocio contra el fraude?",
        "descripcion": (
            "Esta sesión combina la analítica de precios y promociones con la gestión de fraude y "
            "consideraciones de privacidad y seguridad. Se revisan métricas para evaluar la efectividad de "
            "promociones y se discuten distintas palancas de precio y sus efectos sobre ventas y margen. En "
            "paralelo, se analizan patrones típicos de fraude en retail y e-commerce, así como los "
            "tradeoffs entre control, experiencia del cliente y aprovechamiento de datos."
        ),
        "objetivos": [
            "Evaluar la efectividad de promociones y distintas palancas de precio usando métricas adecuadas.",
            "Reconocer patrones de fraude relevantes en retail y cómo privacidad/seguridad afectan la analítica.",
            "Proponer diseños de promociones y esquemas de control que equilibren rentabilidad, riesgo y experiencia del cliente.",
        ],
        "temas": "Palancas de precio · Efectividad de promociones · Detección de fraude · Privacidad y seguridad · Trade-off control vs. experiencia",
    },
    7: {
        "titulo": "Tecnologías emergentes",
        "fecha": "3 de junio de 2026",
        "dia": "Miércoles",
        "profesores": "Eduardo",
        "business_question": "¿Qué tecnologías emergentes generan valor real en retail y supply chain, y cómo las implemento sin caer en buzzwords?",
        "descripcion": (
            "Esta sesión se enfoca exclusivamente en tecnologías emergentes y cómo evaluar (sin "
            "\"buzzwords\") su contribución real a KPIs de negocio en retail, e-commerce y supply chain. Se "
            "revisan cuatro familias: (1) IoT y visibilidad en tiempo real, (2) IA/ML y, en particular, IA "
            "generativa aplicada a procesos, (3) automatización y robótica en fulfillment/operaciones, y "
            "(4) blockchain e infraestructura de confianza para trazabilidad e intercambio de datos. El "
            "énfasis está en traducir tecnología en cambio de proceso, requerimientos de datos/operación, "
            "riesgos (privacidad, seguridad, compliance) y un plan de implementación tipo MVP alineado al "
            "proyecto final."
        ),
        "objetivos": [
            "Evaluar tecnologías emergentes con un marco consistente: problema → KPI → dato → modelo → integración en proceso → riesgos.",
            "Identificar casos de uso realistas de IoT, IA/ML (incl. generativa), automatización y blockchain en retail y supply chain.",
            "Traducir una iniciativa tecnológica en un MVP con requerimientos de datos, cambios operativos, métricas de éxito y limitaciones.",
            "Conectar el proyecto final del curso con oportunidades tecnológicas concretas y factibles.",
        ],
        "temas": "IoT y visibilidad en tiempo real · IA/ML e IA generativa · Automatización y robótica en fulfillment · Blockchain y trazabilidad · MVP y evaluación de tecnología",
    },
    8: {
        "titulo": "Presentaciones finales y examen",
        "fecha": "10 de junio de 2026",
        "dia": "Miércoles",
        "profesores": "Eduardo y Marcos",
        "business_question": "¿Puedo integrar todo el curso en una recomendación defendible frente a un líder de negocio?",
        "descripcion": (
            "La sesión final está dedicada a la integración de todos los conceptos del curso a través de "
            "las presentaciones de proyecto y el examen final. Los equipos exponen su trabajo de campo y "
            "análisis aplicado, mostrando cómo conectan datos, procesos y decisiones para generar valor en "
            "un contexto real de negocio. El examen complementa esta evaluación, asegurando que cada "
            "estudiante consolide una comprensión individual de los marcos y herramientas revisados. El "
            "examen enfatiza el contenido de la sesión 7 (tecnologías emergentes), que es el único bloque "
            "no evaluado por quiz durante el curso."
        ),
        "objetivos": [
            "Evidenciar pensamiento analítico end-to-end y formular recomendaciones accionables basadas en evidencia.",
            "Comunicar de forma clara hallazgos, insights y su impacto esperado en KPIs de negocio.",
            "Validar su comprensión individual de los conceptos y herramientas clave mediante el examen final.",
        ],
        "temas": "Presentaciones finales del proyecto (equipo, ~15 min) · Coevaluación entre pares · Examen final presencial (individual, énfasis en sesión 7)",
    },
}

# Identifier of the Sesión 1 intro WikiPage that already exists in the
# original IMSCC. We reuse it so we don't need to register a new resource.
SESSION_1_EXISTING_PAGE_ID = "gad67e8968aa76be2a4e20573a1c21d5c"
SESSION_1_EXISTING_PAGE_FILE = "wiki_content/1-dot-1-introduccion-a-la-sesion-1.html"

# Map session number → module identifier (from the original export).
SESSION_MODULE_IDS = {
    1: "gb8a6180df3abc1d004078118a829e6b1",
    2: "g908c405bd7111c7025203a86fc171252",
    3: "g443091dcafd64dbfee703e7c5caaab71",
    4: "g25e951d011f72953fb86f7edd0c00152",
    5: "gad337b74c95a7197d3d141255a9e8e28",
    6: "g845e75dff579f876d536ef8375d7c737",
    7: "g28d7f27cb1dbe2dce559434d631a7da0",
    8: "gdf456ec91046715db179d3aa60ae65c5",
}


def make_id(seed: str) -> str:
    """Canvas-compatible identifier: 'g' + 32-char MD5 hex."""
    return "g" + hashlib.md5(seed.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Session module renaming
# ---------------------------------------------------------------------------

# Format expected by both module_meta.xml and the organization tree in
# imsmanifest.xml. The original placeholder is:
#   "Sesión N - [Nombre de la Sesión] <fecha>"
# which is rendered with &lt;fecha&gt; once the XML is parsed.
SESSION_RENAMES = [
    ("Sesión 1 - [Nombre de la Sesión] <fecha>",
     "Sesión 1 - Fundamentos analíticos para retail y e-commerce | 23-abr-2026"),
    ("Sesión 2 - [Nombre de la Sesión] <fecha>",
     "Sesión 2 - Segmentación y perfilado de clientes | 29-abr-2026"),
    ("Sesión 3 - [Nombre de la Sesión] <fecha>",
     "Sesión 3 - Analítica de ventas e inventario | 6-may-2026"),
    ("Sesión 4 - [Nombre de la Sesión] <fecha>",
     "Sesión 4 - SCM, inventario y diseño de red | 13-may-2026"),
    ("Sesión 5 - [Nombre de la Sesión] <fecha>",
     "Sesión 5 - Transporte y logística omnicanal | 21-may-2026"),
    ("Sesión 6 - [Nombre de la Sesión] <fecha>",
     "Sesión 6 - Precios, promociones y fraude | 27-may-2026"),
    ("Sesión 7 - [Nombre de la Sesión] <fecha>",
     "Sesión 7 - Tecnologías emergentes | 3-jun-2026"),
    ("Sesión 8 - [Nombre de la Sesión] <fecha>",
     "Sesión 8 - Presentaciones finales + examen | 10-jun-2026"),
]

# Module identifiers whose workflow_state should be flipped to "active".
SESSION_MODULE_IDS_TO_PUBLISH = [
    "g443091dcafd64dbfee703e7c5caaab71",  # Sesión 3
    "g25e951d011f72953fb86f7edd0c00152",  # Sesión 4
    "gad337b74c95a7197d3d141255a9e8e28",  # Sesión 5
    "g845e75dff579f876d536ef8375d7c737",  # Sesión 6
    "g28d7f27cb1dbe2dce559434d631a7da0",  # Sesión 7
    "gdf456ec91046715db179d3aa60ae65c5",  # Sesión 8
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write(p: Path, s: str) -> None:
    p.write_text(s, encoding="utf-8")


def replace_body(html_text: str, new_body_inner: str) -> str:
    """Replace the inner HTML of the <body> tag while preserving <head>."""
    return re.sub(
        r"(<body>)(.*?)(</body>)",
        lambda m: m.group(1) + "\n" + new_body_inner + "\n" + m.group(3),
        html_text,
        count=1,
        flags=re.DOTALL,
    )


# ---------------------------------------------------------------------------
# Patches
# ---------------------------------------------------------------------------

def patch_bienvenida(build: Path) -> None:
    p = build / "wiki_content" / "bienvenida-y-equipo-docente.html"
    html = read(p)
    # Fix clave T4035 -> MT4035
    html = html.replace(">T4035<", ">MT4035<")
    # Fill the "Competencias a desarrollar" placeholder
    placeholder = "<p>[ Colocar la información correspondiente a los elementos distintivos del curso. ]</p>"
    if placeholder not in html:
        raise RuntimeError("Bienvenida: placeholder de competencias no encontrado")
    html = html.replace(placeholder, COMPETENCIAS_BLOCK)
    # Insert Salón and Horario rows right before the "Período académico" row
    periodo_row_anchor = (
        '<tr style="height: 24px;">\n'
        '<th style="background-color: #0350a1; height: 24px; width: 25%; border-color: #cccccc; text-align: left;" scope="row"><strong><span style="color: #ffffff;">Período académico:</span></strong></th>'
    )
    extra_rows = (
        '<tr style="height: 24px;">\n'
        '<th style="background-color: #0350a1; height: 24px; width: 25%; border-color: #cccccc; text-align: left;" scope="row"><strong><span style="color: #ffffff;">Salón:</span></strong></th>\n'
        '<td style="height: 24px; width: 75%; border-color: #cccccc;">EG-215 (presencial)</td>\n'
        '</tr>\n'
        '<tr style="height: 24px;">\n'
        '<th style="background-color: #0350a1; height: 24px; width: 25%; border-color: #cccccc; text-align: left;" scope="row"><strong><span style="color: #ffffff;">Horario:</span></strong></th>\n'
        '<td style="height: 24px; width: 75%; border-color: #cccccc;">18:30 – 21:45 (días: miércoles y jueves según calendario)</td>\n'
        '</tr>\n'
    )
    if periodo_row_anchor not in html:
        raise RuntimeError("Bienvenida: fila 'Período académico' no encontrada para anclar Salón/Horario")
    html = html.replace(periodo_row_anchor, extra_rows + periodo_row_anchor, 1)
    write(p, html)


def patch_syllabus(build: Path) -> None:
    p = build / "wiki_content" / "syllabus.html"
    html = read(p)
    html = replace_body(html, SYLLABUS_BODY)
    write(p, html)


def patch_evaluacion(build: Path) -> None:
    p = build / "wiki_content" / "evaluacion.html"
    html = read(p)
    html = replace_body(html, EVALUACION_BODY)
    write(p, html)


def patch_bibliografia(build: Path) -> None:
    p = build / "wiki_content" / "bibliografia.html"
    html = read(p)
    html = replace_body(html, BIBLIOGRAFIA_BODY)
    write(p, html)


def patch_politicas(build: Path) -> None:
    p = build / "wiki_content" / "politicas.html"
    html = read(p)
    # Replace the (Actualizar) marker so the page no longer advertises pending work.
    html = html.replace(
        '<strong>B. Políticas propias del curso <span style="background-color: #fbeeb8;">(Actualizar)</span></strong>',
        '<strong>B. Políticas propias del curso</strong>',
    )
    # Replace the ordered list inside the A12 block.
    new_html, n = re.subn(
        r'<ol type="a">.*?</ol>',
        POLITICAS_B_LIST,
        html,
        count=1,
        flags=re.DOTALL,
    )
    if n != 1:
        raise RuntimeError("Políticas: ordered list del bloque B no encontrado")
    write(p, new_html)


def rename_session_modules(build: Path) -> None:
    """Rename the 8 session modules both in module_meta.xml and in imsmanifest.xml."""
    for filename in ("course_settings/module_meta.xml", "imsmanifest.xml"):
        p = build / filename
        s = read(p)
        for old, new in SESSION_RENAMES:
            # Both files store the titles with XML-escaped angle brackets
            old_xml = old.replace("<", "&lt;").replace(">", "&gt;")
            if old_xml in s:
                s = s.replace(old_xml, new)
            elif old in s:
                s = s.replace(old, new)
            else:
                raise RuntimeError(
                    f"{filename}: título '{old}' no encontrado (revisar escape XML)"
                )
        write(p, s)


# ---------------------------------------------------------------------------
# Session intro pages + home page
# ---------------------------------------------------------------------------

def session_intro_page_id(n: int) -> str:
    if n == 1:
        return SESSION_1_EXISTING_PAGE_ID
    return make_id(f"mt4035_sesion_{n}_introduccion_page")


def session_intro_item_id(n: int) -> str:
    return make_id(f"mt4035_sesion_{n}_introduccion_item")


def session_intro_slug(n: int) -> str:
    return f"{n}-dot-1-introduccion-a-la-sesion-{n}"


def session_intro_filename(n: int) -> str:
    if n == 1:
        # Preserve the original slug so the existing resource ref stays valid.
        return SESSION_1_EXISTING_PAGE_FILE
    return f"wiki_content/{session_intro_slug(n)}.html"


def build_session_intro_html(n: int) -> str:
    meta = SESSIONS[n]
    page_id = session_intro_page_id(n)
    objetivos_html = "\n".join(f"<li>{o}</li>" for o in meta["objetivos"])
    title_attr = f"{n}.1 Introducción a la Sesión {n}"
    return f"""<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>{title_attr}</title>
<meta name="identifier" content="{page_id}"/>
<meta name="editing_roles" content="teachers"/>
<meta name="workflow_state" content="active"/>
</head>
<body>
{GRADIENT_BAR}
<h2><strong>Sesión {n} &mdash; {meta["titulo"]}</strong></h2>
<table style="width: 100%; border-collapse: collapse; border: 1px solid #cccccc;" border="1" cellspacing="0" cellpadding="6">
<tbody>
<tr><th style="background-color: #0350a1; color: #ffffff; width: 25%; text-align: left;">Fecha</th><td>{meta["fecha"]} &mdash; {meta["dia"]}</td></tr>
<tr><th style="background-color: #0350a1; color: #ffffff; text-align: left;">Horario y salón</th><td>18:30 – 21:45 &middot; EG-215 (presencial)</td></tr>
<tr><th style="background-color: #0350a1; color: #ffffff; text-align: left;">Profesor(es)</th><td>{meta["profesores"]}</td></tr>
<tr><th style="background-color: #0350a1; color: #ffffff; text-align: left;">Business question</th><td><em>{meta["business_question"]}</em></td></tr>
</tbody>
</table>
<p>&nbsp;</p>
<h3><span style="color: #0350a1;"><strong>Descripción de la sesión</strong></span></h3>
<p>{meta["descripcion"]}</p>
<h3><span style="color: #0350a1;"><strong>Objetivos de aprendizaje</strong></span></h3>
<p>Al finalizar la sesión, las y los estudiantes serán capaces de:</p>
<ul>
{objetivos_html}
</ul>
<h3><span style="color: #0350a1;"><strong>Temas principales</strong></span></h3>
<p>{meta["temas"]}</p>
<p>&nbsp;</p>
</body>
</html>"""


def write_session_intro_pages(build: Path) -> None:
    for n in range(1, 9):
        path = build / session_intro_filename(n)
        path.parent.mkdir(parents=True, exist_ok=True)
        write(path, build_session_intro_html(n))


def add_session_items_to_module_meta(build: Path) -> None:
    """Insert N.1 Introducción items into each session module's <items>."""
    p = build / "course_settings" / "module_meta.xml"
    s = read(p)
    for n in range(1, 9):
        mod_id = SESSION_MODULE_IDS[n]
        page_id = session_intro_page_id(n)
        item_id = session_intro_item_id(n)
        title = f"{n}.1 Introducción a la Sesión {n}"
        new_item = (
            f'      <item identifier="{item_id}">\n'
            f'        <content_type>WikiPage</content_type>\n'
            f'        <workflow_state>active</workflow_state>\n'
            f'        <title>{title}</title>\n'
            f'        <identifierref>{page_id}</identifierref>\n'
            f'        <position>1</position>\n'
            f'        <new_tab>false</new_tab>\n'
            f'        <indent>0</indent>\n'
            f'        <link_settings_json>null</link_settings_json>\n'
            f'      </item>\n'
        )
        # Match the module block up to its <items> opening tag and insert
        # the new item right after. The pattern accepts an empty <items>
        # ("<items>\n    </items>") or an <items> block that already has
        # children (Sesión 1).
        pattern = (
            rf'(<module identifier="{re.escape(mod_id)}">'
            rf'[\s\S]*?<items>\s*\n)'
        )
        if n == 1:
            # Session 1 already has a "1.1 Introducción a la Sesión 1." item
            # referencing the same page ID. Skip inserting a duplicate.
            continue
        new_s, count = re.subn(pattern, lambda m: m.group(1) + new_item, s, count=1)
        if count != 1:
            raise RuntimeError(
                f"module_meta.xml: no se pudo insertar intro en módulo sesión {n}"
            )
        s = new_s
        # Bump positions of any existing siblings (defensive: they are empty
        # today, so this is a no-op for sessions 2-8).
    write(p, s)


def add_session_resources_to_manifest(build: Path) -> None:
    """Add new <resource> declarations and organization items to imsmanifest.xml
    for Sesiones 2-8 intro pages. Sesión 1 uses the existing resource."""
    p = build / "imsmanifest.xml"
    s = read(p)

    # (a) Inject <resource> entries immediately before </resources>.
    resource_xml_parts: list[str] = []
    for n in range(2, 9):
        page_id = session_intro_page_id(n)
        href = session_intro_filename(n)
        resource_xml_parts.append(
            f'    <resource identifier="{page_id}" type="webcontent" href="{href}">\n'
            f'      <file href="{href}"/>\n'
            f'    </resource>'
        )
    resource_block = "\n".join(resource_xml_parts) + "\n  "
    s_new, n = re.subn(r"(\n  </resources>)", f"\n{resource_block}\\1", s, count=1)
    if n != 1:
        raise RuntimeError("imsmanifest.xml: </resources> no encontrado")
    s = s_new

    # (b) Inject organization items inside each session module's <item>.
    for n_sess in range(2, 9):
        mod_id = SESSION_MODULE_IDS[n_sess]
        page_id = session_intro_page_id(n_sess)
        item_id = session_intro_item_id(n_sess)
        title = f"{n_sess}.1 Introducción a la Sesión {n_sess}"
        # Match the opening organization item tag for this module up to the
        # line break, then inject the child item before its closing </item>.
        pattern = (
            rf'(<item identifier="{re.escape(mod_id)}">\s*<title>[^<]+</title>)\s*</item>'
        )
        replacement = (
            r"\1\n          "
            f'<item identifier="{item_id}" identifierref="{page_id}">\n'
            f'            <title>{title}</title>\n'
            f'          </item>\n        </item>'
        )
        s_new, n = re.subn(pattern, replacement, s, count=1)
        if n != 1:
            raise RuntimeError(
                f"imsmanifest.xml: organization item para sesión {n_sess} no encontrado"
            )
        s = s_new

    write(p, s)


def patch_pagina_de_inicio(build: Path) -> None:
    p = build / "wiki_content" / "pagina-de-inicio.html"
    html = read(p)

    # (a) Replace the "intro / bienvenida" placeholder.
    intro_old = "[Aquí incluimos una Introducción / Bienvenida breve del contenido del curso]"
    intro_new = (
        "Bienvenidas y bienvenidos al curso MT4035 &mdash; <em>Aplicaciones de la "
        "analítica de datos: comercio minorista, comercio electrónico y cadena de "
        "suministro</em>. En 8 sesiones construiremos juntos la caja de herramientas "
        "analítica para diagnosticar y mejorar decisiones reales en retail, e-commerce y "
        "supply chain, trabajando sobre el caso de una empresa real del sector elegida "
        "por cada equipo."
    )
    if intro_old not in html:
        raise RuntimeError("Página de inicio: placeholder de intro no encontrado")
    html = html.replace(intro_old, intro_new)

    # (b) Replace the Salón/Fechas/Horario placeholder (split across two spans).
    salon_old = (
        '<span style="font-size: 12pt; line-height: 14pt;">[</span>'
        '<span style="font-size: 12pt; line-height: 14pt;">Incluir información solicitada del curso]</span>'
    )
    salon_new = (
        '<span style="font-size: 12pt; line-height: 14pt;">'
        'EG-215 &mdash; 18:30 a 21:45 &mdash; del 23 de abril al 10 de junio de 2026 '
        '(8 sesiones; algunas en miércoles y otras en jueves &mdash; ver calendario en el Syllabus).'
        '</span>'
    )
    if salon_old not in html:
        raise RuntimeError("Página de inicio: placeholder de salón/fechas no encontrado")
    html = html.replace(salon_old, salon_new)

    # (c) Replace the "Objetivo General del curso" table with a populated one.
    new_table = _build_pagina_inicio_sesiones_table()
    pattern = r'<table style="border-collapse: collapse; width: 99\.8634%;[\s\S]*?</table>'
    html_new, count = re.subn(pattern, new_table, html, count=1)
    if count != 1:
        raise RuntimeError("Página de inicio: tabla de sesiones no encontrada")
    write(p, html_new)


def _build_pagina_inicio_sesiones_table() -> str:
    rows = []
    for n in range(1, 9):
        meta = SESSIONS[n]
        rows.append(
            f'<tr>'
            f'<th style="background-color: #1f55a0; color: #ffffff; text-align: center; width: 8%;">Sesión {n}</th>'
            f'<td style="padding: 6px;"><strong>{meta["titulo"]}</strong><br><span style="color: #666;">{meta["fecha"]} ({meta["dia"]}) · {meta["profesores"]}</span></td>'
            f'<td style="padding: 6px;"><em>{meta["business_question"]}</em></td>'
            f'<td style="padding: 6px;">{meta["temas"]}</td>'
            f'</tr>'
        )
    rows_html = "\n".join(rows)
    return f'''<table style="border-collapse: collapse; width: 100%; border: 1px solid #cccccc;" border="1" cellspacing="0" cellpadding="6">
<caption><strong>Objetivo general del curso</strong></caption>
<thead>
<tr>
<th style="background-color: #1f55a0; color: #ffffff; width: 100%;" colspan="4">
<p style="margin: 8px;">Implementar herramientas de analítica de datos en un caso práctico de una empresa de comercio minorista, e-commerce, logística o cadena de suministro, con el propósito de identificar los indicadores clave de desempeño (KPIs) y aplicar las técnicas analíticas que permitan optimizar procesos y mejorar la toma de decisiones estratégicas.</p>
</th>
</tr>
<tr>
<th style="background-color: #1f55a0; color: #ffffff;">Sesión</th>
<th style="background-color: #1f55a0; color: #ffffff;">Nombre de la sesión · Fecha</th>
<th style="background-color: #1f55a0; color: #ffffff;">Business question</th>
<th style="background-color: #1f55a0; color: #ffffff;">Temas a impartir</th>
</tr>
</thead>
<tbody>
{rows_html}
</tbody>
</table>'''


def publish_sessions(build: Path) -> None:
    """Flip workflow_state from 'unpublished' to 'active' for sessions 3-8."""
    p = build / "course_settings" / "module_meta.xml"
    s = read(p)
    for mod_id in SESSION_MODULE_IDS_TO_PUBLISH:
        # Only flip the module's own workflow_state, not any nested item.
        pattern = (
            rf'(<module identifier="{re.escape(mod_id)}">\s*<title>[^<]+</title>\s*'
            rf'<workflow_state>)unpublished(</workflow_state>)'
        )
        s, n = re.subn(pattern, r"\1active\2", s, count=1)
        if n != 1:
            raise RuntimeError(f"No se encontró el workflow_state del módulo {mod_id}")
    write(p, s)


# ---------------------------------------------------------------------------
# Packaging
# ---------------------------------------------------------------------------

def package(build: Path, out: Path) -> None:
    """Write the .imscc with imsmanifest.xml first and ZIP_STORED compression."""
    out.unlink(missing_ok=True)
    files: list[Path] = [f for f in sorted(build.rglob("*")) if f.is_file()]
    manifest = build / "imsmanifest.xml"
    if manifest not in files:
        raise RuntimeError("imsmanifest.xml no está en el build dir")
    files.remove(manifest)
    files.insert(0, manifest)
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_STORED) as zf:
        for f in files:
            rel = f.relative_to(build).as_posix()
            zf.write(f, rel)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(f"IMSCC original no encontrado: {SRC}")
    with tempfile.TemporaryDirectory() as td:
        build = Path(td) / "build"
        build.mkdir()
        with zipfile.ZipFile(SRC) as zf:
            zf.extractall(build)

        patch_bienvenida(build)
        patch_syllabus(build)
        patch_evaluacion(build)
        patch_bibliografia(build)
        patch_politicas(build)
        patch_pagina_de_inicio(build)
        rename_session_modules(build)
        publish_sessions(build)
        write_session_intro_pages(build)
        add_session_items_to_module_meta(build)
        add_session_resources_to_manifest(build)

        package(build, OUT)

    size_kb = OUT.stat().st_size // 1024
    print(f"OK  {OUT.name}  ({size_kb} KB)")


if __name__ == "__main__":
    main()
