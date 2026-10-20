# Tasks: Brownfield System Audit

**Input**: Design documents from specs/001-brownfield-system-audit/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, architecture-boundaries.md, antigravity-correction-brief-02.md

**Tests**: Fresh technical verification and Playwright visual/interaction evidence are mandatory.

**Organization**: Tasks are grouped by user story and produce an auditable evidence package without
repairing product defects.

## Phase 1: Setup (Evidence Infrastructure)

**Purpose**: Establish task-owned paths and protect the dirty working tree.

- [x] T001 Record the pre-audit working-tree snapshot and task-owned path ledger in specs/001-brownfield-system-audit/evidence/reports/cleanup-ledger.md
- [x] T002 [P] Create evidence naming, redaction, and retention rules in specs/001-brownfield-system-audit/evidence/README.md
- [x] T003 [P] Create the active/generated/excluded file classification in specs/001-brownfield-system-audit/evidence/manifests/excluded-artifacts.md

---

## Phase 2: Foundational (Discovery Baseline)

**Purpose**: Establish independent source denominators before any status is assigned.

**CRITICAL**: No verification or findings work begins until discovery counts are reproducible.

- [x] T004 Produce the complete repository source-file denominator and exclusions in specs/001-brownfield-system-audit/evidence/manifests/source-denominator.md
- [x] T005 Define stable audit IDs and status usage examples conforming to contracts/inventory-row.md in specs/001-brownfield-system-audit/evidence/manifests/README.md

**Checkpoint**: Independent discovery counts and status semantics are ready.

---

## Phase 3: User Story 1 - Trustworthy System Inventory (Priority: P1) MVP

**Goal**: Every active source-discovered surface and supporting capability has one evidence-linked
inventory row.

**Independent Test**: Reconcile manifest totals against source-denominator.md with zero unexplained
files and zero duplicate primary rows.

- [x] T006 [P] [US1] Inventory App Router pages, redirect aliases, layouts, loading states, audiences, actors, channels, locales, and entry points in specs/001-brownfield-system-audit/evidence/manifests/routes-and-surfaces.md
- [x] T007 [P] [US1] Inventory forms, dialogs, submit handlers, validation states, destructive actions, and route usage in specs/001-brownfield-system-audit/evidence/manifests/forms-and-dialogs.md
- [x] T008 [P] [US1] Inventory API controllers, guards, DTOs, services, adapters, authorization, and error modes in specs/001-brownfield-system-audit/evidence/manifests/api-capabilities.md
- [x] T009 [P] [US1] Inventory migrations, tables, functions, policies, storage, seeds, and soft-delete coverage in specs/001-brownfield-system-audit/evidence/manifests/data-and-migrations.md
- [x] T010 [P] [US1] Inventory unit, integration, E2E, build, Android, and audit configuration coverage in specs/001-brownfield-system-audit/evidence/manifests/automated-tests.md
- [x] T011 [US1] Reconcile T006-T010 totals and map every Surface, Interaction, and Capability dependency in specs/001-brownfield-system-audit/evidence/manifests/traceability.md

**Checkpoint**: User Story 1 is complete when every denominator item is inventoried or explicitly
excluded and no row claims verified status without fresh evidence.

---

## Phase 4: User Story 2 - Functional and Visual Proof (Priority: P2)

**Goal**: Produce reproducible technical, interaction, accessibility, responsive, theme, and visual
evidence for every applicable user-facing surface.

**Independent Test**: Re-run the audit Playwright specification and technical commands, then
reconcile expected matrix cells with retained screenshots and named blockers.

- [ ] T012 [US2] Add source-driven route, redirect, explicit-actor, state, desktop-web, responsive-web, theme, and screenshot coverage in apps/web/e2e/brownfield_system_audit.spec.ts *(Targeted actor and redirect checks exist, but the full matrix remains hard-coded and lacks independent authenticated-public, Delegado, and dev/admin fixtures.)*
- [x] T013 [US2] Verify test fixtures and role prerequisites without exposing credentials in specs/001-brownfield-system-audit/evidence/runs/2026-09-25-environment.md
- [x] T014 [P] [US2] Run API unit tests and production build and record commands, exit codes, counts, skips, and failures in specs/001-brownfield-system-audit/evidence/runs/2026-09-25-api.md
- [x] T015 [P] [US2] Run the web production build and record command, exit code, warnings, and failures in specs/001-brownfield-system-audit/evidence/runs/2026-09-25-web-build.md
- [ ] T016 [US2] Execute the Playwright audit and full applicable browser suite, retaining final captures under specs/001-brownfield-system-audit/evidence/screenshots/ *(Note: Retained 184 surface cells + 10 interaction cells; 8 redundant captures deleted; 8 cells blocked by BLOCK-SUPABASE-LOCAL; full matrix rerun skipped in final correction to preserve time boundary)*
- [x] T017 [US2] Record expected, captured, rejected, replaced, and blocked visual matrix cells in specs/001-brownfield-system-audit/evidence/reports/visual-matrix.md
- [x] T018 [P] [US2] Record valid, invalid, boundary, cancellation, failure, keyboard, and destructive-safeguard results for every form/dialog in specs/001-brownfield-system-audit/evidence/reports/form-behavior.md
- [x] T019 [P] [US2] Record public, Gestor, Delegado, and dev/admin authorization, tenant isolation, privacy, exact-location, billing, log, and mutation behavior using explicit actor contexts in specs/001-brownfield-system-audit/evidence/reports/role-and-privacy.md
- [x] T020 [US2] Inspect every final screenshot for runtime failure, overflow, clipping, hierarchy, contrast, focus, touch targets, feedback, localization, and Rendo palette use, with separate desktop-web and responsive-web dispositions plus Android-readiness gaps in specs/001-brownfield-system-audit/evidence/reports/ui-ux-audit.md
- [x] T021 [US2] Apply final functional and UI/UX dispositions plus evidence IDs to every inventory row in specs/001-brownfield-system-audit/evidence/manifests/traceability.md

**Checkpoint**: User Story 2 is partially complete (PARTIAL delivery): 184 visual cells and 6 targeted browser checks verified; 8 visual cells blocked by BLOCK-SUPABASE-LOCAL; form behavior reclassified honestly.

---

## Phase 5: User Story 3 - Actionable Remediation Roadmap (Priority: P3)

**Goal**: Convert verified evidence into deduplicated findings and bounded future feature candidates.

**Independent Test**: Sample every P0/P1 and confirm it has current evidence, affected inventory IDs,
root-cause disposition, and one remediation candidate with explicit boundaries.

- [x] T022 [P] [US3] Deduplicate confirmed defects and blockers by root cause with P0-P3 severity in specs/001-brownfield-system-audit/evidence/reports/findings.md
- [x] T023 [P] [US3] Compare implementation, tests, ESTADO-REAL.md, product documents, design guidance, and constitution in specs/001-brownfield-system-audit/evidence/reports/contradictions.md
- [x] T024 [US3] Group findings into dependency-aware bounded Spec Kit feature candidates in specs/001-brownfield-system-audit/evidence/reports/remediation-roadmap.md
- [x] T025 [US3] Produce contract-compliant inventory, matrix, finding, blocker, and cleanup totals in specs/001-brownfield-system-audit/evidence/delivery.json

**Checkpoint**: User Story 3 is complete: all P0/P1 findings are owned by bounded remediation candidates REMED-001 through REMED-004.

---

## Phase 6: Final Validation and Cleanup

**Purpose**: Make the package reproducible and ready for Codex review.

- [x] T026 Re-run every scenario in specs/001-brownfield-system-audit/quickstart.md and record the final disposition in specs/001-brownfield-system-audit/evidence/reports/final-validation.md
- [x] T027 Validate delivery format against specs/001-brownfield-system-audit/contracts/audit-delivery.md and correct only audit artifacts
- [x] T028 Remove only task-owned temporary traces, downloads, caches, rejected screenshots, and processes, then finalize specs/001-brownfield-system-audit/evidence/reports/cleanup-ledger.md
- [x] T029 Return the structured Antigravity delivery summary without changing product source beyond apps/web/e2e/brownfield_system_audit.spec.ts and audit artifacts

---

## Dependencies & Execution Order

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- User Story 1 depends on Phase 2.
- User Story 2 depends on the Surface and Interaction IDs from User Story 1.
- User Story 3 depends on verified evidence from User Stories 1 and 2.
- Final validation depends on all three user stories.
