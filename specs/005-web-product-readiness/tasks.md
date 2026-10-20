# Tasks: Web Product Readiness

**Input**: Design documents from `specs/005-web-product-readiness/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Evidence rule**: Every checked task must link fresh evidence. Playwright screenshots are mandatory for visual/interaction work. Docker remains off until a task explicitly requires it.

## Phase 1: Setup (Shared Evidence Infrastructure)

**Purpose**: Create feature-scoped, reproducible evidence structure without changing product behavior.

- [x] T001 Create the evidence directory/index structure defined by the plan in `specs/005-web-product-readiness/evidence/README.md`
- [x] T002 [P] Create current inventory table shells following `contracts/inventory-contract.md` in `specs/005-web-product-readiness/evidence/manifests/`
- [x] T003 [P] Create acceptance matrix shell following `contracts/acceptance-matrix.md` in `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md`
- [x] T004 [P] Create finding, traceability and cleanup report shells in `specs/005-web-product-readiness/evidence/reports/`
- [x] T005 Create deterministic screenshot/contact-sheet conventions and tooling in `specs/005-web-product-readiness/evidence/review-tools/`
- [x] T006 Record initial runtime/resource baseline with Docker off in `specs/005-web-product-readiness/evidence/test-results/environment-baseline.md`

---

## Phase 2: Foundational (Current Source of Truth)

**Purpose**: Reconcile all source and actor fixtures before judging any user story.

**⚠️ CRITICAL**: No remediation begins until the inventory denominator and actor matrix are complete.

- [x] T007 Enumerate every current web page, redirect, layout and loading state from `apps/web/src/app/` into `specs/005-web-product-readiness/evidence/manifests/routes-and-states.md` (FR-001–FR-003)
- [x] T008 Enumerate every form, dialog and critical control from `apps/web/src/app/` and `apps/web/src/components/` into `specs/005-web-product-readiness/evidence/manifests/interactions.md` (FR-001–FR-003, FR-009–FR-011)
- [x] T009 [P] Enumerate controllers, services and authorization seams from `apps/api/src/` into `specs/005-web-product-readiness/evidence/manifests/api-capabilities.md` (FR-001, FR-002, FR-025)
- [x] T010 [P] Enumerate migrations, functions, policies and pgTAP suites from `supabase/` into `specs/005-web-product-readiness/evidence/manifests/data-and-policies.md` (FR-001, FR-002)
- [x] T011 [P] Enumerate all active browser, API and database test suites from `apps/web/e2e/`, `apps/api/src/` and `supabase/tests/` into `specs/005-web-product-readiness/evidence/manifests/automated-tests.md` (FR-001, FR-002)
- [x] T012 Reconcile T007–T011 against Feature 001 and record additions/removals/status changes in `specs/005-web-product-readiness/evidence/reports/audit-001-delta.md` (FR-003)
- [x] T013 Map every inventory item to audience, allowed actors, denied actors and channel in `specs/005-web-product-readiness/evidence/manifests/actor-surface-matrix.md` (FR-004–FR-008)
- [x] T014 Validate or update deterministic anonymous/public/Gestor/Delegado-read/Delegado-manage/dev fixtures in `apps/web/e2e/fixtures/` without weakening production authorization (FR-004–FR-008, FR-028)
- [x] T015 Create shared stable-theme, settled-animation, overflow, contrast, touch-target and screenshot helpers in `apps/web/e2e/fixtures/product-readiness.ts` (FR-011–FR-013, FR-026–FR-028)
- [x] T016 Produce the baseline finding register from source inspection in `specs/005-web-product-readiness/evidence/reports/findings.md` using severity/state rules from `data-model.md`

**Checkpoint**: Current denominator, fixtures and objective visual checks are complete.

---

## Phase 3: User Story 1 — Experiencia pública completa (Priority: P1) 🎯 MVP

**Goal**: Every public/auth destination and interaction is functional, polished and isolated from private surfaces.

**Independent Test**: Anonymous and public authenticated fixtures complete marketplace, auth, favorites, reporting and invitation journeys in all required responsive/theme cells.

### Tests for User Story 1

- [x] T017 [P] [US1] Add public route/state coverage with failure, empty and privacy assertions in `apps/web/e2e/product_readiness_public.spec.ts` (FR-009, FR-015, FR-016, FR-028)
- [x] T018 [P] [US1] Add public visual/accessibility matrix using shared helpers in `apps/web/e2e/product_readiness_public.spec.ts` (FR-011–FR-015, FR-026, FR-027)
- [x] T019 [P] [US1] Add authenticated favorites, report and invitation behavior coverage in `apps/web/e2e/product_readiness_public.spec.ts` (FR-010, FR-015, FR-016, FR-028)

### Audit and Remediation for User Story 1

- [x] T020 [US1] Capture and classify the complete public baseline in `specs/005-web-product-readiness/evidence/reports/public-findings.md`
- [x] T021 [US1] Correct critical/high public navigation, isolation and state defects in `apps/web/src/app/[locale]/(marketplace)/` and `apps/web/src/components/marketplace/` using T020 as the bounded defect list (FR-004, FR-009, FR-015)
- [x] T022 [US1] Correct critical/high auth, registration, onboarding and invitation defects in `apps/web/src/app/[locale]/auth/`, `apps/web/src/app/[locale]/(marketplace)/cuenta/invitaciones/` and `apps/web/src/components/ui/signup-form.tsx` using T020 (FR-010, FR-016)
- [x] T023 [US1] Correct public responsive, dark/light, keyboard, touch and localization defects in `apps/web/src/app/[locale]/(marketplace)/`, `apps/web/src/components/marketplace/` and `apps/web/messages/` using T020 (FR-011–FR-015, FR-026)
- [x] T024 [US1] Run focused public Playwright tests and generate screenshots/contact sheets in `specs/005-web-product-readiness/evidence/screenshots/public/accepted/` and `evidence/contact-sheets/public/accepted/`
- [x] T025 [US1] Record public acceptance cells and remaining low/accepted findings in `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md` and `evidence/reports/public-findings.md`

**Checkpoint**: Public and auth journeys are independently accepted.

---

## Phase 4: User Story 2 — Operación integral del Gestor (Priority: P1)

**Goal**: The Gestor can operate every business module with modality-correct rental and optional/group seña behavior.

**Independent Test**: A Gestor completes inventory, tenant, rental, metrics, billing, fiscal, delegate and log workflows with representative valid/invalid states.

### Tests for User Story 2

- [x] T026 [P] [US2] Add Gestor route/state and CRUD journey coverage in `apps/web/e2e/product_readiness_gestor.spec.ts` (FR-009, FR-010, FR-017, FR-018, FR-022–FR-024)
- [x] T027 [P] [US2] Add separate monthly, daily and hourly rental journeys with overlap boundaries in `apps/web/e2e/product_readiness_rentals.spec.ts` (FR-019, FR-021)
- [x] T028 [P] [US2] Add seña absent/present and explicit Grupo reusable-configuration journeys in `apps/web/e2e/product_readiness_rentals.spec.ts` (FR-020)
- [x] T029 [P] [US2] Add Gestor visual/accessibility matrix for every route/form/dialog in `apps/web/e2e/product_readiness_gestor.spec.ts` (FR-011–FR-014, FR-026–FR-028)

### Audit and Remediation for User Story 2

- [x] T030 [US2] Capture and classify the complete Gestor baseline in `specs/005-web-product-readiness/evidence/reports/gestor-findings.md`
- [x] T031 [US2] Correct critical/high group and Unidad workflow defects in `apps/web/src/app/[locale]/(gestor)/mis-unidades/`, `apps/web/src/components/gestor/BentoGruposGrid.tsx`, `GrupoFormModal.tsx`, `UnidadForm.tsx` and `LocationPickerMap.tsx` using T030 (FR-017)
- [x] T032 [US2] Correct critical/high Inquilino workflow defects in `apps/web/src/app/[locale]/(gestor)/inquilinos/` and `apps/web/src/components/gestor/InquilinoFormModal.tsx` using T030 (FR-018)
- [x] T033 [US2] Correct monthly/daily/hourly Alquiler and availability defects in `apps/web/src/app/[locale]/(gestor)/alquileres/`, `apps/web/src/components/gestor/AlquilerFormModal.tsx`, `apps/api/src/alquileres/` and `apps/api/src/unidades/` using T030 (FR-019, FR-021)
- [x] T034 [US2] Correct optional and Grupo-configurable seña defects in `apps/web/src/components/gestor/`, `apps/api/src/alquileres/`, `apps/api/src/grupos/` and `supabase/migrations/` using T030; add a migration only if current schema cannot satisfy FR-020
- [x] T035 [US2] Correct dashboard, metrics and logs defects in `apps/web/src/app/[locale]/(gestor)/dashboard/`, `metricas/`, `logs/` and their components using T030 (FR-022, FR-025)
- [x] T036 [US2] Correct billing, payments and fiscal readiness defects in `apps/web/src/app/[locale]/(gestor)/facturacion/`, `facturacion-afip/`, `apps/web/src/components/gestor/Facturacion*.tsx`, `apps/api/src/pagos/` and `apps/api/src/afip/` using T030 (FR-023)
- [x] T037 [US2] Correct delegate invitation/configuration/revocation UX defects in `apps/web/src/app/[locale]/(gestor)/delegados/` and `apps/web/src/components/delegados/` using T030 without weakening Feature 004 (FR-024)
- [x] T038 [US2] Run focused Gestor/rental Playwright tests and generate screenshots/contact sheets in `specs/005-web-product-readiness/evidence/screenshots/gestor/` and `evidence/contact-sheets/gestor/`
- [x] T039 [US2] Record Gestor acceptance cells and remaining low/accepted findings in `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md` and `evidence/reports/gestor-findings.md`

**Checkpoint**: Gestor workflows and all rental modalities are independently accepted.

---

## Phase 5: User Story 3 — Trabajo delegado seguro (Priority: P1)

**Goal**: Delegado-read/manage sees and performs exactly the scoped operational actions allowed, never owner-only data.

**Independent Test**: Both Delegado levels exercise account/group/unit scope, direct URLs, scope changes and denial states.

### Tests for User Story 3

- [ ] T040 [P] [US3] Extend scoped read/manage positive and negative journeys in `apps/web/e2e/delegado_scope_authorization.spec.ts` for any inventory items not covered by Feature 004 (FR-005, FR-006, FR-024, FR-028)
- [ ] T041 [P] [US3] Add cross-surface owner-only and dev denial regression cases in `apps/web/e2e/product_readiness_delegado.spec.ts` (FR-007, FR-008)
- [ ] T042 [P] [US3] Add Delegado visual/accessibility matrix for visible, hidden and restricted states in `apps/web/e2e/product_readiness_delegado.spec.ts` (FR-011–FR-013, FR-026, FR-027)

### Audit and Remediation for User Story 3

- [ ] T043 [US3] Capture and classify the Delegado delta beyond Feature 004 in `specs/005-web-product-readiness/evidence/reports/delegado-findings.md`
- [ ] T044 [US3] Correct any critical/high UI authorization or stale-scope defects in `apps/web/src/app/[locale]/(gestor)/`, `apps/web/src/components/gestor/`, `apps/web/src/components/delegados/` and `apps/web/src/middleware.ts` using T043 (FR-005–FR-008)
- [ ] T045 [US3] Correct any critical/high API authorization defects in `apps/api/src/authorization/`, affected controllers/services and `supabase/migrations/` using T043 while preserving fail-closed behavior (FR-005–FR-008, FR-025)
- [ ] T046 [US3] Run focused Delegado tests and generate screenshots/contact sheets in `specs/005-web-product-readiness/evidence/screenshots/delegado/` and `evidence/contact-sheets/delegado/`
- [ ] T047 [US3] Record Delegado acceptance cells and remaining low/accepted findings in `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md` and `evidence/reports/delegado-findings.md`

**Checkpoint**: Delegated work is useful, scoped and owner-data safe.

---

## Phase 6: User Story 4 — Administración de desarrollo aislada (Priority: P2)

**Goal**: Internal moderation/log/metrics/payment-audit tools are usable by dev/admin and closed to all business/public actors.

**Independent Test**: Dev/admin completes all internal routes; five non-dev actor states receive fail-closed outcomes.

### Tests for User Story 4

- [ ] T048 [P] [US4] Add complete dev/admin authorized journey coverage in `apps/web/e2e/product_readiness_dev.spec.ts` (FR-007, FR-009, FR-028)
- [ ] T049 [P] [US4] Add anonymous/public/Gestor/Delegado-read/Delegado-manage direct-access denial coverage in `apps/web/e2e/product_readiness_dev.spec.ts` (FR-007, FR-028)
- [ ] T050 [P] [US4] Add dev/admin responsive visual/accessibility matrix in `apps/web/e2e/product_readiness_dev.spec.ts` (FR-011–FR-013, FR-026, FR-027)

### Audit and Remediation for User Story 4

- [ ] T051 [US4] Capture and classify the dev/admin baseline in `specs/005-web-product-readiness/evidence/reports/dev-findings.md`
- [ ] T052 [US4] Correct critical/high console isolation, mojibake, layout and state defects in `apps/web/src/app/[locale]/dev/` and affected API capabilities using T051 (FR-007, FR-009)
- [ ] T053 [US4] Run focused dev/admin Playwright tests and generate screenshots/contact sheets in `specs/005-web-product-readiness/evidence/screenshots/dev/` and `evidence/contact-sheets/dev/`
- [ ] T054 [US4] Record dev/admin acceptance cells and remaining low/accepted findings in `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md` and `evidence/reports/dev-findings.md`

**Checkpoint**: Internal console is independently usable and isolated.

---

## Phase 7: User Story 5 — Experiencia adaptable y accesible (Priority: P2)

**Goal**: Cross-cutting responsive, theme, accessibility and state quality is consistent over the complete inventory.

**Independent Test**: Acceptance matrix has a reviewed disposition and fresh evidence for every applicable width/theme/state cell.

### Tests and Remediation for User Story 5

- [ ] T055 [P] [US5] Add global navigation, focus, reduced-motion and responsive-shell regression cases in `apps/web/e2e/product_readiness_cross_cutting.spec.ts` (FR-011–FR-014, FR-026–FR-028)
- [ ] T056 [P] [US5] Add loading, empty, validation, error, success and restricted-state regression cases in `apps/web/e2e/product_readiness_cross_cutting.spec.ts` (FR-009, FR-010, FR-028)
- [ ] T057 [US5] Identify systemic component defects across `apps/web/src/components/ui/`, layouts and `apps/web/src/app/globals.css` in `specs/005-web-product-readiness/evidence/reports/cross-cutting-findings.md`
- [ ] T058 [US5] Correct shared critical/high contrast, focus, touch, overflow and dialog/layer defects in `apps/web/src/components/ui/` and `apps/web/src/app/globals.css` using T057 (FR-011–FR-014)
- [ ] T059 [US5] Correct shared loading/empty/error/success/restricted copy and localization defects in route loading files, `apps/web/src/components/ui/` and `apps/web/messages/` using T057 (FR-009, FR-010)
- [ ] T060 [US5] Run the complete product-readiness Playwright matrix and regenerate all feature screenshots/contact sheets under `specs/005-web-product-readiness/evidence/`
- [ ] T061 [US5] Review every contact sheet and record visual PASS/FAIL with reviewer in `specs/005-web-product-readiness/evidence/manifests/acceptance-matrix.md`

**Checkpoint**: Every applicable surface/state has independent desktop and responsive acceptance.

---

## Phase 8: User Story 6 — Entrega local verificable (Priority: P3)

**Goal**: Produce a clean, healthy, reproducible local environment for user acceptance.

**Independent Test**: From stopped services, the quickstart brings up only Rendo and all published links/accounts work within 10 minutes.

- [ ] T062 [US6] Remove or formally classify project scratch/trash discovered by the inventory, including `apps/api/src/scratch/`, in `specs/005-web-product-readiness/evidence/reports/cleanup-ledger.md` without deleting uncertain user work (FR-034)
- [ ] T063 [US6] Start Docker/Supabase only now, reset/seed Rendo and run all pgTAP/data-policy tests with results in `specs/005-web-product-readiness/evidence/test-results/database.md` (FR-032, FR-033)
- [ ] T064 [P] [US6] Run complete API lint/test/build with exact counts in `specs/005-web-product-readiness/evidence/test-results/api.md` (FR-032)
- [ ] T065 [P] [US6] Run complete web lint/build and all browser suites with exact counts in `specs/005-web-product-readiness/evidence/test-results/web.md` (FR-032)
- [ ] T066 [US6] Reconcile 35 FR, 10 SC, all findings and all acceptance cells in `specs/005-web-product-readiness/evidence/reports/traceability.md` (FR-029–FR-032)
- [ ] T067 [US6] Verify zero open critical/high findings and record every medium exception decision in `specs/005-web-product-readiness/evidence/reports/final-review.md` (FR-030, FR-031)
- [ ] T068 [US6] Create the local manual acceptance guide with URLs, demo actors, scenarios and limitations in `specs/005-web-product-readiness/evidence/reports/local-handoff.md` (FR-033, FR-035)
- [ ] T069 [US6] Start only required Rendo web/API/Supabase services, verify health and keep them running for the user's manual test (FR-033)
- [ ] T070 [US6] Remove task-owned test-results, traces, PID and auxiliary agents while preserving retained evidence and required Rendo services; record final RAM/listeners in `specs/005-web-product-readiness/evidence/reports/cleanup-ledger.md` (FR-034)
- [ ] T071 [US6] Update `ESTADO-REAL.md` with the evidence-backed web readiness verdict and explicit future Android/deploy gates (FR-035)

---

## Phase 9: Final Convergence

**Purpose**: Confirm implementation and evidence still match the specification after all corrections.

- [ ] T072 Run `speckit-converge` against Feature 005 and append any newly discovered required work to `specs/005-web-product-readiness/tasks.md`
- [ ] T073 Execute any tasks appended by T072 and refresh affected evidence under `specs/005-web-product-readiness/evidence/`
- [ ] T074 Perform Codex final diff, command, screenshot and runtime review against `specs/005-web-product-readiness/spec.md`
- [ ] T075 Mark every task complete only after its evidence exists and publish the final PASS/BLOCKED verdict in `specs/005-web-product-readiness/evidence/reports/final-review.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2; the current denominator blocks all story work.
- US1, US2, US3 and US4 audits may run after Phase 2, but remediation is accepted in bounded sequential batches to keep reviews and screenshots attributable.
- US5 depends on US1–US4 because it validates the combined product and shared regressions.
- US6 depends on all product remediation; it is the only phase that requires Docker/Supabase to remain running afterward.
- Final convergence depends on every prior story and may add tasks before closure.

## Parallel Opportunities

- T002–T004; T009–T011; test authoring within each story; T064–T065 when host capacity permits.
- Product remediation tasks touching shared UI or layouts are not parallelized with visual capture.
- Docker-backed database validation is not parallelized with unrelated high-memory browser batches unless RAM remains within the user-approved envelope.

## Implementation Strategy

1. Build and freeze the source denominator.
2. Audit one trust surface at a time and produce findings before changes.
3. Dispatch Antigravity only bounded defect lists, then review terminal delivery and screenshots.
4. Run cross-cutting matrix after audience-specific acceptance.
5. Start the full local stack only for final integration and leave it healthy for manual review.

## Format Validation

All 75 tasks use checkbox + sequential ID; story tasks carry `[US#]`; parallel markers appear only for independent files/work; each task names an exact file or bounded existing directory and its evidence destination.
