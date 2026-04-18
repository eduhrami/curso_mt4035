# Plan de integración del curso MT4035 al IMSCC de EGADE

Este documento mapea el contenido del repositorio (`mt4035/syllabus.md`, `mt4035/sesion-N.md`, `mt4035/practica-trabajo-de-campo.md`, `mt4035/examen-final.md`) a la estructura de secciones del export IMSCC institucional `aplicaciones-de-la-analitica-de-datos-...-gpo-50-export.imscc`.

**Fuente de la estructura Canvas:** export IMSCC actual, descomprimido en `/tmp/canvas_export/`.
**Fuente de verdad del contenido:** documentos del repositorio (`mt4035/syllabus.md` es autoritativo).
**Convención:** cuando la plantilla del export ya tenga contenido correcto (p. ej. perfiles docentes), se conserva tal cual.

---

## 1. Estado actual del export IMSCC

El export trae **12 módulos**:

| # | Módulo | Estado | Ítems | Acción global |
|---|---|---|---|---|
| 1 | Inicia aquí | active | 1 | Conservar (onboarding institucional) |
| 2 | Programa de estudios | active | 7 | **Llenar placeholders** con contenido del repo |
| 3 | Actividades Iniciales | active | 4 | Conservar (onboarding institucional) |
| 4 | Sesión 1 — [Nombre] \<fecha\> | active | 7 (ejemplo) | **Renombrar + reemplazar plantilla con contenido real** |
| 5 | Sesión 2 — [Nombre] \<fecha\> | active | 0 | **Renombrar + poblar** |
| 6 | Sesión 3 — [Nombre] \<fecha\> | unpublished | 0 | **Renombrar + poblar + publicar** |
| 7 | Sesión 4 — [Nombre] \<fecha\> | unpublished | 0 | **Renombrar + poblar + publicar** |
| 8 | Sesión 5 — [Nombre] \<fecha\> | unpublished | 0 | **Renombrar + poblar + publicar** |
| 9 | Sesión 6 — [Nombre] \<fecha\> | unpublished | 0 | **Renombrar + poblar + publicar** |
| 10 | Sesión 7 — [Nombre] \<fecha\> | unpublished | 0 | **Renombrar + poblar + publicar** |
| 11 | Sesión 8 — [Nombre] \<fecha\> | unpublished | 0 | **Renombrar + poblar + publicar** |
| 12 | Formatos EGADE | unpublished | 3 | Conservar oculto (plantillas internas) |

**Identificador del curso:** `MT4035.50`, título: *"Aplicaciones de la analítica de datos - comercio minorista, comercio electrónico y cadena de suministro (Gpo 50)"*.

**Fechas del course_settings:** `start_at=2026-04-20T06:00:00`, `conclude_at=2026-07-20T05:59:59` (UTC). Revisar: el syllabus marca inicio 23-abr y fin 10-jun. Validar si `start_at` institucional es por trimestre (no por fecha de primera clase).

**Assignment Groups actuales:** "Tareas Individuales" (50%) y "Tareas en Equipo" (50%) — **no corresponden al esquema aprobado**. Rediseñar en 5 grupos.

---

## 2. Lo que se conserva tal cual

Estas páginas están correctas o son institucionales y **no requieren edición**:

- `wiki_content/primeros-pasos.html` — onboarding institucional.
- `wiki_content/ayuda.html` — recursos de ayuda institucional.
- `wiki_content/principios-y-valores-del-compromiso-de-aprendizaje...html`, `terminos-y-condiciones-sobre-el-uso-del-sitio.html`, `creditos.html`, `integridad-academica-2.html` — páginas marco institucionales.
- Módulo 3 "Actividades Iniciales" y sus 4 ítems (*Tu perfil en Canvas*, *Firma de Principios y Valores*, *Navegación del curso*, *Foro de presentación*).
- Módulo 12 "Formatos EGADE" (plantillas, queda oculto).
- **Perfiles docentes** en `bienvenida-y-equipo-docente.html` (Marcos Chávez Chávez y Eduardo H. Ramírez Rangel) — ya están actualizados con biografías, asesorías y contactos correctos.

---

## 3. Módulo "Programa de estudios" — páginas a llenar

### 3.1 `bienvenida-y-equipo-docente.html` — *Bienvenida y Equipo Docente*

- **Conservar:** perfiles de Marcos y Eduardo (ya actualizados).
- **Actualizar la ficha técnica:** validar clave (`T4035` en el HTML vs `MT4035` en el repo — **corregir a MT4035**), período académico (ya dice *Abril – Junio 2026* ✓), horas de estudio, modalidad (definir Presencial / Híbrida / Remota).
- **Llenar bloque "Competencias a desarrollar":** reemplazar `[ Colocar la información correspondiente a los elementos distintivos del curso. ]` con el contenido de `syllabus.md` §III:
  - Competencia institucional: *Data Business Strategy*.
  - Competencias transversales: *Pensamiento crítico 3*, *Innovación 2*.

### 3.2 `syllabus.html` — *Syllabus*

Hoy solo tiene un placeholder ("Dar de alta aquí el Syllabus"). Reemplazar con el contenido de `mt4035/syllabus.md`, concretamente:

- §III: Objetivo general + competencias + **tabla consolidada de sesiones** (# / fecha / profesor / tema / objetivo específico / business question).
- §IV: Metodología del curso (actividades conducidas por el profesor / independientes del estudiante).
- §VII: Calendario del curso (incluye quizzes y entregables por sesión).
- §VIII: Compromisos del estudiante.

No duplicar evaluación ni bibliografía — esas viven en páginas propias.

### 3.3 `politicas.html` — *Políticas*

La plantilla trae 11 políticas institucionales (A1–A11) y un placeholder "B. Políticas propias del curso" (A12) vacío. **Llenar A12** con las políticas de `mt4035/syllabus.md` §X, refraseadas como políticas del curso:

- Reportes de casos y actividades de clase (18%, equipo).
- Quizzes en línea (12%, individual, en Canvas, sin reposición fuera de plazo).
- Tareas (10%, equipo).
- Examen final presencial (20%, individual, sesión 8).
- Proyecto final (40%, equipo, con coevaluación).
- Uso declarado de IA generativa.

### 3.4 `evaluacion.html` — *Evaluación*

La plantilla tiene una tabla con dos bloques (*Actividades individuales* / *Actividades colaborativas*) y placeholders `[ Nombre de la actividad ]`. **Reemplazar la tabla** con los 5 componentes aprobados:

**Actividades individuales (32%)**
- Quizzes en línea (6) — 12%
- Examen final presencial — 20%

**Actividades colaborativas (68%)**
- Reportes de casos y actividades de clase (6) — 18%
- Tareas (2) — 10%
- Proyecto final — 40%

**Total: 100%.**

Al pie: criterios generales de evaluación (redondeo, plazo de revisión — ya están en el template) y enlace a la rúbrica de la práctica de trabajo de campo.

### 3.5 `bibliografia.html` — *Bibliografía*

Hoy tiene placeholders `[ El equipo docente anota aquí la referencia ... ]`. **Llenar** con el contenido de `syllabus.md` §VI + las referencias confirmadas en `CLAUDE.md`:

- **Bibliografía obligatoria:**
  - Berman, B., Evans, J. R., & Chatterjee, P. M. (2021). *Retail management: A strategic approach* (13th ed.). Pearson.
  - Downey, A. B. (2025). *Think stats* (3rd ed.). O'Reilly.
  - Okunev, R. (2022). *Analytics for retail*. Apress.

- **Bibliografía opcional / complementaria:**
  - Chaubard, F. (2023). *AI for retail*. Wiley.
  - Prajapat, R. (2024). *AI-powered ecommerce*. Apress.
  - Agrawal, N., & Smith, S. A. (Eds.). (2015). *Retail supply chain management* (2nd ed.). Springer.
  - Fernie, J., & Sparks, L. (Eds.). (2018). *Logistics and retail management* (5th ed.). Kogan Page.
  - Iansiti, M., & Lakhani, K. R. (2020). *Competing in the age of AI*. HBRP.

Llenar licencia/accesibilidad según disponibilidad en Biblioteca Digital Tec.

---

## 4. Módulos "Sesión 1" a "Sesión 7" — patrón de contenido a crear

### 4.1 Renombrado de módulos

| # módulo | Título actual | Título nuevo | Estado destino |
|---|---|---|---|
| 4 | Sesión 1 — [Nombre] \<fecha\> | **Sesión 1 — Fundamentos analíticos para retail y e-commerce \| 23-abr-2026** | active |
| 5 | Sesión 2 — [Nombre] \<fecha\> | **Sesión 2 — Segmentación y perfilado de clientes \| 29-abr-2026** | active |
| 6 | Sesión 3 — [Nombre] \<fecha\> | **Sesión 3 — Analítica de ventas e inventario \| 6-may-2026** | active |
| 7 | Sesión 4 — [Nombre] \<fecha\> | **Sesión 4 — SCM, inventario y diseño de red \| 13-may-2026** | active |
| 8 | Sesión 5 — [Nombre] \<fecha\> | **Sesión 5 — Transporte y logística omnicanal \| 21-may-2026** | active |
| 9 | Sesión 6 — [Nombre] \<fecha\> | **Sesión 6 — Precios, promociones y fraude \| 27-may-2026** | active |
| 10 | Sesión 7 — [Nombre] \<fecha\> | **Sesión 7 — Tecnologías emergentes \| 3-jun-2026** | active |
| 11 | Sesión 8 — [Nombre] \<fecha\> | **Sesión 8 — Presentaciones finales + examen \| 10-jun-2026** | active |

### 4.2 Plantilla de ítems por sesión (aplica a Sesiones 1–7)

Cada módulo de sesión debe contener:

| Posición | content_type | Título sugerido | Fuente en el repo |
|---|---|---|---|
| 1 | **WikiPage** | *N.1 Introducción a la Sesión N* | `sesion-N.md` §Descripción + §Objetivos + §Subtemas (resumen) |
| 2 | ContextModuleSubHeader | *N.2 Lecturas y recursos previos* | — |
| 3 | ExternalUrl / Attachment | Lecturas o videos específicos | `sesion-N.md` §Libro de texto / Lecturas / Complementos (APA) |
| 4 | ContextModuleSubHeader | *N.3 Actividad en clase* | — |
| 5 | **WikiPage** | *N.3 Actividad en clase: \<título breve\>* | `sesion-N.md` §Actividad en clase |
| 6 | ContextModuleSubHeader | *N.4 Entregable de la sesión* | — |
| 7 | **Assignment** | *N.4 Reporte de caso — Sesión N* | `sesion-N.md` §Tarea / entregable (alimenta el componente *Reportes de casos*, 18%) |
| 8 | **Quiz** (solo sesiones 2–7) | *N.5 Quiz de la Sesión N–1* | Contenido evaluado: sesión anterior; 6 quizzes en total |

**Nota:** para la sesión 1 no hay quiz al inicio (es la primera sesión). El primer quiz aplicado es el de la sesión 2 (cubre contenido de sesión 1).

### 4.3 Asignaciones ↔ componentes de evaluación

- **Reportes de casos y actividades de clase (18%, 6 reportes):** uno por cada sesión 1–6 (o 2–7 — decisión pendiente; ver §6 Decisiones abiertas).
- **Quizzes en línea (12%, 6 quizzes):** uno al inicio de sesiones 2–7.
- **Tareas (10%, 2 tareas):** 2 Assignments independientes (no 1 por sesión). Ubicación tentativa: tras sesión 3 y tras sesión 6. **Decisión pendiente.**
- **Examen final presencial (20%):** Assignment en Sesión 8 (entrega de constancia o Quiz de Canvas si se decide aplicar en plataforma).
- **Proyecto final (40%):** 3 Assignments en Sesión 8: entrega de reporte, presentación, coevaluación.

---

## 5. Módulo "Sesión 8" — estructura distinta

- **WikiPage:** *8.1 Cierre del curso* — orden de presentaciones, instrucciones del examen, checklist del proyecto final.
- **Assignment:** *8.2 Entrega del reporte final del proyecto* — equipo (rúbrica de `rubrica-practica-trabajo-de-campo.md`).
- **Assignment:** *8.3 Presentación final del proyecto* — equipo.
- **Assignment:** *8.4 Coevaluación entre pares* — individual pero alimenta el 10% del componente de proyecto.
- **Assignment / Quiz:** *8.5 Examen final presencial* — ver `examen-final.md` §II para secciones A–F (pesos internos 15/20/20/15/20/10).

---

## 6. Cambios estructurales del export

### 6.1 Assignment Groups — rediseñar

Reemplazar los 2 grupos actuales (*Tareas Individuales* 50%, *Tareas en Equipo* 50%) por los 5 componentes aprobados:

| Grupo | Modalidad | Ponderación |
|---|---|---|
| Reportes de casos y actividades de clase | Equipo | 18% |
| Quizzes en línea | Individual | 12% |
| Tareas | Equipo | 10% |
| Examen final presencial | Individual | 20% |
| Proyecto final | Equipo | 40% |

### 6.2 Página de inicio del curso

Validar que `default_view=wiki` apunte a una *"Página de inicio"* amigable. El export trae `pagina-de-inicio.html` (157 líneas) — revisar que enlace correctamente a Bienvenida / Syllabus / Sesiones.

### 6.3 Fechas de assignments

Todas las fechas en `assignment_settings.xml` se codifican en **UTC**. Zona horaria del curso: **CDMX = UTC−6 (CST)**. Para un entregable que vence 23:59 hora local, `<due_at>` debe ser `T05:59:00` del día siguiente en UTC. Consolidar un mapa de fechas de entrega antes de generar el archivo modificado.

---

## 7. Decisiones abiertas (bloquean la implementación)

- [ ] **Ventana de los 6 reportes de caso:** ¿sesiones 1–6 o 2–7? Alinear con el calendario efectivo de entregables.
- [ ] **Fechas y contenido de las 2 tareas:** ¿qué cubren? Propuesta inicial: Tarea 1 tras sesión 3 (diagnóstico as-is del retailer del proyecto); Tarea 2 tras sesión 6 (propuesta to-be + medición).
- [ ] **Formato del examen final en Canvas:** ¿Assignment de "entrega de constancia" o Quiz de Canvas con las 6 secciones A–F de `examen-final.md`?
- [ ] **Modalidad del curso:** *Presencial / Híbrida / Remota* (impacta la ficha técnica en Bienvenida).
- [ ] **Clave del curso en la ficha técnica:** corregir `T4035` → `MT4035` en `bienvenida-y-equipo-docente.html`.
- [ ] **Fecha de inicio institucional (`course_settings.start_at`):** validar 2026-04-20 vs. 2026-04-23 (primera sesión).
- [ ] **Lecturas por sesión como ExternalUrl o Attachment:** definir qué capítulos se suben como archivo y cuáles se enlazan.

---

## 8. Orden recomendado de ejecución

1. **Cerrar las decisiones abiertas** (§7).
2. **Actualizar las 5 páginas del módulo "Programa de estudios"** (§3) — impacto inmediato y bajo riesgo.
3. **Rediseñar los Assignment Groups** (§6.1) — requisito previo para que los assignments nuevos hereden las ponderaciones.
4. **Renombrar los 8 módulos de sesión** (§4.1).
5. **Poblar Sesión 1** como caso piloto (revisar el patrón de §4.2 con la sesión ya escrita en el repo).
6. **Clonar el patrón a Sesiones 2–7** (ajustando títulos, bibliografía, fechas de entrega).
7. **Poblar Sesión 8** (§5).
8. **Diseñar los 6 quizzes** (preguntas; se alimentan del contenido de sesiones 1–6).
9. **Regenerar el `.imscc` y validar estructura ZIP** (ver `references/reconstruction.md` de la skill `imscc`: identificadores `g` + MD5-hex, orden de archivos, `imsmanifest.xml` como primera entrada).
10. **Importar de prueba en un sandbox de Canvas** antes de subir al curso productivo.

---

## 9. Pasos manuales requeridos post-importación a Canvas

La skill IMSCC advierte que algunos ajustes **no se pueden codificar** en el cartridge y deben hacerse manualmente en Canvas después de importar:

- Adjuntar rúbricas a los assignments correspondientes (la rúbrica viaja como recurso pero el binding `assignment ↔ rubric` con la casilla *Remove points* se configura en la UI).
- Publicar (`workflow_state=active`) los módulos que queden en `unpublished`.
- Validar zonas horarias de las fechas de entrega directamente en el calendario de Canvas.
- Configurar el banco de preguntas / shuffle / time limit de los quizzes.

---

[← Volver al README del curso](../README.md)
