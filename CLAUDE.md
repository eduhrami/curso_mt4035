# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project Overview

Curriculum documentation repository for **MT4035** — a university course on data analytics applied to retail, e-commerce, logistics and supply chain management. All content is in Spanish. There is no source code, build system, or test suite — this is a pure markdown documentation project.

The current edition is taught by Eduardo and Marcos. Session 1 opens on 23-abr-2026; session 8 closes with presentations and the in-person final exam on 10-jun-2026.

## Repository structure

**Master documents:**
- `syllabus.md` — **Authoritative course syllabus** in the 10-section EGADE institutional template. Single source of truth for objectives, competencies, methodology, evaluation, calendar, bibliography, and policies. Sections still in construction are flagged with ⚠.
- `plan-syllabus.md` — Living work plan for building the syllabus. Checkbox-tracked by phase (A/B/C/D). Update it whenever items move state.
- `README.md` — Lightweight navigation index pointing to the syllabus and the per-session files. Does **not** duplicate content that lives in the syllabus.

**Session content:**
- `sesion-1.md` through `sesion-8.md` — One file per class session, each following a consistent template.

**Evaluation artifacts:**
- `practica-trabajo-de-campo.md` — Field-work practice. This activity evaluates the institutional competency *Toma de decisiones estratégicas*.
- `rubrica-practica-trabajo-de-campo.md` — Preliminary rubric for the field-work practice.
- `examen-final.md` — Preliminary specification of the in-person final exam.

**Reference:**
- `curso_anterior/` — Reference-only archive of the previous edition of MT4035 (see "Previous course version" below).

## Document hierarchy and single source of truth

The project follows a clear hierarchy. When editing, respect these responsibilities:

1. **`syllabus.md` is authoritative** for objectives, competencies, methodology, evaluation weights, calendar, bibliography, and policies. If another file contradicts it, the syllabus wins.
2. **`README.md` is a navigation index**, not a content store. It points to the syllabus and to the per-session files. Do NOT put ponderaciones, metodología, bibliografía lists, or final-project descriptions in `README.md` — reference the syllabus instead. This is a deliberate choice to prevent drift.
3. **`sesion-N.md` files hold per-session detail** (structure, subtopics, preparation, deliverables, session-specific bibliography). They link back to the README index.
4. **`practica-trabajo-de-campo.md`, `rubrica-*.md`, `examen-final.md`** hold the long-form spec of evaluation artifacts. The syllabus references them; they should not re-state the syllabus framing.
5. **`plan-syllabus.md` is a living document.** When an item listed there is completed, tick it off. When a new item arises, add it under the right phase.

When you learn something new or make a decision during a conversation, decide *where it belongs* using this hierarchy — don't copy it to multiple places.

## Session file structure

Every session file follows this template:
1. **Descripción** — Session summary and instructor assignment.
2. **Objetivos** — Learning objectives.
3. **Estructura en clase** — Suggested in-class time breakdown. For **sessions 2 through 7**, this section begins with a **"Quiz inicial en línea (~15 min)"** block that references the content of the immediately preceding session — preserve this block when editing.
4. **Subtemas** — Detailed subtopic list with explicit non-overlap notes referencing other sessions.
5. **Preparación del estudiante** — Student preparation tasks.
6. **Tarea / entregable** — Team deliverable tied to the final project.
7. **Libro de texto / Lecturas / Complementos** — APA references and supporting materials.

Session 1 has no quiz (it is the first session). Session 8 has no quiz; it is presentations + in-person final exam. The final exam is specified in `examen-final.md`.

## Evaluation structure (fixed decisions)

These are confirmed structural decisions — do not change them without explicit user instruction:

- **6 online quizzes** in Canvas, applied at the start of sessions 2–7. Each quiz evaluates the content of the immediately preceding session.
- **Session 8 has no quiz.** The content of session 7 is evaluated through the in-person final exam instead.
- **In-person final exam** in session 8, with explicit emphasis on session 7 content. See `examen-final.md`.
- The **field-work practice** (`practica-trabajo-de-campo.md`) is the activity that materializes the evaluation of the institutional competency *Toma de decisiones estratégicas*.

The **weighting of each component** is a draft in `syllabus.md` section V and is not final yet.

## Instructors and session ownership

- **Eduardo:** Sessions 1 (methodological foundations), 4 (SCM / network design), 5 (logistics), 7 (emerging tech), 8 (co-host).
- **Marcos:** Sessions 2 (segmentation / CLV), 3 (sales / inventory), 6 (pricing / fraud), 8 (co-host).

## Course progression

**Phase 1 — Methodological foundations and customer analytics (Sessions 1–3):** Statistical toolbox (distributions, sampling, hypothesis testing, correlation vs. causation, regression, time series, survival), KPI taxonomy, customer segmentation (RFM/CLV), demand forecasting, A/B testing.

**Phase 2 — Supply chain and operations (Sessions 4–5):** Network design, inventory models (EOQ/ROP), fulfillment, last-mile logistics.

**Phase 3 — Commercial and emerging tech (Sessions 6–7):** Pricing, promotions, fraud detection, IoT, AI/ML, automation, blockchain.

**Capstone (Session 8):** Team presentations + individual in-person final exam.

Session 1 is deliberately methodological. It establishes the conceptual toolbox that the rest of the course applies to specific operational domains. When editing session 1, keep the framing at the level of intuition and conceptual understanding, not formal derivations.

## Previous course version (`curso_anterior/`)

The `curso_anterior/` folder contains the official syllabus PDF from a prior instance of MT4035 taught by **Mtro. Alejandro Antonio Mendoza Zamora** during trimestre S24 (Sept–Nov 2025). It is reference material only.

**When to consult it:**
- To verify the current course stays coherent with the institutional *Objetivo General* and the *Data Business Strategy* perfil de egreso plus *Pensamiento crítico 3 / Innovación 2* competencias transversales.
- To understand how topics were previously bundled (7 sessions / 10 modules).
- As inspiration for the field-work component, keeping in mind the current edition uses a different rubric and specification.

**Confirmed coherent with the previous edition:**
- Course code and general objective.
- Institutional competencies: Data Business Strategy, Pensamiento crítico 3, Innovación 2.

**Actively redesigned for the current edition — do NOT carry forward from `curso_anterior/`:**
- **Evaluation weights.** The previous 15/10/20/15/40 split is under revision. A draft proposal lives in `syllabus.md` section V but is not final.
- **Textbooks and readings.** Previous bibliography (Berman 12th ed., Zentes) is being replaced. The current edition already adopts Berman 13th ed. and adds Downey's *Think Stats* (3rd ed., O'Reilly 2025) among other updates.
- **Final project specification and rubric.** The field-work component is kept but its rubric and detailed spec are new (see `practica-trabajo-de-campo.md` and `rubrica-practica-trabajo-de-campo.md`). The trabajo de análisis half of the project is still pending redesign.
- **Session structure.** Moved from 7 sessions / 10 modules to 8 sessions; added a methodological session 1 that did not exist before.

**Important:** Do NOT copy content verbatim from `curso_anterior/`. Treat it as institutional anchor and inspiration, not as a template to clone.

## Key editorial conventions

- Each session file explicitly states which topics it does **not** cover to avoid overlap with adjacent sessions. Preserve these non-overlap notes when editing.
- Deliverables in each session connect directly to the team's final project. Preserve this continuity when modifying content.
- Session dates run April 23 – June 10, 2026. Exam and presentations are session 8 (10-jun-2026).
- **Drafts are marked explicitly.** When a section is not final, mark it with ⚠ and a "borrador preliminar" note. This applies especially to evaluation weights, rubrics, and the final exam specification.
- **No `Co-Authored-By` lines in commits.** This is a user preference already tracked in auto-memory.

## References

All readings and citations must be verified and sourced from top authoritative references — peer-reviewed academic journals, leading textbooks in the field, or reputable industry sources (e.g., MIT, Harvard, McKinsey, Gartner). Do not suggest or include references that cannot be confirmed to exist.

Key references already confirmed and in use in the current edition:

- Berman, B., Evans, J. R., & Chatterjee, P. M. (2021). *Retail management: A strategic approach* (13th ed.). Pearson. — main retail textbook.
- Downey, A. B. (2025). *Think stats: Exploratory data analysis in Python* (3rd ed.). O'Reilly Media. — methodological reference for session 1 (read for intuition, not implementation).
- Agrawal, N., & Smith, S. A. (Eds.). (2015). *Retail supply chain management* (2nd ed.). Springer.
- Fernie, J., & Sparks, L. (Eds.). (2018). *Logistics and retail management* (5th ed.). Kogan Page.
- Iansiti, M., & Lakhani, K. R. (2020). *Competing in the age of AI*. Harvard Business Review Press.
