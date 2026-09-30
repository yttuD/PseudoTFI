# Rendo Constitution

## Core Principles

### I. Evidence Before Claims (NON-NEGOTIABLE)
No feature, route, form, rule, test, or integration is considered complete because a document
says so. Every status claim MUST be supported by current source inspection and fresh executable
evidence appropriate to the claim. Historical documents are evidence of intent only. When code,
tests, screenshots, migrations, and documents disagree, the discrepancy MUST be recorded and the
current executable behavior wins until the governing specification is deliberately amended.

An audit MUST distinguish at least: implemented and verified, implemented but unverified,
partially implemented, placeholder or mock, specified only, blocked by configuration, and absent.
Negative or exhaustive claims require a bounded inventory of the searched routes, modules, forms,
and data surfaces.

### II. Canonical Domain and Architecture
All implementation and product language MUST use the canonical terms Unidad, Grupo, Gestor,
Delegado, Inquilino, Cupo, Modalidad de precio, Alquiler, Pago, Depósito, Plan de pago, Zona,
Log de acciones, and borrado lógico. User-facing colloquial copy MAY use familiar wording only
when the underlying domain model remains unambiguous.

ADRs 0001 through 0009 and the explicit business invariants in `CONTEXT.md` and
`ARQUITECTURA-Y-PRODUCTO.md` are closed decisions. Changes to those decisions require an amended
ADR and explicit approval from Carlos before implementation. Multi-tenant isolation, RLS,
soft-deletion, authorization by actor and scope, and the four automatic Unidad state transitions
are mandatory review points for every affected change.

Modules MUST expose small, explicit interfaces at stable seams. Tests and callers MUST exercise
the same interface. New seams require at least two real adapters or a documented near-term need;
pass-through abstractions are not accepted.

### III. Bounded Spec-Driven Work
Every implementation batch MUST belong to one bounded Spec Kit feature with a validated `spec.md`,
an implementation-aware `plan.md`, dependency-ordered `tasks.md`, and explicit acceptance
evidence. Existing behavior is not retroactively declared correct: brownfield discovery produces
an inventory and gaps, while remediation is split into reviewable feature slices.

Requirements MUST state observable outcomes and edge cases without prescribing implementation.
Plans MUST name the affected routes, modules, interfaces, data migrations, authorization rules,
and regression surface. Tasks MUST identify concrete file paths and completion evidence. Unknowns
that alter scope, security, money, legal obligations, or UX MUST be resolved before coding.

### IV. Supervised Delegation Contract
Codex owns architecture, specification quality, acceptance criteria, risk classification, review,
and final validation. Antigravity performs the heavy implementation, test creation, execution, and
verification work in discrete batches using `gemini-3.8-flash-medium` with medium effort unless
Carlos explicitly changes the model.

Each Antigravity dispatch MUST include the governing spec paths, exact scope, protected
invariants, allowed files, required commands, required visual evidence, and a structured delivery
format. Antigravity MUST work independently until the batch reaches a terminal result; Codex
reviews the final delivery rather than continuously shadowing intermediate work. Rejected batches
receive a new, precise correction brief. An Antigravity statement without reproducible evidence is
not acceptance evidence.

### V. Verification and Visual Proof
Every changed batch MUST pass the checks that apply to its risk: type validation, lint, unit tests,
integration tests, production builds, database verification, API behavior checks, and regression
tests. Tests MUST cover happy, boundary, and failure behavior. Skipped, flaky, environment-blocked,
or pre-existing failures MUST be reported separately and may not be relabeled as passing.

All visual or interaction work MUST be verified with Playwright. The delivery MUST include
screenshots for every affected view and for the relevant 375, 768, 1024, and 1440 pixel widths,
covering both light and dark themes where supported, plus authenticated and unauthenticated states
when behavior differs. Screenshots MUST be tied to named test cases and stored in the feature's
evidence directory. Codex MUST inspect the screenshots before accepting the batch. One batched
inspection pass and one bounded confirmation pass are the default ceiling.

Every route, form, dialog, destructive action, loading state, empty state, validation state,
permission state, and responsive presentation in scope MUST appear in the inventory and have a
functional and UI/UX disposition.

### VI. Audience and Platform Separation (NON-NEGOTIABLE)
Rendo MUST preserve three explicit trust surfaces: the public marketplace, the authenticated
operational workspace, and the restricted dev/admin console. Public routes MUST NOT expose private
operational, financial, exact-location, tenant, or audit data. The operational workspace MUST
separate Gestor-owner permissions from Delegado permissions and enforce scope and action level at
the UI, API, and RLS layers. The dev/admin console MUST require an explicit privileged role; being
authenticated as a Gestor or Delegado is not sufficient.

Every route, form, endpoint, policy, and test MUST declare its audience and actor. Authorization
evidence MUST exercise anonymous, authenticated public-user, Gestor, Delegado, and dev/admin states
where applicable; one authenticated fixture may not stand in for all actors.

Desktop web, responsive web at mobile viewport sizes, the current Capacitor Android wrapper, and a
future native Android application are distinct validation targets. Playwright evidence for desktop
and responsive web MUST be reported separately. A mobile viewport or web wrapper MUST NOT be
presented as proof of native Android quality. Native Android implementation and acceptance begin
only in a dedicated future Spec Kit feature after Carlos explicitly authorizes the phase and makes
a physical Android device available through wireless debugging. That phase MUST include install,
device interaction, permissions, keyboard, lifecycle, deep-link, offline, performance, and security
evidence from the real device.

### VII. Safe Workspace Stewardship
The repository may contain uncommitted user work. Agents MUST inspect and preserve unrelated
changes, avoid destructive Git operations, and never overwrite uncertain files to create a clean
baseline. Generated artifacts MUST be scoped to the active feature and named so their ownership is
obvious.

At the end of each batch, agents MUST remove only temporary files, browser traces, downloads,
servers, caches, screenshots, and scratch artifacts created by that batch unless they are retained
as required evidence. Cleanup MUST use exact verified paths inside the workspace or a task-specific
temporary directory. Broad deletion of the repository, user profile, Downloads folder, or computer
is forbidden.

## Product and Design Constraints

- Product name: **Rendo**.
- Product surfaces: public marketplace; authenticated operational workspace for Gestores and their
  Delegados; restricted dev/admin console; responsive web; and a current Capacitor Android wrapper
  that is assessed as readiness only until the dedicated native-mobile phase.
- Closed stack: Next.js App Router, NestJS, Supabase Auth/Postgres/Storage with RLS, Mercado Pago,
  AFIP integration, OpenStreetMap/Leaflet/Nominatim, next-intl, and Capacitor.
- Brand source of truth: the supplied Rendo palette, not the example home layout.
- Core brand colors: night blue `#131F3C`, gold `#B89355`, light gold `#D2AD68`, warm white
  `#F5F3EE`, blue gray `#B8BFCC`, medium dark blue `#1C2B4D`, and deep blue `#0D172E`.
- Light theme tokens: ivory `#F7F5F0`, surface `#FFFFFF`, text `#131F3C`, accent `#B89355`,
  accent hover `#9F783E`, secondary text `#667085`, border `#D9D5CC`, and secondary background
  `#EEEAE1`.
- Dark theme tokens: principal `#0B1428`, background `#131F3C`, surface `#182747`, accent
  `#B89355`, highlight `#D2AD68`, primary text `#F5F3EE`, secondary text `#AEB7C7`, border
  `#293956`, and accent hover `#C9A35F`.
- The palette governs tokens and contrast; the supplied image's page composition is not a layout
  requirement.
- Interfaces MUST meet WCAG 2.1 AA, provide visible keyboard focus, 44 by 44 pixel touch targets,
  semantic labels, reduced-motion behavior, inline form errors, explicit loading/empty/error
  states, and localized ES/PT/EN system copy except the Spanish-only dev dashboard.

## Delivery Workflow and Quality Gates

1. **Inventory**: enumerate affected routes, views, forms, dialogs, endpoints, domain rules,
   migrations, and existing tests from source. Record confidence and evidence paths.
2. **Specify**: validate the bounded feature specification and requirement checklist.
3. **Plan**: document interfaces, data and permission impacts, failure modes, rollout, and tests.
4. **Task**: create dependency-ordered tasks with file paths and evidence requirements.
5. **Delegate**: dispatch one self-contained Antigravity batch with the pinned model and effort.
6. **Review**: inspect its diff, command outputs, Playwright report, and screenshots; verify every
   claimed acceptance criterion.
7. **Correct**: reject with a precise defect list or accept. Re-dispatch only the bounded defects.
8. **Converge**: compare implementation against spec and append any discovered work before closure.
9. **Record and clean**: update the feature evidence and `ESTADO-REAL.md`, then remove only
   task-owned temporary artifacts.

A batch is accepted only when all required checks are current, reproducible, and green, or when a
documented external blocker is explicitly accepted by Carlos. Credentials, production mutations,
store publication, billing changes, and irreversible data operations always require separate
authorization.

## Governance

This constitution is the highest-priority project governance document. Feature specifications,
plans, task lists, agent rules, and historical documents MUST align with it. A more specific rule
may add constraints but may not weaken a constitutional requirement.

Amendments require a written rationale, affected-artifact review, explicit approval from Carlos,
and a semantic version change: MAJOR for removed or incompatible principles, MINOR for new or
materially expanded governance, and PATCH for clarifications. Every plan and final review MUST
include a constitution compliance check. Violations require correction or an explicitly approved,
time-bounded exception recorded in the active feature.

**Version**: 1.1.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-25
