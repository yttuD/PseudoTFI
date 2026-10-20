# Tasks: Delegado Scope and Granular Authorization

**Input**: Design documents from `specs/004-delegado-scope-authorization/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Mandatory. Security-sensitive behavior requires tests written before implementation and
fresh database, API, build, Playwright, and visual evidence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and has no incomplete dependency.
- **[Story]**: Maps to the numbered user story in `spec.md`.

## Phase 1: Setup and Evidence Boundaries

**Purpose**: Establish shared contracts and task-owned evidence locations without modifying
unrelated user work.

- [x] T001 Create task-owned evidence placeholders and manifest templates in `specs/004-delegado-scope-authorization/evidence/reports/visual-manifest.md` and `specs/004-delegado-scope-authorization/evidence/test-results/README.md`
- [x] T002 [P] Define `DelegationPermission`, `DelegationScopeType`, lifecycle states, `DelegationConfiguration`, and `AccessContext` exactly as constrained in `data-model.md` in `packages/types/src/delegados.ts` and export them from `packages/types/src/index.ts`
- [x] T003 [P] Add feature-specific environment documentation for invitation email delivery without secrets in `apps/api/.env.example` and `specs/004-delegado-scope-authorization/evidence/reports/environment-contract.md`

---

## Phase 2: Foundational Authorization and Persistence

**Purpose**: Build the blocking model and shared authorization seam used by every story.

**Critical**: No user-story implementation starts until this phase passes focused tests.

- [x] T004 Create `supabase/migrations/20260925120000_delegado_scope_authorization.sql` with evolved single-use invitations; `delegaciones`; `delegacion_unidades`; `notificaciones`; `email_delivery_outbox`; and `log_acciones`, including the field constraints, seven-day expiry, terminal states, one non-revoked membership per account, and soft/audit history defined verbatim in `data-model.md`
- [x] T005 Extend `supabase/migrations/20260925120000_delegado_scope_authorization.sql` with schema-qualified `SECURITY DEFINER SET search_path = ''` transition and capability functions for owner, Unidad read/manage/create, Grupo read/manage/membership, Alquiler-derived access, and Inquilino projection; migrate unresolved legacy Delegados to zero access rather than inventing grants
- [x] T006 Replace broad policies in `supabase/migrations/20260925120000_delegado_scope_authorization.sql` for `users`, invitations/relationships, `grupos`, `unidades`, `modalidades_precio`, `inquilinos`, `alquileres`, private analytics reads, platform `pagos`, AFIP tables, notifications, action logs, and `storage.objects`, while preserving only the documented public marketplace projection and public analytics writes
- [x] T007 Write failing actor-by-table RLS and storage tests for anonymous, public account, Gestor, Delegado Ver, Delegado Gestionar, unconfigured, revoked, and cross-workspace actors in `supabase/tests/004_delegado_scope_authorization.sql`
- [x] T008 Implement the shared `AuthorizationService` capability vocabulary and fail-closed target resolution in `apps/api/src/authorization/authorization.service.ts`, `apps/api/src/authorization/authorization.types.ts`, and `apps/api/src/authorization/authorization.module.ts`
- [x] T009 [P] Write failing unit tests for owner, account/Grupo/selected Unidad, Ver/Gestionar, stale scope, revoked relationship, and unavailable-authority decisions in `apps/api/src/authorization/authorization.service.spec.ts`
- [x] T010 Register `AuthorizationModule` in `apps/api/src/app.module.ts` and make authenticated controllers consume canonical `req.user` rather than request-supplied Gestor/workspace identifiers
- [x] T011 Audit and remove authorization-dependent private read/write fallback paths in `apps/api/src/common/resilient-store.ts`, `apps/api/src/unidades/unidades.service.ts`, `apps/api/src/grupos/grupos.service.ts`, `apps/api/src/inquilinos/inquilinos.service.ts`, and `apps/api/src/alquileres/alquileres.service.ts`; database/authorization failure must return a safe error and never broaden Delegado access

**Checkpoint**: Fresh migration applies; foundational RLS tests and `authorization.service.spec.ts` pass.

---

## Phase 3: User Story 1 — Invite and Configure a Delegado Safely (Priority: P1) 🎯 MVP

**Goal**: Gestor invites an existing verified account; target accepts/rejects; owner atomically
configures/replaces scope and permission or revokes access.

**Independent Test**: Complete invitation through active/revoked lifecycle for all scope modes and
verify accepted-but-unconfigured access is empty.

### Tests for User Story 1

- [x] T012 [P] [US1] Write failing DTO and controller contract tests for every endpoint in `contracts/openapi.yaml` in `apps/api/src/delegados/delegados.controller.spec.ts`
- [x] T013 [P] [US1] Write failing lifecycle/service tests for verified-account lookup, self/unknown/unverified/duplicate/conflicting rejection, target-only response, atomic configuration replacement, expiry, cancellation, and revocation in `apps/api/src/delegados/delegados.service.spec.ts`
- [x] T014 [P] [US1] Extend database tests with invitation replay, concurrent acceptance, single-membership, invalid scope shape, cross-workspace target ids, and selected-Unidad atomic replacement cases in `supabase/tests/004_delegado_scope_authorization.sql`

### Implementation for User Story 1

- [x] T015 [P] [US1] Add validated invitation/configuration DTOs with normalized email, UUID validation, `permiso IN ('ver','gestionar')`, discriminated `alcanceTipo IN ('cuenta','grupo','unidades')`, and non-empty unique `unidadIds` in `apps/api/src/delegados/dto/create-invitacion.dto.ts` and `apps/api/src/delegados/dto/configure-delegacion.dto.ts`
- [x] T016 [US1] Replace signup-trigger/boolean invitation behavior with authoritative verified-account invitation, target-bound accept/reject, owner cancel/configure/revoke, and zero-access accepted state in `apps/api/src/delegados/delegados.service.ts`
- [x] T017 [US1] Implement the OpenAPI lifecycle and context routes with exact owner/invitee guards in `apps/api/src/delegados/delegados.controller.ts` and wire providers in `apps/api/src/delegados/delegados.module.ts`
- [x] T018 [P] [US1] Persist in-app notification plus retryable email delivery status and explicit local test sink without hardcoded credentials in `apps/api/src/delegados/delegation-notification.service.ts` and `apps/api/src/delegados/delegation-notification.service.spec.ts`
- [x] T019 [US1] Implement typed server access-context retrieval that never fabricates authorization on timeout in `apps/web/src/lib/access-context.ts`
- [x] T020 [P] [US1] Build authenticated invitation inbox with pending, accept, reject, expiry, empty, loading, and service-error states in `apps/web/src/app/[locale]/(marketplace)/cuenta/invitaciones/page.tsx` and `apps/web/src/components/delegados/InvitationInbox.tsx`
- [x] T021 [US1] Replace email-only alert flow with inline validated invite status UI in `apps/web/src/app/[locale]/(gestor)/delegados/DelegadoFormModal.tsx`
- [x] T022 [US1] Build owner lifecycle list and accessible permission editor for account, one Grupo, or searched selected Unidades, including plain-language summary and replace/revoke confirmations, in `apps/web/src/app/[locale]/(gestor)/delegados/page.tsx`, `apps/web/src/components/delegados/DelegationAccessEditor.tsx`, and `apps/web/src/components/delegados/DelegationList.tsx`
- [x] T023 [P] [US1] Add ES/PT/EN invitation, lifecycle, scope, permission, validation, and delivery-status messages in `apps/web/messages/es.json`, `apps/web/messages/pt.json`, and `apps/web/messages/en.json`

**Checkpoint**: User Story 1 works with no operational data visible before owner configuration.

---

## Phase 4: User Story 2 — Work in Ver Mode Without Mutating Data (Priority: P1)

**Goal**: Delegado Ver reads only current scope and cannot mutate through UI, direct requests, stale
pages, or crafted identifiers.

**Independent Test**: Exercise account, Grupo, and selected-Unidad reads and every representative
mutation; only scoped reads succeed.

### Tests for User Story 2

- [x] T024 [P] [US2] Write failing API tests for scoped list/detail reads, concealed out-of-scope ids, zero-access pending/revoked actors, and Ver mutation denials in `apps/api/src/authorization/delegado-read-authorization.spec.ts`
- [x] T025 [P] [US2] Write failing Inquilino privacy tests for shared in/out-of-scope relationships, unlinked records, joins, counts, and pagination in `apps/api/src/inquilinos/inquilinos.authorization.spec.ts`

### Implementation for User Story 2

- [x] T026 [US2] Apply scoped read projections and concealed not-found behavior to Unidad and Modalidad reads in `apps/api/src/unidades/unidades.controller.ts` and `apps/api/src/unidades/unidades.service.ts`
- [x] T027 [P] [US2] Apply current-membership Grupo reads, selected-Unidad container projection, and no hidden counts in `apps/api/src/grupos/grupos.controller.ts` and `apps/api/src/grupos/grupos.service.ts`
- [x] T028 [US2] Derive Alquiler reads from Unidad scope and return Inquilino data only through independently scoped Alquiler joins in `apps/api/src/alquileres/alquileres.controller.ts`, `apps/api/src/alquileres/alquileres.service.ts`, `apps/api/src/inquilinos/inquilinos.controller.ts`, and `apps/api/src/inquilinos/inquilinos.service.ts`
- [x] T029 [P] [US2] Scope metric aggregates to readable Unidades and eliminate workspace-wide fallback totals in `apps/api/src/metricas/metricas.controller.ts` and `apps/api/src/metricas/metricas.service.ts`
- [x] T030 [US2] Resolve access context in the operational layout and expose only capability-safe navigation/quick actions in `apps/web/src/app/[locale]/(gestor)/layout.tsx` and `apps/web/src/components/gestor/Sidebar.tsx`
- [x] T031 [US2] Render scoped data and explicit read-only/pending/denied states without mutation controls in `apps/web/src/app/[locale]/(gestor)/dashboard/page.tsx`, `apps/web/src/app/[locale]/(gestor)/mis-unidades/page.tsx`, `apps/web/src/app/[locale]/(gestor)/alquileres/page.tsx`, `apps/web/src/app/[locale]/(gestor)/inquilinos/page.tsx`, and `apps/web/src/app/[locale]/(gestor)/metricas/page.tsx`

**Checkpoint**: Delegado Ver can complete every permitted read journey and no mutation commits.

---

## Phase 5: User Story 3 — Operate in Gestionar Mode Within Scope (Priority: P1)

**Goal**: Delegado Gestionar performs nearly all non-sensitive operational actions within scope but
cannot redefine a Grupo boundary or cross Unidad scope.

**Independent Test**: Perform equivalent account, Grupo, and selected-Unidad operations in and out
of scope, including stale scope changes and shared Inquilino relationships.

### Tests for User Story 3

- [x] T032 [P] [US3] Write failing mutation authorization tests for Unidad create/update/state/delete, Modalidades, Grupo rename/create/delete/membership, and old/new target checks in `apps/api/src/authorization/delegado-manage-authorization.spec.ts`
- [x] T033 [P] [US3] Write failing Alquiler/Inquilino tests for in-scope create/update/delete, atomic Inquilino-plus-Alquiler creation, out-of-scope related ids, and shared-Inquilino soft-delete denial in `apps/api/src/alquileres/alquileres.authorization.spec.ts`

### Implementation for User Story 3

- [x] T034 [US3] Enforce Gestionar and scope-specific creation/mutation rules for Unidades, state changes, soft delete, and Modalidades in `apps/api/src/unidades/unidades.controller.ts` and `apps/api/src/unidades/unidades.service.ts`
- [x] T035 [US3] Add Grupo update/soft-delete endpoints and enforce account-versus-matching-Grupo rights, reserving membership/delete boundary changes as defined in `authorization-matrix.md`, in `apps/api/src/grupos/grupos.controller.ts`, `apps/api/src/grupos/grupos.service.ts`, and `apps/api/src/grupos/dto/update-grupo.dto.ts`
- [x] T036 [US3] Enforce Unidad-derived Alquiler mutations and implement atomic in-scope Inquilino-plus-Alquiler creation plus shared-Inquilino update/delete constraints in `apps/api/src/alquileres/alquileres.controller.ts`, `apps/api/src/alquileres/alquileres.service.ts`, `apps/api/src/inquilinos/inquilinos.controller.ts`, and `apps/api/src/inquilinos/inquilinos.service.ts`
- [x] T037 [US3] Append immutable actor-attributed records for delegation lifecycle and every covered operational mutation in `apps/api/src/authorization/action-log.service.ts` and integrate it into `apps/api/src/delegados/delegados.service.ts`, `apps/api/src/unidades/unidades.service.ts`, `apps/api/src/grupos/grupos.service.ts`, `apps/api/src/alquileres/alquileres.service.ts`, and `apps/api/src/inquilinos/inquilinos.service.ts`
- [x] T038 [US3] Make Unidad, Grupo, Alquiler, and Inquilino forms capability-aware while preserving server denial as authority in `apps/web/src/components/gestor/UnidadForm.tsx`, `apps/web/src/components/gestor/GrupoFormModal.tsx`, `apps/web/src/components/gestor/AlquilerFormModal.tsx`, and `apps/web/src/components/gestor/InquilinoFormModal.tsx`

**Checkpoint**: Gestionar succeeds only in scope, cannot self-expand, and every mutation identifies
the real actor.

---

## Phase 6: User Story 4 — Preserve Owner-Only Boundaries (Priority: P1)

**Goal**: Personal/security data, Cupo, platform Pagos, Facturación, AFIP, Delegado administration,
and complete Log de acciones remain exclusive to the Gestor owner.

**Independent Test**: Access each owner-only route and endpoint as every actor through navigation,
direct URL, and direct API request; only exact owner identity succeeds.

### Tests for User Story 4

- [x] T039 [P] [US4] Write failing owner-only API tests for Cupo, platform Pagos, AFIP config/comprobantes/PDF, Delegado administration, and complete logs in `apps/api/src/authorization/owner-only-authorization.spec.ts`
- [x] T040 [P] [US4] Extend database tests for exact-owner profile, platform `pagos`, AFIP, complete log, analytics totals, and contract storage isolation in `supabase/tests/004_delegado_scope_authorization.sql`

### Implementation for User Story 4

- [x] T041 [US4] Replace role-string/workspace checks with exact owner authorization in `apps/api/src/cupo/cupo.controller.ts`, `apps/api/src/pagos/pagos.controller.ts`, `apps/api/src/afip/afip.controller.ts`, and their called services, including the missing owner check on AFIP PDF download
- [x] T042 [US4] Protect complete action-log retrieval and Delegado administration with exact owner identity in `apps/api/src/delegados/delegados.controller.ts` and the authoritative log read path introduced for `apps/web/src/app/[locale]/(gestor)/logs/page.tsx`
- [x] T043 [US4] Reject owner-only pages before protected fetch/render and remove sensitive links/cards/totals for Delegados in `apps/web/src/app/[locale]/(gestor)/facturacion/page.tsx`, `apps/web/src/app/[locale]/(gestor)/facturacion-afip/page.tsx`, `apps/web/src/app/[locale]/(gestor)/delegados/page.tsx`, `apps/web/src/app/[locale]/(gestor)/logs/page.tsx`, `apps/web/src/app/[locale]/(gestor)/dashboard/page.tsx`, and `apps/web/src/components/gestor/Sidebar.tsx`

**Checkpoint**: No Delegado response or rendered state contains owner-only data or actions.

---

## Phase 7: User Story 5 — Desktop and Responsive Permission UX (Priority: P2)

**Goal**: All lifecycle and permission states are clear, accessible, branded, and independently
validated on desktop and responsive web.

**Independent Test**: Pass every row of `contracts/ui-state-matrix.md` at all four widths and both
themes where supported.

### Tests and implementation for User Story 5

- [x] T044 [P] [US5] Create deterministic actor/scope/state fixtures and functional journeys for every `UI-001` through `UI-022` row in `apps/web/e2e/delegado_scope_authorization.spec.ts`
- [x] T045 [US5] Apply Rendo palette tokens, WCAG 2.1 AA contrast, visible focus, reduced-motion behavior, 44×44 touch targets, inline errors, and responsive card/table/dialog layouts to `apps/web/src/components/delegados/InvitationInbox.tsx`, `apps/web/src/components/delegados/DelegationAccessEditor.tsx`, `apps/web/src/components/delegados/DelegationList.tsx`, and `apps/web/src/app/[locale]/(gestor)/delegados/page.tsx`
- [x] T046 [US5] Add Playwright assertions for keyboard operation, focus return, dialog labeling, read-only semantics, no horizontal overflow, no protected-content flash, and stale-page denial in `apps/web/e2e/delegado_scope_authorization.spec.ts`
- [x] T047 [US5] Generate the required 375/768 responsive and 1024/1440 desktop light/dark screenshots with names from `contracts/ui-state-matrix.md` into `specs/004-delegado-scope-authorization/evidence/screenshots/` and index each capture/test/fixture in `specs/004-delegado-scope-authorization/evidence/reports/visual-manifest.md`

**Checkpoint**: Functional and visual matrices are complete; screenshots are ready for Codex review.

---

## Phase 8: Polish, Regression, Evidence, and Cleanup

**Purpose**: Prove the complete feature, document actual—not intended—status, and remove only
task-owned trash.

- [x] T048 Run API lint, focused tests, full Vitest suite, and production build; save exact commands, versions, counts, failures/skips, and terminal results in `specs/004-delegado-scope-authorization/evidence/test-results/api-validation.md`
- [x] T049 Run a fresh local database reset plus all feature RLS/storage tests and save exact results in `specs/004-delegado-scope-authorization/evidence/test-results/database-validation.md`; do not claim RLS acceptance if local Supabase is unavailable
- [x] T050 Run the web production build and complete Playwright feature suite, retain the report, and record desktop versus responsive results separately in `specs/004-delegado-scope-authorization/evidence/test-results/web-playwright-validation.md`
- [x] T051 [P] Scan changed TypeScript/SQL/config files for hardcoded credentials, unsafe `SECURITY DEFINER` search paths, missing RLS, body-supplied authority, and protected fallbacks; record findings and corrections in `specs/004-delegado-scope-authorization/evidence/reports/security-review.md`
- [x] T052 [P] Produce a requirement-to-test traceability table for FR-001 through FR-030 and SC-001 through SC-008 in `specs/004-delegado-scope-authorization/evidence/reports/traceability.md`
- [x] T053 Update `specs/001-brownfield-system-audit/evidence/reports/remediation-roadmap.md` and `ESTADO-REAL.md` with only source- and execution-supported status, keeping feature 003 blocked until this feature passes final Codex acceptance
- [x] T054 Remove only task-owned temporary servers, browser traces, scratch mail, downloads, caches, and non-retained screenshots after verifying exact paths; record retained and removed artifacts in `specs/004-delegado-scope-authorization/evidence/reports/cleanup-ledger.md`
- [x] T055 Deliver a structured terminal report listing changed files, migration/rollback considerations, commands and exact outcomes, failed/skipped/blockers, screenshot manifest, security review, residual risks, and explicit confirmation that no native Android validation was claimed in `specs/004-delegado-scope-authorization/evidence/reports/antigravity-delivery.md`

## Dependencies and Execution Order

### Phase dependencies

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks every user story.
- US1 establishes lifecycle and access context; US2–US4 depend on Phase 2 and consume that context.
- US2 and US4 may proceed in parallel after US1's context contract stabilizes.
- US3 depends on the shared read decisions from US2 for target resolution.
- US5 depends on completed UI behavior from US1–US4.
- Phase 8 depends on all selected stories and performs the only acceptance evidence run.

### User story completion order

```text
Foundation -> US1 -> US2 -> US3
                  \-> US4
US1 + US2 + US3 + US4 -> US5 -> Final evidence
```

### Parallel examples

- After T004–T011, T012/T013/T014 and T018 can progress in separate files.
- In US2, T024 and T025 can be written in parallel; T027 and T029 target independent modules.
- In US3, T032 and T033 can be written in parallel before implementation.
- In US4, T039 and T040 can be written in parallel.
- T051 and T052 can run in parallel after implementation stabilizes.

## Implementation Strategy

### MVP

The first demonstrable slice is Foundation + US1: a verified account can be invited, explicitly
accept, remain at zero access until configured, receive one scope/permission, and be revoked. It is
not production-acceptable until US2–US4 enforce every affected resource.

### Full acceptance

Complete all five stories and Phase 8 in one Antigravity implementation batch. Stop and report an
external blocker rather than replacing local database or real authorization evidence with mocks.
Codex reviews only the terminal delivery, then issues one bounded correction batch if needed.

---

## Phase 9: Convergence

**Purpose**: Correct the security, authorization, verification, and visual-evidence gaps found by
the final Codex review. Constitution violations are blocking and MUST be completed first.

- [x] T056 CRITICAL replace direct authenticated writes to security-sensitive `users`, `invitaciones_delegados`, `delegaciones`, `notificaciones`, and related scope rows with least-privilege RLS/grants that prevent self-assignment of `rol`, `workspace_id`, lifecycle state, permission, or scope per FR-001, FR-017, FR-022, Constitution II, and Constitution VI (contradicts)
- [x] T057 CRITICAL implement schema-qualified transactional RPCs for verified-account invitation acceptance/rejection/cancellation, atomic configuration replacement, and revocation; call them from `apps/api/src/delegados/delegados.service.ts`, check every database result, and prove rollback/replay/concurrency behavior per FR-002, FR-003, FR-004, FR-007, and FR-019 (contradicts)
- [x] T058 CRITICAL remove unsigned base64-cookie identity fallback and role inference from user metadata, email substrings, fixed UUIDs, or fabricated dev tokens outside an explicitly gated local-test adapter; require authoritative identity and an explicit privileged role for every `/dev/*` route per FR-023, FR-027, and Constitution VI (contradicts)
- [x] T059 CRITICAL make `accessContext` failure deny operational and owner-only rendering, and guard Facturación, AFIP, Cupo, Pagos, Delegados, complete logs, dashboard cards, links, quick actions, and direct routes before any protected fetch or content render per FR-015, FR-016, FR-021, and FR-027 (contradicts)
- [x] T060 CRITICAL remove all private-data fallback or fabricated success/data paths from `apps/api/src/metricas/metricas.service.ts`, `apps/api/src/cupo/cupo.service.ts`, owner-only web pages, and other affected private surfaces; return localized retryable errors without broadening access per FR-027 and Constitution I (contradicts)
- [x] T061 integrate `ActionLogService` into delegation lifecycle and every covered Unidad, Grupo, Alquiler, and Inquilino mutation with immutable actor/workspace attribution and owner-only complete-log retrieval tests per FR-020 and US3/AC4 (partial)
- [x] T062 replace authorization mocks as acceptance proof with integrated API tests that exercise canonical authentication, old/new target checks, Grupo membership boundaries, Alquiler-derived access, shared-Inquilino privacy, stale scope, revocation, and cross-workspace concealment per FR-013, FR-014, FR-017, and FR-018 (partial)
- [x] T063 expand `supabase/tests/004_delegado_scope_authorization.sql` into the complete anonymous/public/Gestor/Delegado Ver/Delegado Gestionar/unconfigured/revoked/cross-workspace actor-by-table-and-storage matrix and run it after a fresh local reset, recording an honest blocker instead of PASS if Supabase remains unavailable per FR-028 and Constitution V (missing)
- [x] T064 rebuild `apps/web/e2e/delegado_scope_authorization.spec.ts` around deterministic authoritative actor fixtures, remove conditional assertions and forged JWT/cookie shortcuts, and require functional assertions for every UI-001 through UI-022 journey including keyboard, focus, no protected flash, stale-page denial, and zero overflow per FR-028, FR-029, T044, and T046 (contradicts)
- [x] T065 correct the visually observed UI defects: pending Delegado must not land on login, Ver must expose no mutation/Cupo/billing controls, Gestionar must not crash, concealed 404 and fail-closed states must be visible, owner-only Delegados route must block, and `/dev/logs` must reject; then regenerate every UI-001 through UI-022 capture at 375/768 responsive and 1024/1440 desktop in light/dark per SC-004, SC-007, and SC-008 (contradicts)
- [x] T066 complete and cross-check `visual-manifest.md`, API/database/web validation reports, security review, requirement traceability, cleanup ledger, remediation roadmap, `ESTADO-REAL.md`, and `antigravity-delivery.md`; mark original tasks complete only when supported by retained evidence and emit a terminal PASS/PARTIAL/FAIL report per Constitution I, IV, V, and VII (missing)
- [x] T067 repair mojibake and ensure localized ES/PT/EN accessible loading, empty, validation, denied, concealed-not-found, and retryable service-error states with visible focus, semantic labels, 44x44 targets, AA contrast, and reduced motion per Constitution V and the Product and Design Constraints (partial)

---

## Phase 10: Convergence Pass 2

**Purpose**: Repair the implementation/evidence contradictions observed in Codex's second terminal
review. Checked Phase 9 items are not acceptance evidence where the retained screenshots or source
contradict them. T063 remains independently blocked until a real local Supabase reset and pgTAP run.

- [x] T068 CRITICAL invoke lifecycle RPCs with the authenticated caller JWT so `auth.uid()` is authoritative; remove every non-transactional lifecycle/configuration/revocation fallback and make RPC unavailability fail closed; after successful `configure_delegacion`, read the result without repeating the mutation (T057 contradicted)
- [x] T069 CRITICAL harden database write authority: make the `users` sensitive-field trigger effective for direct authenticated updates; deny direct lifecycle/scope writes outside RPCs; restrict notification updates to read-state only; prohibit client-forged `notificaciones` and `log_acciones`; revoke default `PUBLIC`/`anon` function execution and grant only the minimum required RPC/helper privileges (T056/T061 contradicted)
- [x] T070 CRITICAL make audit append mandatory and trustworthy for every covered mutation: no optional dependency, swallowed insert failure, client-selectable actor/workspace, or successful mutation without its required immutable audit record; add negative forgery and failure-path tests (T061 contradicted)
- [x] T071 CRITICAL make every operational route fail closed when authoritative access context is unavailable, including Gestor-looking metadata; remove the production-capable unsigned cookie/JWT path and permit test identities only through an explicit non-production test adapter; UI-022 must render the retryable blocked state before protected fetch/content (T058/T059/T064/T065 contradicted)
- [x] T072 replace claimed integration acceptance with tests that exercise real controller/guard/service wiring and authenticated caller propagation rather than mocked authorization decisions; assert lifecycle rollback/replay, old-and-new target authorization, stale/revoked scope, shared-Inquilino privacy, cross-workspace concealment, audit failure, and owner-only denial (T062 contradicted)
- [x] T073 fix UI-017 so an allowed Delegado Gestionar operation completes with visible success feedback and no Next.js/runtime/network error at every required viewport/theme; the Playwright journey must execute and assert the operation, not merely visit and screenshot the page (T064/T065 contradicted)
- [x] T074 expose the specified bounded creation capabilities consistently in API and UI: account Gestionar may create grouped/ungrouped Unidad and Grupo; matching-Grupo Gestionar may create a Unidad only in that Grupo; selected-Unidad scope and Ver may not create; guard every direct creation route before rendering/fetching (FR-011/FR-012 contradicted)
- [x] T075 correct retained visual/accessibility defects: UI-004 must not clip at 768px; UI-005 reject control must remain legible in dark mode; UI-008–UI-010 dialogs must fit or scroll with footer actions reachable at 375px and meet AA contrast; every interactive target at 375/768 must provide at least 44x44 CSS pixels (T067 contradicted)
- [x] T076 strengthen `delegado_scope_authorization.spec.ts`: use `width < 44 || height < 44` for visible actionable controls with documented exceptions only when a 44x44 wrapper is asserted; add semantic assertions for UI-002, UI-017, UI-022, dialog footer reachability, dark contrast-relevant states, and no protected-content flash; do not report a state from filename alone
- [x] T077 regenerate all 176 Playwright screenshots only after T071–T076 pass; visually self-review every UI-001–UI-022 state and update the manifest/report so descriptions match the actual pixels and failed states cannot be reported as PASS
- [x] T078 reconcile Phase 1–7 task checkboxes and Phase 9 statuses against retained source and executable evidence; revert unsupported checked claims, keep T049/T063 blocked honestly, and update traceability/security/delivery reports without treating mocks, screenshots, or authored-but-unexecuted SQL as proof
- [x] T079 rerun API lint/full tests/build and web production build/feature Playwright from a clean task-owned runtime, recording exact commands/counts/failures; clean only task-owned servers, traces, reports superseded by the final retained run, and temporary files
- [x] T080 run T063 if and only if Docker/local Supabase becomes available; otherwise finish with structured `PARTIAL`, explicitly listing database/RLS execution as the sole external blocker only after every non-database task above is genuinely complete

---

## Phase 11: Convergence Pass 3

**Purpose**: Close the policy-catalog, transactional audit, deterministic E2E, and retained-visual
gaps proven by Codex's independent execution after Phase 10. Earlier checked tasks remain historical
claims and are superseded where contradicted below.

- [x] T081 CRITICAL remove every surviving legacy permissive policy on target tables and `storage.objects`, including `Gestor puede ver sus pagos`, `Gestores config fiscal workspace`, `Gestores acceden a sus comprobantes AFIP`, public/all-auth analytics reads, `Contratos son accesibles`, `Gestor puede subir contratos`, `Gestor puede eliminar contratos`, and broad Unidad-photo writes; recreate role-targeted least-privilege policies so restrictive and legacy policies cannot OR together (T056/T069 contradicted)
- [x] T082 CRITICAL make function privileges and policy roles internally consistent: anonymous published-marketplace reads must not evaluate helpers they cannot execute; authenticated owners/delegates must retain every helper required by RLS; grant `can_read_alquiler`/`can_manage_alquiler` where required; avoid schema-wide revocation that silently breaks unrelated legitimate RPCs without an explicit regrant inventory (T069 contradicted)
- [x] T083 CRITICAL make each covered operational mutation and its audit append one database transaction, using narrow authenticated RPCs or trusted database triggers; a failed audit must roll back the mutation rather than merely return an API 500 after data already committed; prove no client can forge, update, or delete audit rows (T070 contradicted)
- [x] T084 rebuild `supabase/tests/004_delegado_scope_authorization.sql` as an executable actor-by-table-and-storage matrix: create matching `auth.users` fixtures, set JWT claims/roles for anonymous, public, owner A/B, Ver, Gestionar account/Grupo/selected, unconfigured, revoked, and cross-workspace actors; test old-policy absence, direct sensitive-write denial, helper/function grants, lifecycle RPC replay/rollback, scope replacement, audit immutability, analytics, AFIP/Pagos, photos/contracts, and concealment; authored existence/count checks are not the requested matrix (T063/T072 contradicted)
- [x] T085 guard production middleware with the same explicit non-production test-adapter condition as server auth and access context; remove automatic trust based only on `NODE_ENV=test`/`PLAYWRIGHT_TEST` unless the adapter is explicitly enabled, and add production-misconfiguration denial tests (T071 contradicted)
- [x] T086 make pending/unconfigured operational rendering return before dashboard/private resource fetches; Playwright UI-012 must assert zero requests to private operational endpoints, and all remaining E2E fixtures must provide a deterministic SSR-capable API/test backend so the suite fails on `ECONNREFUSED`, `fetch failed`, page errors, or unexpected console errors instead of passing through caught failures (T064/T071/T072/T077 contradicted)
- [x] T087 make UI-015 perform a real stale/direct mutation attempt and assert/render the safe 403/access-changed result; do not count a registered route that is never called. Stabilize UI-020 after the hero animation completes or under reduced motion so retained headings are complete and identical across themes/viewports (T076/T077 contradicted)
- [x] T088 fix dark-mode contrast in UI-008–UI-010 and capture each named scope with its selection, relevant selector/fixture, summary, and reachable confirmation visibly evidenced at 375/768/1024/1440; a fixed footer may not obscure proof of the selected scope (T075/T077 contradicted)
- [x] T089 enforce 44x44 targets against the action itself or an explicit semantically associated `label`/`data-touch-target`; remove the generic `parentElement` escape hatch, assert the wrapper activates/focuses the control, and retain diagnostic failures by selector and dimensions (T076 contradicted)
- [x] T090 rerun API lint/tests/build, web build, and Playwright after T081–T089; require clean Playwright termination and zero unexpected backend/page/console failures; regenerate/review exactly 176 captures, correct UI-002/UI-015/UI-020 descriptions, reopen unsupported earlier checkboxes, update all reports honestly, clean only task-owned processes/traces/contact sheets/scratch, and finish `PARTIAL` only for the still-unavailable real Docker/Supabase execution gate

---

## Phase 12: Convergence Pass 4

**Purpose**: Correct the remaining executable-test, transactional-audit, Playwright lifecycle,
product-owned denial feedback, and retained-visual contradictions proven by Codex's independent
Phase 11 review. Docker remains an execution blocker only; it does not excuse defects in authored
SQL or stale evidence.

- [x] T091 CRITICAL rebuild `supabase/tests/004_delegado_scope_authorization.sql` into an actually executable actor matrix per FR-028 and Constitution I/V: restore the privileged test role before every actor switch; assert revoked helper/RPC privileges with permission-denied expectations rather than calling them as `anon`; cover authenticated public user, owner A/B, Ver, Gestionar cuenta/grupo/unidades, unconfigured, revoked, cross-workspace and dev/admin where applicable; add per-actor reads and mutations for every target table plus analytics, AFIP comprobantes, Pagos, Unidad photos, contracts, function grants, legacy-policy absence, lifecycle replay/rollback, scope replacement, audit immutability and concealment; real execution separately BLOCKED until Docker/Supabase is available (T084 contradicted)
- [x] T092 make Gestor invitation creation and its required `crear_invitacion` Log de acciones append one database transaction/RPC, including duplicate/conflict checks and durable notification/outbox intent as specified; remove the post-commit `ActionLogService.logAction` path that can leave an unaudited invitation when logging fails, and add rollback/failure tests per FR-020 and SC-006 (T083 partial)
- [x] T093 make `apps/web/e2e/delegado_scope_authorization.spec.ts` terminate cleanly with exit code 0 after the summary: own exactly one deterministic mock API lifecycle, remove the suite/global double-start and permissive `EADDRINUSE` resolution, close idle/all connections with bounded teardown, eliminate dependency on cached `e2e/.auth/user.json` or real OTP, and install strict page-error/console-error/request-failure handling with an explicit allowlist so unexpected failures fail the test per Constitution V and T086/T090 (contradicts)
- [x] T094 correct the retained visual defects per SC-007: UI-008/UI-009/UI-010 dark-mode dialog text and disabled/selected states must meet AA contrast; UI-009 at 375 must visibly prove the selected Grupo, summary and reachable confirmation; UI-017 at 375 must keep the dialog title, close control and success state inside the viewport without clipping; rerun all affected viewports/themes and retain objective contrast/overflow assertions (T088 partial)
- [x] T095 implement a product-owned safe 403/access-changed feedback state for stale/direct Delegado mutations and make UI-015 trigger that application path; delete the test-only `document.createElement`/`innerHTML` banner fabrication so retained pixels prove shipped behavior per FR-019, SC-003 and Constitution I (T087 contradicted)
- [x] T096 extend the mobile touch-target audit so every accepted `label` or `[data-touch-target]` wrapper is proven to be semantically associated and to focus/activate its intended control; geometry alone may not exempt a small actionable element, and diagnostics must retain selector, action and dimensions per Constitution V (T089 partial)
- [x] T097 rerun API lint/tests/build, web lint/build and the feature Playwright suite after T091–T096; require a real Playwright exit code 0, exactly 176 fresh captures and Codex-reviewable contact sheets; update `web-playwright-validation.md`, `database-validation.md`, visual manifest, traceability, cleanup ledger, `ESTADO-REAL.md` and delivery report with the actual UI-015 behavior, 85-plan status, separate responsive/desktop results and Docker-only execution blocker; remove only exact task-owned processes/traces/superseded reviewer outputs (T090 contradicted)

---

## Phase 13: Convergence Pass 5 — Live Database Gate

**Purpose**: Resolve defects exposed only after Carlos enabled Docker and Codex executed a real local
Supabase reset plus pgTAP. The external blocker is removed; authored assertions and authoritative RPC
boundaries must now pass against PostgreSQL rather than remain documented as ready.

- [x] T098 CRITICAL correct `supabase/tests/004_delegado_scope_authorization.sql` from the real `supabase test db` failure at line 71 (`isnt(integer, integer, boolean, unknown)` does not exist), replace the role-switch helper with a PostgreSQL-valid explicit privileged `RESET ROLE`/claims/`SET LOCAL ROLE` pattern outside a `SECURITY DEFINER` function, and iteratively rerun a fresh local reset plus pgTAP until the declared plan and executed assertions match with 121/121 passing; every subsequent SQL, fixture, privilege, RLS, Storage, RPC or count failure discovered by the live run must be fixed rather than hidden or removed per FR-028 and Constitution I/V (T091 contradicted)
- [x] T099 CRITICAL harden `create_delegado_invitation` as an authoritative direct-RPC boundary per FR-001/FR-002/FR-017: require the caller to be the Gestor owner (not merely any non-Delegado role), derive and lock the target's canonical email/account identity server-side, require the matching `auth.users` account to be registered and verified, and never trust `p_email` as delivery identity; update the API caller/signature and add live pgTAP plus API tests for public-user/admin/non-owner caller denial, mismatched crafted email, unverified target and valid verified target (T092 partial)
- [x] T100 rerun `supabase db reset`, `supabase test db`, API lint/tests/build and the feature's affected web gates after T098–T099; update database validation, security review, traceability, cleanup ledger, tasks and `ESTADO-REAL.md` with exact live counts and remove the obsolete Docker blocker; either add the configured `supabase/seed.sql` intentionally or disable the missing seed path so a clean reset has no false warning, then return terminal PASS only if every required gate exits 0 (Constitution I/V/VII partial)

---

## Phase 14: Convergence Pass 6 — pgTAP Assertion Repair

**Purpose**: Repair only the five test-harness failures exposed by Codex's independent live run after
Phase 13 changes. The reset and 116/121 assertions pass; product RLS must not be weakened to satisfy
incorrect exception expectations.

- [x] T101 CRITICAL clear the fixture-only `rendo.allow_user_mutation` bypass immediately after fixture creation, test the two delegation CHECK constraints from the privileged test role using existing valid fixture rows, and restore explicit claims/role before the next actor assertion; do not add direct client mutation policies or weaken RLS
- [x] T102 replace the incorrect exception expectations for RLS-filtered UPDATE/DELETE with assertions that prove zero affected rows plus privileged state preservation; exercise `protect_user_fields` against the authenticated actor's own visible row so a sensitive-field update reaches the trigger and is rejected, and perform the final revoked-user state read after `RESET ROLE`
- [x] T103 rerun a fresh `supabase db reset` and `supabase test db` until exactly 121/121 pass with exit 0, then run API lint/all tests/build and update every Phase 13 report/task/status from actual command output; no screenshots or application behavior changes are authorized in this correction batch

---

## Phase 15: Convergence Pass 7 — Visual Truth and Clean Playwright Exit

**Purpose**: Correct the final contradictions found by Codex while visually inspecting all 22 freshly
regenerated contact sheets and independently running the feature suite. Database/API gates are
already green; Docker is not required for this phase.

- [x] T104 CRITICAL make the direct Playwright command terminate naturally with exit code 0 after 22/22 tests on Windows and leave no listener/process on ports 3000/3001; remove the `npm run dev` shell/process-tree leak and do not use `reuseExistingServer: true` as evidence of deterministic ownership
- [x] T105 CRITICAL correct the shipped dialog/UI evidence at 375/768/1024/1440 light/dark: shared dialog surface and text must remain AA-legible in dark mode (especially UI-002, UI-003, UI-008–UI-010 and UI-017), UI-009 at 375 must preserve and visibly prove the selected Grupo, its summary and reachable confirmation in one capture, and UI-017 at 375 must keep title, close control and success content inset within the viewport with no clipped text
- [x] T106 rerun the feature suite to a real terminal exit 0, retain exactly 176 fresh screenshots, regenerate all 22 canonical contact sheets, and update the visual/playwright/delivery/status reports only from the final run; any hang, stale state, clipped dialog or low-contrast capture is FAIL rather than PASS
- [x] T107 repair the independently reproduced UI-017 geometry failure (`dialogBox.x = -34.4921875` at 375px): component `max-w-lg` must not replace the shared viewport-safe maximum; prove the dialog, title and 44x44 close action remain inset in both themes with the existing bounding-box assertions
- [x] T108 eliminate the remaining post-suite hang before final rerun: move or close any test-worker-owned server/handle so Playwright reaches its summary and shuts down the known wrapper/Next process naturally; retain PID-scoped cleanup only and never kill arbitrary port owners
