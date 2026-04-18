# TODOs — Integración del curso MT4035 a Canvas (IMSCC)

Este documento rastrea el contenido **pendiente** de agregar al export IMSCC del curso. El export vigente se genera con `python3 mt4035/canvas/build_imscc.py` y se publica en `mt4035/canvas/mt4035-initial-export.imscc`. El plan general de integración vive en [`plan-integracion-canvas.md`](./plan-integracion-canvas.md).

Convención de estados:
- ✅ **Hecho** — ya refleja la fuente de verdad del repo.
- ⏳ **Pendiente** — no está en el export o sigue con contenido de plantilla.
- ⚠ **Decisión abierta** — bloqueado hasta que se resuelva una pregunta.

---

## 1. Página de inicio (Front Page)

| Estado | Notas |
|---|---|
| ✅ Hecho | Intro/bienvenida llenada; tabla de 8 sesiones poblada con título, fecha, profesor, business question y temas; Objetivo general del curso en el encabezado. |

### Ajustes finos pendientes

- ⚠ **Salón y horario de clase**: hoy queda como "por confirmar con coordinación". Actualizar una vez asignados.

---

## 2. Programa de estudios (módulo 2)

| Página | Estado | Notas |
|---|---|---|
| Bienvenida y Equipo Docente | ✅ Hecho | Perfiles docentes ya venían correctos en el IMSCC base. Se corrigió clave (`T4035` → `MT4035`) y se llenó el bloque "Competencias a desarrollar" con Data Business Strategy + Pensamiento crítico 3 + Innovación 2. |
| Syllabus | ✅ Hecho | Se reemplazó el placeholder por objetivo general, tabla de sesiones (8 filas con fecha/profesor/tema/business question), metodología y compromisos del estudiante. |
| Políticas | ✅ Hecho | Se reescribió el bloque "B. Políticas propias del curso" con las 11 políticas derivadas de `syllabus.md` §X. El bloque A (políticas institucionales) se conserva tal cual. |
| Evaluación | ✅ Hecho | Tabla con 5 componentes (18% reportes + 12% quizzes + 10% tareas + 20% examen + 40% proyecto) distinguiendo individuales vs. colaborativas. |
| Bibliografía | ✅ Hecho | Obligatoria (Berman, Downey, Okunev) + complementaria (Chaubard, Prajapat, Agrawal & Smith, Fernie & Sparks, Iansiti & Lakhani). |

### Ajustes finos pendientes

- ⚠ **Modalidad del curso** en la ficha técnica de Bienvenida (hoy dice "Presencial"). Validar con coordinación.
- ⚠ **Bibliografía por licencia / accesibilidad**: los bullets de licencia y accesibilidad de cada texto quedaron fuera del rewrite porque no se tiene el dato consolidado. Agregar cuando esté disponible.

---

## 3. Actividades Iniciales (módulo 3)

✅ Se conservan tal cual: *Tu perfil en Canvas*, *Firma de los Principios y Valores*, *Navegación del curso*, *Foro de presentación*. Son onboarding institucional.

- ⏳ Decidir si el *Foro de presentación* se publica (hoy `workflow_state=unpublished`).

---

## 4. Módulos de sesión (módulos 4–11)

### 4.1 Renombrado y publicación

| # | Estado | Título en Canvas |
|---|---|---|
| Sesión 1 | ✅ renombrada, ya estaba publicada | *Fundamentos analíticos para retail y e-commerce \| 23-abr-2026* |
| Sesión 2 | ✅ renombrada, ya estaba publicada | *Segmentación y perfilado de clientes \| 29-abr-2026* |
| Sesión 3 | ✅ renombrada y **publicada** | *Analítica de ventas e inventario \| 6-may-2026* |
| Sesión 4 | ✅ renombrada y **publicada** | *SCM, inventario y diseño de red \| 13-may-2026* |
| Sesión 5 | ✅ renombrada y **publicada** | *Transporte y logística omnicanal \| 21-may-2026* |
| Sesión 6 | ✅ renombrada y **publicada** | *Precios, promociones y fraude \| 27-may-2026* |
| Sesión 7 | ✅ renombrada y **publicada** | *Tecnologías emergentes \| 3-jun-2026* |
| Sesión 8 | ✅ renombrada y **publicada** | *Presentaciones finales + examen \| 10-jun-2026* |

### 4.2 Páginas de introducción por sesión (`N.1 Introducción a la Sesión N`)

✅ **Las 8 páginas ya están generadas y ligadas a su módulo** (una WikiPage por sesión, con ficha breve, descripción, objetivos y temas principales tomados de `mt4035/sesion-N.md`).

| # | Archivo | Estado |
|---|---|---|
| 1 | `wiki_content/1-dot-1-introduccion-a-la-sesion-1.html` | ✅ |
| 2 | `wiki_content/2-dot-1-introduccion-a-la-sesion-2.html` | ✅ |
| 3 | `wiki_content/3-dot-1-introduccion-a-la-sesion-3.html` | ✅ |
| 4 | `wiki_content/4-dot-1-introduccion-a-la-sesion-4.html` | ✅ |
| 5 | `wiki_content/5-dot-1-introduccion-a-la-sesion-5.html` | ✅ |
| 6 | `wiki_content/6-dot-1-introduccion-a-la-sesion-6.html` | ✅ |
| 7 | `wiki_content/7-dot-1-introduccion-a-la-sesion-7.html` | ✅ |
| 8 | `wiki_content/8-dot-1-introduccion-a-la-sesion-8.html` | ✅ |

### 4.3 Contenido restante por sesión

- **Sesión 1:** ⏳ el módulo aún conserva **6 ítems de plantilla institucional** junto al 1.1 actualizado (subheaders "1.2 Revisar el siguiente video" y "1.3 Revisar el siguiente recurso", un ExternalUrl de ejemplo, un Attachment de ejemplo, *Formato - Tarea - EGADE*, *Formato - Examen EGADE*). Reemplazar con contenido real de `mt4035/sesion-1.md`:
  - Lecturas previas / videos reales.
  - Actividad en clase (mini-caso "Si fueras CDO de un retailer...").
  - Reporte de caso Sesión 1 (Assignment que alimenta el componente 18%).
- **Sesiones 2–8:** ⏳ los módulos sólo tienen la página `N.1 Introducción`. Por cada sesión falta agregar:
  - Lecturas previas / recursos externos (ExternalUrl / Attachment) según `mt4035/sesion-N.md` §Libro de texto y §Lecturas.
  - Página o Assignment con la **actividad en clase** (caso base o mini-caso).
  - Assignment de **reporte de caso** (alimenta el componente *Reportes de casos y actividades de clase*, 18%).
  - Para sesiones 2–7: **Quiz inicial** sobre el contenido de la sesión anterior (6 quizzes que alimentan el componente *Quizzes*, 12%).
- **Sesión 8 específicamente:** ⏳ agregar la estructura capstone:
  - Assignment: entrega del reporte final del proyecto (equipo).
  - Assignment: presentación final del proyecto (equipo).
  - Assignment: coevaluación entre pares (individual, feed al 10% del proyecto).
  - Examen final presencial: ver sección 6.

---

## 5. Assignment Groups y evaluación

- ⏳ **Rediseñar los 2 Assignment Groups actuales** ("Tareas Individuales 50%", "Tareas en Equipo 50%") y reemplazarlos por los 5 grupos del esquema aprobado:
  1. Reportes de casos y actividades de clase — Individual — 18%
  2. Quizzes en línea — Individual — 12%
  3. Tareas — Equipo — 10%
  4. Examen final presencial — Individual — 20%
  5. Proyecto final — Equipo — 40%
- ⏳ Este cambio se hará cuando se agreguen los assignments reales, para que cada uno se asigne al grupo correcto desde su `assignment_settings.xml`.

---

## 6. Quizzes y examen final

- ⏳ **6 quizzes en línea** en Canvas, aplicados al inicio de las sesiones 2–7. Falta diseñar:
  - Banco de preguntas por sesión (cada quiz cubre la sesión anterior).
  - Tiempo límite, shuffle y política de intentos (normalmente 1 intento).
  - Ventana de disponibilidad (open/close timestamps en UTC).
- ⏳ **Examen final presencial (sesión 8).** Definir formato en Canvas:
  - Opción A: *Assignment* de "entrega de constancia" (sólo registro).
  - Opción B: *Quiz* con las 6 secciones A–F definidas en `mt4035/examen-final.md` (pesos internos 15/20/20/15/20/10).
  - ⚠ Decisión abierta (ver `plan-integracion-canvas.md` §7).

---

## 7. Dos tareas de equipo (10%)

- ⚠ **Decisión abierta:** ¿qué cubren las 2 tareas y cuándo se entregan?
  - Propuesta inicial: Tarea 1 tras sesión 3 (diagnóstico as-is del retailer del proyecto); Tarea 2 tras sesión 6 (propuesta to-be + plan de medición).
- Una vez decidido: crear 2 Assignments (submission_type `online_upload` o `online_text_entry,online_upload`), vincularlos al Assignment Group *Tareas*, colocarlos en el módulo de sesión correspondiente.

---

## 8. Proyecto final (40%)

- ⏳ **Assignments a crear en la sesión 8:**
  - Entrega del reporte final (equipo, con rúbrica de `mt4035/rubrica-practica-trabajo-de-campo.md`).
  - Presentación final (equipo).
  - Coevaluación entre pares (individual).
- ⏳ Rúbrica institucional:
  - Subir la rúbrica como recurso en `rubrics.xml` (hoy el export no incluye una rúbrica propia).
  - **Post-importación en Canvas (manual):** adjuntar la rúbrica al Assignment y, si aplica, marcar la casilla *Remove points* — ninguno de estos dos pasos se puede codificar en el IMSCC.

---

## 9. Metadatos del curso (`course_settings/course_settings.xml`)

- ⚠ **Validar `start_at`:** hoy = `2026-04-20T06:00:00` (UTC). La primera sesión es el 23-abr. Confirmar con coordinación si el `start_at` institucional es la fecha del trimestre o la fecha de la primera clase.
- ⚠ **Validar `conclude_at`:** hoy = `2026-07-20T05:59:59`. La última sesión es el 10-jun; ¿se mantiene la ventana ampliada del trimestre?
- ⏳ **Tab configuration:** revisar qué pestañas de Canvas quedan visibles vs. ocultas (`tab_configuration`). Hoy visibles: Home, Syllabus, Assignments, Modules, People.

---

## 10. Recursos y archivos

- ⏳ **Lecturas por sesión:** para cada sesión definir si los capítulos obligatorios se enlazan como `ExternalUrl` (DOI / Biblioteca Digital Tec) o se suben como `Attachment` al folder `web_resources/`.
- ⏳ **Slides de clase:** una vez listos, agregar como `ExternalUrl` (Google Slides / OneDrive) o `Attachment` (PDF) por sesión.
- ⏳ **Dataset del proyecto final:** subir como `Attachment` al `web_resources/` cuando se confirme.

---

## 11. Pasos manuales post-importación a Canvas

Cuando se importe el `.imscc` a Canvas, **recordar** completar estos pasos que **no se pueden codificar** en el cartridge (fuente: skill `imscc`, `references/reconstruction.md`):

1. **Adjuntar rúbricas a los Assignments** — la rúbrica viaja como recurso en Canvas pero el binding `assignment ↔ rubric` y la casilla *Remove points from rubric* se configuran en la UI.
2. **Publicar manualmente** los ítems que deban quedar visibles a los estudiantes (el cartridge respeta el `workflow_state`, pero es buena práctica validar módulo por módulo después de importar).
3. **Validar fechas de entrega** directamente en el calendario de Canvas (el `.imscc` las codifica en UTC; Canvas las muestra en la zona horaria del usuario).
4. **Configurar quizzes:** tiempo límite, shuffle, ventana de disponibilidad, número de intentos.
5. **Validar enlaces `$IMS-CC-FILEBASE$`** abriendo un par de páginas con imágenes para confirmar que los recursos se resolvieron.

---

[← Plan de integración](./plan-integracion-canvas.md) · [← README del curso](../README.md)
