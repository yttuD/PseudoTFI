# Antigravity Correction Brief 01

Feature: `004-delegado-scope-authorization`

## Runtime contract

- Model: `gemini-3.8-flash-medium`
- Effort: `medium`
- Work independently until a terminal `PASS`, `PARTIAL`, or `FAIL` result.
- Do not stop after writing code. Run the applicable validation and produce retained evidence.
- Preserve every unrelated dirty-tree change. Do not use destructive Git commands.
- Do not inspect or modify files outside this workspace.
- Remove only temporary artifacts created by this feature/batch after verifying exact paths.
- Do not claim native Android implementation or physical-device validation.

## Governing sources

Read completely before editing:

1. `.specify/memory/constitution.md`
2. `specs/004-delegado-scope-authorization/spec.md`
3. `specs/004-delegado-scope-authorization/plan.md`
4. `specs/004-delegado-scope-authorization/data-model.md`
5. `specs/004-delegado-scope-authorization/contracts/authorization-matrix.md`
6. `specs/004-delegado-scope-authorization/contracts/ui-state-matrix.md`
7. `specs/004-delegado-scope-authorization/contracts/openapi.yaml`
8. `specs/004-delegado-scope-authorization/quickstart.md`
9. `specs/004-delegado-scope-authorization/tasks.md`, especially Phase 9 tasks T056-T067

The supplied Rendo palette and Constitution 1.1.0 override obsolete palette or dark-mode statements
elsewhere. Preserve public marketplace, operational Gestor/Delegado, and dev/admin as separate trust
surfaces. Responsive web is not native Android evidence.

## Why the first batch was rejected

The first process exited 0 but did not provide the required terminal report. Codex independently
found the following blocking defects:

1. `supabase/migrations/20260925120000_delegado_scope_authorization.sql` permits a user to UPDATE
   their own `users` row without protecting `rol` or `workspace_id`; it also permits a Delegado to
   INSERT/UPDATE `delegaciones` and broadly UPDATE invitations. This enables privilege/scope
   escalation through direct Supabase access.
2. Invitation acceptance, configuration replacement, and revocation in
   `apps/api/src/delegados/delegados.service.ts` use multiple non-transactional admin-client writes.
3. `apps/web/src/lib/supabase/middleware.ts` and `apps/web/src/app/[locale]/dev/layout.tsx` accept
   unsigned base64 cookie identity fallbacks. Several pages infer roles from email substrings, fixed
   UUIDs, metadata, or default Gestor behavior when authorization is unavailable.
4. `/dev/logs` was visible to a Delegado and contains global mock records. Every `/dev/*` route must
   require an explicit authoritative `admin` or `dev` role and fail closed.
5. Private metrics still use `resilientStore`; Facturación and Cupo contain fabricated fallback
   data. Protected failures may not return mock or workspace-wide data.
6. `ActionLogService` exists but is not integrated into the required operational mutations.
7. `supabase/tests/004_delegado_scope_authorization.sql` does not exercise the complete actor/table/
   storage matrix. Current API tests are heavily mocked and do not prove integrated enforcement.
8. The Playwright suite uses forged JWT/cookie shortcuts, global Gestor auth, and conditional
   assertions. Only UI-012, 013, 015, 017, 018, 019, 020, 021, and 022 produced captures. UI-001
   through UI-011, UI-014, and UI-016 are absent.
9. Codex inspected all 80 retained screenshots. UI-012 shows login; UI-013 exposes Cupo,
   Facturación, and create actions to Delegado Ver; UI-015 exposes mutation actions; UI-017 is a
   Next error; UI-018 is blank; UI-019 exposes Delegado administration; UI-021 exposes the dev
   console; UI-022 is a normal owner screen rather than a fail-closed error. Only UI-020 appears
   directionally valid.
10. `visual-manifest.md` is empty and all required validation/security/traceability/cleanup/delivery
    reports are absent. Original tasks remain unchecked.

## Mandatory execution order

### A. Security boundary first: T056-T060

- Replace sensitive direct table writes with least privilege. Authenticated clients must not be able
  to assign `rol`, `workspace_id`, delegation state, permission, scope, invitation target, or owner.
- Implement atomic, schema-qualified transitions with `SECURITY DEFINER SET search_path = ''` where
  appropriate. Verify actor identity authoritatively (`auth.uid()` or the already validated API
  principal), constrain EXECUTE grants, lock rows for replay/concurrency safety, validate old/new
  state, and return controlled results.
- Invitation lookup must prove an existing non-deleted and email-verified account. Never disclose a
  full target profile on rejection.
- Services must use the atomic transition seam and check every Supabase `{ error }`. No partial
  success is allowed.
- Remove unsigned cookie parsing and production identity fabrication. A local test adapter is
  allowed only when explicitly enabled in `development`/`test`, isolated from production paths, and
  unable to bypass API/RLS acceptance evidence.
- Require an authoritative explicit `admin` or `dev` role for `/dev/*`; Gestor and Delegado are not
  sufficient. Do not fetch or render protected content before the decision.
- `getServerAccessContext()` returning `null` or timing out must render a localized retryable denied
  state. It must never become owner access.
- Remove private `resilientStore`, default-user, fabricated Cupo/Facturación, and mock-success
  fallback behavior from every protected path in scope.

Write focused red tests before each correction, then make them green.

### B. Enforcement completeness: T061-T063

- Integrate immutable action logging for delegation lifecycle plus every covered Unidad, Grupo,
  Alquiler, and Inquilino mutation. Record canonical actor, workspace, resource, action, and safe
  metadata. A Delegado cannot read the complete log.
- Add integrated API tests for old and new target authorization, scope replacement, revoked/stale
  actors, cross-workspace concealment, Grupo membership boundaries, Alquiler-derived access, and
  shared-Inquilino privacy. Mocking `AuthorizationService` is not acceptance proof.
- Build the full pgTAP actor-by-table-and-storage matrix from T063. If Docker/Supabase is unavailable,
  record the exact blocker and result as `PARTIAL`; never relabel static inspection or mocks as RLS
  PASS.

### C. Functional and visual correction: T064-T065 and T067

- Rebuild the feature Playwright suite with deterministic actors. Use authoritative seeded local
  accounts when available. Any explicitly gated test adapter must still exercise real server route
  decisions and may not stand in for database RLS evidence.
- Remove `if (locator.count() > 0)` and equivalent optional assertions for required UI.
- Every UI-001 through UI-022 journey must assert its named state before capture. A screenshot is
  invalid when the page is login, blank, a framework error, the wrong actor, or the wrong state.
- Verify separate responsive web widths 375 and 768, desktop widths 1024 and 1440, light and dark.
- Fix the specific rejected states listed above. Delegado Ver must have no mutation affordances.
  Owner-only routes must show a localized forbidden/redirect state without protected-content flash.
  Concealed 404 and retryable fail-closed errors must be visible and accessible.
- Verify keyboard operation, focus return, dialog labels, 44x44 targets, AA contrast, no horizontal
  overflow, and reduced-motion behavior.
- Correct mojibake and provide ES/PT/EN copy for the affected operational states. Dev console may
  remain Spanish-only.
- Delete/replace only the invalid screenshots inside this feature evidence directory after the new
  assertions pass. Keep reviewer contact sheets unless replacing them with an updated complete set.

### D. Evidence and truthful status: T066

Run using the project-installed binaries when pnpm store-version prompts interfere. Codex verified
that these paths are available:

- `apps/api/node_modules/.bin/oxlint.CMD`
- `apps/api/node_modules/.bin/vitest.CMD`
- `apps/api/node_modules/.bin/nest.CMD`
- `apps/web/node_modules/.bin/next.CMD`
- `apps/web/node_modules/.bin/playwright.CMD`

At minimum retain:

- `evidence/test-results/api-validation.md`
- `evidence/test-results/database-validation.md`
- `evidence/test-results/web-playwright-validation.md`
- Playwright HTML/report artifacts needed to reproduce failures and counts
- `evidence/reports/visual-manifest.md` with one row per retained capture
- `evidence/reports/security-review.md`
- `evidence/reports/traceability.md`
- `evidence/reports/cleanup-ledger.md`
- `evidence/reports/antigravity-delivery.md`

Update `ESTADO-REAL.md` and the remediation roadmap only with executable evidence. Keep feature 003
blocked unless this feature achieves actual final acceptance. Mark task checkboxes only when the
task has source plus current retained evidence.

## Required validation

1. API lint, focused security tests, full API test suite, API production build.
2. Fresh local Supabase reset and complete pgTAP feature tests when the environment supports it.
3. Web production build.
4. Playwright feature suite for UI-001 through UI-022 with exact passed/failed/skipped counts.
5. Visual review by Antigravity before delivery: reject and fix any wrong-route, blank, clipped,
   overflowing, framework-error, protected-flash, or actor-inconsistent capture.
6. Security scan for credentials, unsafe definer functions/grants, missing RLS, body-supplied
   authority, hardcoded actor inference, and protected fallbacks.

## Terminal delivery contract

Your final terminal response and `evidence/reports/antigravity-delivery.md` must contain:

- exactly one result: `PASS`, `PARTIAL`, or `FAIL`;
- changed-file list grouped by security/database, API, web, tests, and evidence;
- exact commands, versions, exit codes, test counts, failures, and skips;
- explicit local Supabase/RLS status;
- screenshot counts by UI ID, viewport class, and theme;
- migration and rollback/forward-fix considerations;
- unresolved defects and external blockers;
- cleanup performed with exact paths;
- confirmation that no native Android validation was claimed.

`PASS` is forbidden if any critical finding remains, any required screenshot is absent/invalid, the
feature Playwright suite is red, or the database/RLS matrix was not executed successfully.
