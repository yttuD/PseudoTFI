# Tasks: Closed Beta Deployment Readiness

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/release-gates.md`, `quickstart.md`

**Rule**: A checked task needs a fresh result or exact artifact. No actual deployment, real payment or fiscal issuance belongs to this feature.

## Phase 1: Setup

- [x] T001 Define beta scope and acceptance contracts in `specs/006-closed-beta-readiness/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/release-gates.md` and `quickstart.md`
- [x] T002 Record current release blockers and protected user changes in `specs/006-closed-beta-readiness/evidence/release-audit.md`

## Phase 2: Foundational

- [x] T003 Add release-configuration negative tests in `apps/api/src/config/release-readiness.spec.ts` and a focused web configuration check in `apps/web/e2e/`
- [x] T004 Enforce required production settings and remove embedded database keys in `apps/api/src/supabase/supabase.service.ts` and `apps/web/next.config.mjs` (FR-001–FR-003)
- [x] T005 Restrict deployed API browser origins in `apps/api/src/main.ts` with exact-origin configuration and negative checks (FR-001, FR-004)

## Phase 3: User Story 1 — Honest public beta (P1)

**Independent Test**: Healthy isolated catalog shows only persisted seed data; outage shows explicit error and no fake saved state.

- [x] T006 [US1] Add outage/empty distinction tests in `apps/api/src/marketplace/marketplace.service.spec.ts`, `apps/api/src/favoritos/favoritos.service.spec.ts` and `apps/web/e2e/closed_beta_public.spec.ts`
- [x] T007 [US1] Make hosted Supabase health/probe configuration correct in `apps/api/src/supabase/supabase.service.ts` without hard-coded local reachability (FR-001, FR-003)
- [x] T008 [US1] Disable production synthetic fallback in `apps/api/src/marketplace/marketplace.service.ts` and `apps/api/src/favoritos/favoritos.service.ts` (FR-003)
- [x] T009 [US1] Remove release-mode example listing from `apps/web/src/app/[locale]/(marketplace)/unidades/page.tsx` and show distinct empty/error copy (FR-003)

## Phase 4: User Story 2 — Safe operational beta (P1)

**Independent Test**: Actor scope and denied commercial actions are tested with zero real external effects.

- [ ] T010 [US2] Add owner/delegate/public direct-ID and denial regression in `apps/api/src/authorization/authorization-matrix.spec.ts` and `apps/web/e2e/closed_beta_security.spec.ts` (FR-004)
- [x] T011 [US2] Add disabled-commerce tests in `apps/api/src/pagos/pagos.service.spec.ts` and `apps/api/src/afip/afip.service.spec.ts` (FR-005)
- [x] T012 [US2] Enforce beta payment/fiscal mutation gates and remove fake payment success in `apps/api/src/pagos/` and `apps/api/src/afip/` (FR-005)
- [x] T013 [US2] Prevent internal mock content from appearing in a release build under `apps/web/src/app/[locale]/dev/` (FR-003, FR-004)
- [ ] T014 [US2] Reconcile Feature 005 critical/high findings and owner-only visual/security states in `specs/006-closed-beta-readiness/evidence/security-review.md` (FR-004, FR-009)

## Phase 5: User Story 3 — Reproducible release handoff (P2)

**Independent Test**: A fresh isolated configuration can pass preflight and produce an actionable, non-secret release report without deploying.

- [x] T015 [US3] Add a read-only beta configuration preflight in `scripts/closed-beta-preflight.ps1` and tests in `scripts/tests/` (FR-001, FR-002)
- [x] T016 [US3] Add non-sensitive API liveness/readiness endpoints and tests in `apps/api/src/` (FR-006)
- [x] T017 [US3] Document exact release settings, tester identities and data policy in `apps/api/.env.example`, `apps/web/.env.example` and `specs/006-closed-beta-readiness/evidence/handoff.md` (FR-002, FR-008, FR-010)
- [x] T018 [US3] Verify isolated Rendo migrations, data policies and safe seed strategy with results in `specs/006-closed-beta-readiness/evidence/database.md` (FR-007)
- [ ] T019 [US3] Run targeted production build/security checks and Playwright screenshots for every changed view at desktop and responsive widths in `specs/006-closed-beta-readiness/evidence/` (FR-009)
- [x] T020 [US3] Publish PASS/BLOCKED candidate verdict, provider-dependent inputs and rollback steps in `specs/006-closed-beta-readiness/evidence/final-review.md` (FR-010)

## Dependencies & Execution Order

- Setup → Foundational → US1 and US2 → US3. Security/commerce fixes precede a candidate verdict.
- Feature 005's pending critical/high findings are an external acceptance gate, not silently inherited as PASS.
- Tests precede changed behavior; no production-only failure may be relabeled as a passing local mock.

## Parallel Opportunities

- T006 and T010 can be authored independently after T003–T005; T015 and T017 can be prepared while browser checks run.
- Do not run database reset concurrently with browser matrices on a memory-limited host.

## Implementation Strategy

First close silent fake-data and credential hazards, then non-commercial gates and authorization, then preflight, visual verification and handoff. Actual deployment is a separate Carlos-approved action.
