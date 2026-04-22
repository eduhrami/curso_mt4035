# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project Overview

Multi-course curriculum documentation repository for university courses taught by Eduardo and Marcos at EGADE. All content is in Spanish. There is no source code, build system, or test suite — this is a pure markdown documentation project.

Currently hosts two courses:
- **MT4035** — *Aplicaciones de la analítica de datos: comercio minorista, e-commerce y cadena de suministro.* 2026 edition (23-abr – 10-jun), taught by Eduardo and Marcos. Content is mature.
- **MT4034** — *Aplicaciones, gestión y gobernanza de la inteligencia artificial.* 2026 edition (24-abr – 14-may), taught by Marcos (S1, S2, S4, S5, S6, S7) and Eduardo (S3, S8). Calendar, session ownership and per-session content are official; evaluation weights, rubrics, practice spec, exam spec and administrative details (trimestre, modalidad, room) are pending.

Both courses are **independent in content** (syllabus, bibliography, instructors) but **share the same formal structure**: 8 sessions, 10-section EGADE syllabus, session template, evaluation artifacts, and editorial conventions. When extending the repository to a new course, clone the structure, not the content.

## Repository structure

Top-level:
- `README.md` — Level-1 index linking to each course's level-2 README. Does not duplicate course content.
- `CLAUDE.md` — This file.
- `mt4035/` — All MT4035 course materials.
- `mt4034/` — All MT4034 course materials.

Inside each course directory (`mt4035/`, `mt4034/`, ...):

**Master documents:**
- `syllabus.md` — **Authoritative course syllabus** in the 10-section EGADE institutional template. Single source of truth for objectives, competencies, methodology, evaluation, calendar, bibliography, and policies. Sections still in construction are flagged with ⚠.
- `plan-syllabus.md` — Living work plan for building the syllabus. Checkbox-tracked by phase (A/B/C/D). Update it whenever items move state.
- `README.md` — Lightweight navigation index (level-2) pointing to the syllabus and the per-session files. Does **not** duplicate content that lives in the syllabus. Links back to the top-level index via `../README.md`.

**Session content:**
- `sesion-1.md` through `sesion-8.md` — One file per class session, each following a consistent template (see "Session file structure" below).

**Evaluation artifacts** (per course, when applicable):
- `practica-trabajo-de-campo.md` — Field-work practice specification.
- `rubrica-practica-trabajo-de-campo.md` — Rubric for the field-work practice.
- `examen-final.md` — Specification of the in-person final exam.

**Reference (per course):**
- `curso_anterior/` — Reference-only archive of the previous edition. Each course has its own.

## Document hierarchy and single source of truth

These rules apply **to both courses** equally:

1. **`syllabus.md` is authoritative** for objectives, competencies, methodology, evaluation weights, calendar, bibliography, and policies. If another file contradicts it, the syllabus wins.
2. **`README.md` is a navigation index**, not a content store. It points to the syllabus and to the per-session files. Do NOT put ponderaciones, metodología, bibliografía lists, or final-project descriptions in `README.md` — reference the syllabus instead. This is a deliberate choice to prevent drift.
3. **`sesion-N.md` files hold per-session detail** (structure, subtopics, activities, deliverables, session-specific bibliography). They link back to the README index.
4. **`practica-trabajo-de-campo.md`, `rubrica-*.md`, `examen-final.md`** hold the long-form spec of evaluation artifacts. The syllabus references them; they should not re-state the syllabus framing.
5. **`plan-syllabus.md` is a living document.** When an item listed there is completed, tick it off. When a new item arises, add it under the right phase.

When you learn something new or make a decision during a conversation, decide *where it belongs* using this hierarchy — don't copy it to multiple places. If a decision applies to only one course, place it in that course's directory, not in this top-level file.

## Session file structure (shared across courses)

Every session file follows this template:
1. **Descripción** — Session summary, business question, and instructor assignment.
2. **Objetivos** — Learning objectives.
3. **Estructura en clase** — Suggested in-class time breakdown. For **sessions 2 through 7**, this section begins with a **"Quiz inicial en línea (~15 min)"** block that references the content of the immediately preceding session — preserve this block when editing.
4. **Subtemas** — Detailed subtopic list with explicit non-overlap notes referencing other sessions.
5. **Actividad en clase** — In-class workshop with a short team deliverable. Every session from 1 to 7 has one (session 8 is presentations + final exam, so it has none). In MT4035, activities are case-based by default and no pre-class prep section is used. In MT4034, the convention may evolve — follow whatever the session file already specifies.
6. **Tarea / entregable** — Team deliverable tied to the final project (out-of-class homework, distinct from the in-class activity).
7. **Libro de texto / Lecturas / Complementos** — APA references and supporting materials.

Session 1 has no quiz (it is the first session). Session 8 has no quiz and no in-class activity section; it is presentations + in-person final exam. The final exam is specified in `examen-final.md`.

## Evaluation structure (shared fixed decisions)

These structural decisions apply to **both courses** — do not change them without explicit user instruction:

- **6 online quizzes** in Canvas, applied at the start of sessions 2–7. Each quiz evaluates the content of the immediately preceding session. In MT4034, S6 and S7 run as a double session on the same day (9-may-2026): Quiz 5 opens block 1 (S6) and Quiz 6 opens block 2 (S7) on that same day.
- **Session 8 has no quiz.** The content of session 7 is evaluated through the in-person final exam instead.
- **In-person final exam** in session 8, with explicit emphasis on session 7 content.
- **Field-work practice** as the activity that materializes the evaluation of the corresponding institutional competency.

The **weighting of each component** is a draft in each course's `syllabus.md` section V and is not final yet for either course.

---

# MT4035 — Course-specific guidance

## Instructors and session ownership (MT4035)

- **Eduardo:** Sessions 4 (SCM / network design), 5 (logistics), 7 (emerging tech). Co-hosts sessions 1 and 8 with Marcos.
- **Marcos:** Sessions 2 (segmentation / CLV), 3 (sales / inventory), 6 (pricing / fraud). Co-hosts sessions 1 and 8 with Eduardo.
- **Session 1** (methodological foundations) is co-taught by both; topic distribution pending.
- **Session 3** stays on 6-May with Marcos. The proposed swap to 5-May with Eduardo was dropped because Eduardo confirmed unavailability May 6–9 (travel).

## Course progression (MT4035)

**Phase 1 — Methodological foundations and customer analytics (Sessions 1–3):** Statistical toolbox (distributions, sampling, hypothesis testing, correlation vs. causation, regression, time series, survival), KPI taxonomy, customer segmentation (RFM/CLV), demand forecasting, A/B testing.

**Phase 2 — Supply chain and operations (Sessions 4–5):** Network design, inventory models (EOQ/ROP), fulfillment, last-mile logistics.

**Phase 3 — Commercial and emerging tech (Sessions 6–7):** Pricing, promotions, fraud detection, IoT, AI/ML, automation, blockchain.

**Capstone (Session 8):** Team presentations + individual in-person final exam.

Session 1 is deliberately methodological. It establishes the conceptual toolbox that the rest of the course applies to specific operational domains. When editing session 1, keep the framing at the level of intuition and conceptual understanding, not formal derivations.

## In-class activity convention (MT4035)

**Do NOT use a "Preparación del estudiante" / pre-class prep section** — the MT4035 convention is that nothing is prepared before class; any case or reading happens during class time. Activities are case-based by default (either a case already referenced in the session's bibliography, or a mini-case presented by the professor).

## Previous course version — MT4035 (`mt4035/curso_anterior/`)

Contains the official syllabus PDF from a prior instance taught by **Mtro. Alejandro Antonio Mendoza Zamora** during trimestre S24 (Sept–Nov 2025). Reference material only.

**When to consult it:**
- To verify coherence with the institutional *Objetivo General* and the *Data Business Strategy* perfil de egreso plus *Pensamiento crítico 3 / Innovación 2* competencias transversales.
- To understand how topics were previously bundled (7 sessions / 10 modules).
- As inspiration for the field-work component, keeping in mind the current edition uses a different rubric and specification.

**Confirmed coherent with the previous edition:**
- Course code and general objective.
- Institutional competencies: Data Business Strategy, Pensamiento crítico 3, Innovación 2.

**Actively redesigned — do NOT carry forward from `mt4035/curso_anterior/`:**
- **Evaluation weights.** The previous 15/10/20/15/40 split is under revision.
- **Textbooks and readings.** Previous bibliography (Berman 12th ed., Zentes) has been replaced.
- **Final project specification and rubric.** New spec in `practica-trabajo-de-campo.md`.
- **Session structure.** Moved from 7 sessions / 10 modules to 8 sessions.

## References (MT4035)

Key references confirmed and in use:

- Berman, B., Evans, J. R., & Chatterjee, P. M. (2021). *Retail management: A strategic approach* (13th ed.). Pearson. — main retail textbook.
- Downey, A. B. (2025). *Think stats: Exploratory data analysis in Python* (3rd ed.). O'Reilly Media. — methodological reference for session 1.
- Okunev, R. (2022). *Analytics for retail: A step-by-step guide to the statistics behind a successful retail business*. Apress. — statistical techniques applied to retail.
- Chaubard, F. (2023). *AI for retail: A practical guide to modernize your retail business with AI and automation*. Wiley. — AI applications across retail operations.
- Prajapat, R. (2024). *AI-powered ecommerce: How machine learning is transforming online shopping*. Apress. — ML in e-commerce.
- Agrawal, N., & Smith, S. A. (Eds.). (2015). *Retail supply chain management* (2nd ed.). Springer.
- Fernie, J., & Sparks, L. (Eds.). (2018). *Logistics and retail management* (5th ed.). Kogan Page.
- Iansiti, M., & Lakhani, K. R. (2020). *Competing in the age of AI*. Harvard Business Review Press.

---

# MT4034 — Course-specific guidance

## Instructors and session ownership (MT4034)

- **Marcos:** Sessions 1 (AI fundamentals + course framing), 2 (data governance + emerging tech), 4 (responsible AI practices), 5 (commercial AI and marketing), 6 (business cases) and 7 (AI project management). Sessions 6 and 7 run back-to-back on 9-may as a **double session**.
- **Eduardo:** Sessions 3 (generative AI + AI ethics) and 8 (final presentations + exam).
- Sessions are single-instructor (no co-teaching in this edition).

## Calendar (MT4034 — 2026 edition)

- Start date: **24-abr-2026** (Friday). End date: **14-may-2026** (Thursday). Roughly 3 weeks.
- Sessions run on mixed weekdays (Thursdays, Fridays, Saturdays) — no fixed day.
- **Double session 9-may:** Session 6 (Business Cases) in block 1 and Session 7 (AI Project Management) in block 2 of the same Saturday. Quiz 6 is applied between the two blocks.

## Course progression (MT4034)

**Phase 1 — Foundations (Sessions 1–2):** AI/ML/DL fundamentals + course framing (S1); data governance (quality, privacy, security, ethics) + emerging technologies in depth (IoT, blockchain, digital twins) (S2). S1 gives a brief panorama of emerging tech; S2 deepens it.

**Phase 2 — Generative AI, ethics, responsible practices (Sessions 3–4):** Generative AI (LLMs, diffusion, multimodal) with AI ethics (bias, fairness, transparency, explainability) as a combined block (S3); synthesis into responsible AI practices aligned with regulatory frameworks — EU AI Act, NIST AI RMF, ISO/IEC 42001, OECD, UNESCO (S4).

**Phase 3 — Commercial applications and integration (Sessions 5–6):** Commercial AI and marketing — segmentation, recommendation, pricing, personalization, automation (S5); business cases as integrative synthesis across all prior content (S6).

**Phase 4 — Project management and close (Sessions 7–8):** AI project management — scoping, stakeholders, roadmap, data management, executive communication (S7); team presentations + in-person individual final exam (S8).

The content of **S7 is the only block not covered by any quiz** and therefore is the one emphasized in the final exam (analogous to how MT4035 handles its session 7).

## Previous course version — MT4034 (`mt4034/curso_anterior/`)

Contains two documents from the prior edition: the institutional plan de estudios and a cleaned-up version of the syllabus. Reference material only.

**Confirmed coherent with the previous edition:**
- Course code (MT4034), CIP (520201), program (3MBD24), department (Mercadotecnia e Inteligencia de Negocios, EGADE).
- General objective of the Unidad de Formación (7 bullets).
- 6-theme content structure (now mapped to 8 sessions).
- Business question central and business questions per session.

**Actively being redesigned — do NOT carry forward from `mt4034/curso_anterior/`:**
- **Evaluation weights.** The previous 40/10/20/20/10 scheme is under revision; new edition homologates to MT4035 structure (quizzes + exam + project).
- **Textbooks and readings.** Rose (2021) remains as base text; Finlay and Russell & Norvig as suggested. Bibliography has been expanded with regulatory frameworks (EU AI Act, NIST AI RMF, ISO/IEC 42001, OECD, UNESCO) and reference books on data governance, fairness, and AI strategy.
- **Session structure.** Previous edition had sessions 7–8 both for presentations; new edition uses session 7 for "Gestión de proyectos de IA" and session 8 for presentations + exam.
- **Session sequence.** 2026 edition reorders topics — the sequence is: Fundamentals → Data governance + Emerging tech → Generative AI + Ethics → Responsible AI practices → Commercial AI → Business cases → AI project management → Presentations + exam. S6 and S7 are delivered as a double session on 9-may.
- **Competencias institucionales.** Pending confirmation with academic coordination.

**Important:** Do NOT copy content verbatim from `curso_anterior/` for either course. Treat it as institutional anchor and inspiration, not as a template to clone.

## References (MT4034)

Base text confirmed:

- Rose, D. (2021). *Artificial intelligence for business: What you need to know about machine learning and neural networks* (2nd ed.). Pearson.

Suggested (under review):

- Finlay, S. (2021). *Artificial intelligence and machine learning for business: A no-nonsense guide to data-driven technologies* (4th ed.). Relativistic.
- Russell, S. J., & Norvig, P. (2021). *Artificial intelligence: A modern approach* (4th ed.). Pearson.

---

# Key editorial conventions (both courses)

- Each session file explicitly states which topics it does **not** cover to avoid overlap with adjacent sessions. Preserve these non-overlap notes when editing.
- Deliverables in each session connect directly to the team's final project. Preserve this continuity when modifying content.
- **Drafts are marked explicitly.** When a section is not final, mark it with ⚠ and a "borrador preliminar" note. This applies especially to evaluation weights, rubrics, and the final exam specification.
- **No `Co-Authored-By` lines in commits.** This is a user preference already tracked in auto-memory.

## References policy (both courses)

All readings and citations must be verified and sourced from top authoritative references — peer-reviewed academic journals, leading textbooks in the field, or reputable industry sources (e.g., MIT, Harvard, McKinsey, Gartner, OECD, NIST, EU). Do not suggest or include references that cannot be confirmed to exist. For MT4034, regulatory and institutional frameworks (EU AI Act, NIST AI RMF, ISO/IEC 42001, OECD AI Principles) are particularly relevant.
