# Tasks: Auth Guard Hardening

**Input**: Design documents from `specs/002-auth-guard-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Security regression tests are mandatory and must be written before the corresponding
implementation. Fresh targeted tests, full API tests, build, and source review are acceptance gates.

**Organization**: Tasks are grouped by user story. Every task has one concrete repository output
and evidence path.

## Phase 1: Setup (Evidence and Workspace Protection)

**Purpose**: Establish exact batch ownership before changing shared authentication code.

- [x] T001 Record pre-change Git status, allowed changed files, task-owned temporary paths, and cleanup ownership in specs/002-auth-guard-hardening/evidence/reports/cleanup.md
- [x] T002 [P] Record the guard's protected-controller consumers, sole JwtModule/JwtService dependency, and audited bypass baseline without exposing environment values in specs/002-auth-guard-hardening/evidence/reports/security-review.md

---

## Phase 2: User Story 1 - Reject Untrusted Credentials (Priority: P1) MVP

**Goal**: Missing, malformed, arbitrary, decode-only, role-containing, and provider-failure
credentials are denied without constructing a fallback identity.

**Independent Test**: Run only the US1 cases in the focused guard suite and confirm every bypass
variant throws HTTP 401, leaves `request.user` unset, and never invokes a protected handler.

### Tests for User Story 1

- [x] T003 [US1] Write failing-first tests for FR-001 through FR-004 and FR-010 covering missing/wrong/malformed headers, arbitrary long values, role substrings, JWT-shaped values, provider error/no-user/throw/timeout, request-context absence, and non-disclosure in apps/api/src/auth/supabase-auth.guard.spec.ts

### Implementation for User Story 1

- [x] T004 [US1] Replace decode-only and heuristic fallback behavior with strict Bearer parsing, SupabaseService authoritative validation, fail-closed errors, and generic denial in apps/api/src/auth/supabase-auth.guard.ts
- [x] T005 [US1] Remove the unused JwtModule/JwtService/SUPABASE_JWT_SECRET auth wiring and import the existing SupabaseModule explicitly in apps/api/src/auth/auth.module.ts

**Checkpoint**: The audited arbitrary-token P0 is closed even before positive identity enrichment.

---

## Phase 3: User Story 2 - Resolve Canonical Operational Identity (Priority: P2)

**Goal**: Accepted Gestor and Delegado requests use only a validated account plus active canonical
profile for role and workspace assignment.

**Independent Test**: Controlled valid Gestor and Delegado provider/profile responses produce the
exact minimal request context; absent, deleted, unsupported, or invalid workspace profiles fail.

### Tests for User Story 2

- [x] T006 [US2] Extend apps/api/src/auth/supabase-auth.guard.spec.ts with failing-first tests for FR-005 through FR-007 covering canonical Gestor/Delegado success, metadata/email non-authority, missing/deleted/unsupported profiles, Gestor cross-workspace rejection, and Delegado missing/self workspace rejection

### Implementation for User Story 2

- [x] T007 [US2] Add minimal typed authenticated context, canonical profile lookup, supported-role validation, deleted-profile denial, and role-specific workspace invariants in apps/api/src/auth/supabase-auth.guard.ts

**Checkpoint**: Valid operational users are accepted with canonical tenant context and no heuristic
authorization source.

---

## Phase 4: User Story 3 - Use Explicit Local Demo Authentication (Priority: P3)

**Goal**: Current deterministic local actors remain usable only with explicit non-production opt-in
and exact credential grammar.

**Independent Test**: Every documented exact format succeeds in enabled development/test; the same
values fail when disabled, in production/other environments, or after any malformed variation.

### Tests for User Story 3

- [x] T008 [US3] Extend apps/api/src/auth/supabase-auth.guard.spec.ts with failing-first tests for FR-008 and FR-009 covering both gates, four fixed compatibility tokens, generated Gestor/Delegado/Buscador UUID tokens, exact actor/workspace mappings, malformed variants, unsupported roles, and provider bypass behavior

### Implementation for User Story 3

- [x] T009 [US3] Implement the explicit runtime gate and anchored local demo parser exactly as specified in specs/002-auth-guard-hardening/contracts/auth-behavior.md within apps/api/src/auth/supabase-auth.guard.ts
- [x] T010 [US3] Document `AUTH_ALLOW_DEV_TOKENS`, allowed runtimes, exact local token formats, security warning, and default-disabled behavior in apps/api/README.md

**Checkpoint**: Offline development compatibility exists without a deployable authentication
fallback.

---

## Phase 5: Final Verification, Review, and Cleanup

**Purpose**: Produce reproducible proof, reconcile requirements, and leave no batch trash.

- [x] T011 Run the focused command from specs/002-auth-guard-hardening/quickstart.md and record timestamps, exit code, pass/fail/skip counts, and case inventory in specs/002-auth-guard-hardening/evidence/runs/targeted-tests.md
- [x] T012 Run the full API suite and record timestamps, exit code, pass/fail/skip counts, and any pre-existing failure separately in specs/002-auth-guard-hardening/evidence/runs/full-api-tests.md
- [x] T013 Run the API production build and prohibited-pattern searches, recording exact commands, exit codes, and interpreted results in specs/002-auth-guard-hardening/evidence/runs/api-build.md
- [x] T014 Map FR-001 through FR-013 and the mandatory regression matrix to implementation/tests, finalize residual risks in specs/002-auth-guard-hardening/evidence/reports/security-review.md, and write contract-compliant specs/002-auth-guard-hardening/evidence/delivery.json
- [x] T015 Remove only task-owned temporary files and processes, verify no credential/secret/provider payload entered evidence, finalize specs/002-auth-guard-hardening/evidence/reports/cleanup.md, and mark only evidence-backed tasks complete in specs/002-auth-guard-hardening/tasks.md

---

## Dependencies & Execution Order

- T001 and T002 establish the protected baseline.
- T003 must precede T004 and T005; its bypass tests must demonstrate failure against the old guard.
- T006 must precede T007.
- T008 must precede T009 and T010.
- T011 through T015 depend on all selected user stories and execute in numeric order.
- User Story 1 is the security MVP. User Stories 2 and 3 complete safe positive and local workflows;
  the feature is not accepted without all three.

## Parallel Opportunities

- T002 can run alongside T001 because it writes a separate report section/file state.
- After T005, US2 and the documentation portion of US3 can be researched in parallel, but tests and
  implementation sharing the guard/spec files must be serialized to avoid conflicting edits.
- Verification commands T012 and T013 may run in parallel only if the package manager/build output
  remains deterministic; evidence files are separate.

## Implementation Strategy

1. Establish scope and dirty-tree ownership.
2. Close negative paths first and prove the old bypass test fails before implementation.
3. Add canonical positive identities without metadata or email authority.
4. Add the doubly gated exact local compatibility path.
5. Run the complete validation matrix, review security properties, and clean only batch-owned trash.

## Format Validation

All 15 tasks use the required checkbox, sequential ID, optional parallel marker, story label where
applicable, concrete action, and exact repository path.

---

## Phase 6: Codex Review Corrections

**Purpose**: Resolve the defects found in the terminal delivery before acceptance.

- [x] T016 [US1] Implement one exact generic UnauthorizedException response for missing, malformed, provider, profile, and demo failures and add exact-message assertions in apps/api/src/auth/supabase-auth.guard.ts and apps/api/src/auth/supabase-auth.guard.spec.ts
- [x] T017 [US3] Enforce exact lowercase generated demo prefix/role grammar while retaining valid UUID hex handling, add uppercase/mixed-case rejection tests in apps/api/src/auth/supabase-auth.guard.spec.ts, and correct apps/api/README.md
- [x] T018 Replace avoidable explicit any usage with typed test doubles, unknown narrowing, and narrow framework casts without changing behavior in apps/api/src/auth/supabase-auth.guard.spec.ts
- [x] T019 Rerun the focused suite, full API suite, build, and prohibited-pattern/type searches, then update specs/002-auth-guard-hardening/evidence/runs/, specs/002-auth-guard-hardening/evidence/reports/security-review.md, specs/002-auth-guard-hardening/evidence/reports/cleanup.md, and specs/002-auth-guard-hardening/evidence/delivery.json with fresh evidence

The feature remains unaccepted until T016-T019 are complete and independently reviewed.
