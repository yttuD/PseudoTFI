# Antigravity Correction Brief 11 — Evidence Reconciliation and Feature 004 Closure

Use `gemini-3.8-flash-medium` at `medium` effort. Work only in the current Rendo repository.
This is a bounded closeout batch for feature `004-delegado-scope-authorization`; it is not a new
product redesign and it does not authorize native Android work.

## Governing sources

Read completely before acting:

- `.specify/memory/constitution.md`
- `specs/004-delegado-scope-authorization/spec.md`
- `specs/004-delegado-scope-authorization/plan.md`
- `specs/004-delegado-scope-authorization/tasks.md`
- `specs/004-delegado-scope-authorization/data-model.md`
- `specs/004-delegado-scope-authorization/contracts/authorization-matrix.md`
- `specs/004-delegado-scope-authorization/contracts/ui-state-matrix.md`
- `specs/004-delegado-scope-authorization/quickstart.md`

Current source and executable output outrank stale reports. Preserve all unrelated dirty-tree work.

## Objective

Reconcile the completed implementation with fresh executable evidence and close T001–T108 only
where the current repository proves them. Remove obsolete Docker-blocked/PARTIAL claims after a
real local database pass. Finish with one internally consistent PASS or a precise FAIL; a report
may not claim more than the commands and retained pixels prove.

## Required validation sequence

Run sequentially to control memory:

1. `pnpm exec supabase db reset`
2. `pnpm exec supabase test db supabase/tests/004_delegado_scope_authorization.sql`
   - Required: exactly 121 planned/executed assertions, all successful, exit code 0.
3. API lint, complete Vitest suite, and production build.
   - Required current baseline: 21 test files and 173 tests, all passing; lint/build exit 0.
4. Web lint and production build, both exit 0.
5. `pnpm --filter web exec playwright test e2e/delegado_scope_authorization.spec.ts`
   - Required: 22/22 passed, natural exit code 0, zero listeners on 3000/3001 afterward.
   - Required evidence: exactly 176 newly generated screenshots and 22 regenerated canonical
     contact sheets under the feature evidence directories.

Do not hide failures, weaken assertions, remove coverage, use an existing unrelated server, or kill
arbitrary port owners. If a product or test defect appears, stop with FAIL and report the exact
defect; do not expand this closeout batch into unrelated implementation.

## Visual truth requirements

Playwright is mandatory for visual claims. Confirm from the final captures:

- 375 and 768 are responsive-web dispositions; 1024 and 1440 are desktop-web dispositions.
- Both light and dark themes use the current Rendo palette from the constitution.
- UI-002, UI-003, UI-008–UI-010 and UI-017 dialog surfaces/text remain legible in both themes.
- UI-009 at 375 visibly retains the Grupo selection, `Edificio Torre Norte` summary and reachable
  confirmation.
- UI-017 at 375 keeps dialog, title, 44x44 close control and success content inside the viewport.
- Native Android quality is not claimed.

## Documentation and task reconciliation

After every required command passes, update only the following closeout artifacts from exact output:

- `specs/004-delegado-scope-authorization/tasks.md`
- `specs/004-delegado-scope-authorization/evidence/test-results/database-validation.md`
- `specs/004-delegado-scope-authorization/evidence/test-results/api-validation.md`
- `specs/004-delegado-scope-authorization/evidence/test-results/web-playwright-validation.md`
- `specs/004-delegado-scope-authorization/evidence/reports/security-review.md`
- `specs/004-delegado-scope-authorization/evidence/reports/traceability.md`
- `specs/004-delegado-scope-authorization/evidence/reports/cleanup-ledger.md`
- `specs/004-delegado-scope-authorization/evidence/reports/antigravity-delivery.md`
- `specs/004-delegado-scope-authorization/evidence/reports/visual-manifest.md` only if the final
  filenames/statuses changed
- `specs/001-brownfield-system-audit/evidence/reports/remediation-roadmap.md`
- `ESTADO-REAL.md`

Rules:

- Mark T001–T108 `[x]` only after confirming each task's resulting artifact/behavior still exists
  and the final gates support it. Remove stale `[BLOCKED: Host Docker daemon unavailable]` labels.
- Record 121/121 database, current API count, 22/22 Playwright, 176 screenshots and 22 contact
  sheets only when reproduced in this run.
- Replace every obsolete `PARTIAL`/Docker-blocked statement in the allowed closeout artifacts.
- Preserve historical defect descriptions in task text; change only checkbox/blocker status unless
  a factual result line must be corrected.
- State explicitly that feature 004 is accepted while the overall Rendo product and native Android
  remain separate future scopes.

## Cleanup

Remove only exact task-owned transient artifacts after evidence is retained: Playwright traces,
temporary report output, `.last-run.json`, stale run-owned PID/stop markers, and processes/listeners
created by this batch. Do not delete retained screenshots/contact sheets, source assets, dependency
stores shared by the repository, unrelated scratch directories, Docker volumes, or user data.

## Terminal delivery format

Return exactly one terminal report containing:

1. `STATUS: PASS` or `STATUS: FAIL`.
2. Files changed.
3. Exact commands, exit codes, test counts and durations.
4. Screenshot/contact-sheet counts and review result by responsive versus desktop.
5. Task reconciliation count (`done/total`, unchecked IDs if any).
6. Remaining listeners/processes and cleanup performed.
7. Residual risks or blockers.

Completion criterion: feature 004 has no unchecked tasks, every required gate is freshly green,
the retained reports agree with the executable evidence, and only intended local Rendo services
remain running.
