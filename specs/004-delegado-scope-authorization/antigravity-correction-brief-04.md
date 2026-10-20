# Antigravity Correction Brief 04

Implement only Phase 12 (T091–T097) in one terminal batch with
`gemini-3.8-flash-medium`, medium effort. Read `.specify/memory/constitution.md`, this feature's
`spec.md`, `plan.md`, `data-model.md`, `contracts/authorization-matrix.md`,
`contracts/ui-state-matrix.md`, Phase 12 of `tasks.md`, and this brief before editing. Current source
and fresh executable output override every existing report.

## Outcome

Finish every non-environment-blocked correction in T091–T097. Return `PARTIAL` only when all authored
code, tests, visuals, documentation, and cleanup are complete and the sole remaining blocker is the
real Docker/Supabase execution gate. The current pgTAP source is defective and may not be labeled
ready merely because Docker is unavailable.

## Required corrections

### 1. Executable database matrix and atomic invitation audit

- Replace `set_test_actor` with a safe pgTAP actor-switch pattern that restores the privileged test
  role before selecting `anon` or `authenticated`; set the Supabase JWT claims used by `auth.uid()`.
- A revoked `EXECUTE` privilege must be tested as permission denied, not by directly calling the
  function and expecting `false`.
- Exercise real reads and allowed/denied mutations for every actor/resource named by T091, including
  `storage.objects`, analytics, `afip_comprobantes`, `pagos`, direct sensitive writes, helper/RPC
  grants, scope replacement, replay/rollback, audit immutability, and concealed cross-workspace
  access. The declared plan count must equal the assertions that actually execute.
- Move Gestor invitation creation, durable notification/outbox intent, and `crear_invitacion` audit
  append into one authenticated `SECURITY DEFINER SET search_path = ''` transaction/RPC. Derive the
  actor from `auth.uid()`, lock/check conflicts inside the transaction, and remove the post-commit
  application log. Add rollback and actor-attribution tests.
- Keep database execution `BLOCKED` unless a real local reset and pgTAP run succeeds. Static review
  or unit mocks are not database acceptance.

### 2. Deterministic Playwright lifecycle and shipped denial feedback

- Own one mock API server lifecycle. Remove the simultaneous global and suite start/stop paths.
  Reject port collisions, track sockets, close idle/all connections, and use a bounded teardown that
  produces a real runner summary and exit code 0.
- A clean checkout must not depend on cached `e2e/.auth/user.json`, a real OTP, or an external login.
  Use the explicit non-production adapter for deterministic fixtures.
- Install shared strict handlers for `pageerror`, unexpected console errors, and failed requests.
  Maintain a narrow documented allowlist only for intentional failures under test.
- UI-015 must use application code to display the safe 403/access-changed state. Remove all test DOM
  fabrication (`document.createElement`, `innerHTML`, test-injected visual banners).
- A 44x44 wrapper exemption counts only when the test proves the wrapper's semantic association and
  that activating it focuses/toggles/invokes the intended control.

### 3. Visual acceptance

The Rendo constitution and supplied palette override any generic skill statement that dark mode is
out of scope. Use the existing Rendo tokens. At 4.5:1 minimum text contrast:

- repair UI-008/UI-009/UI-010 permission-dialog text, cards, selected and disabled states in dark;
- make UI-009 at 375 visibly show the selected Grupo, readable summary, and reachable confirmation;
- keep UI-017's title, close control, and success feedback inside 375 without horizontal clipping.

Playwright must assert contrast/overflow and retain fresh captures for 375/768 responsive web and
1024/1440 desktop web, light and dark. Generate exactly eight PNGs for each UI-001 through UI-022.

## Allowed scope

Application changes are limited to the feature's delegation migration/pgTAP, Delegados API flow and
its authorization/audit tests, the feature Playwright fixtures/config/suite, and components directly
needed for UI-008–UI-010, UI-015, and UI-017. Documentation changes are limited to Phase 12 status,
the feature evidence reports/manifests/ledger/traceability, and `ESTADO-REAL.md`. Preserve unrelated
dirty-tree work. Do not change the constitution, feature spec, plan, native Android implementation,
environment files, deployment configuration, billing behavior, or production data.

## Terminal gates

Run and record exact outputs for:

1. API lint, all API tests, and API build.
2. Web lint and production build.
3. Feature Playwright suite: 22/22, exact 176 PNGs, no unexpected network/page/console errors, printed
   final summary, exit code 0, and no listeners/processes left on ports 3000/3001.
4. Real Supabase reset/pgTAP only if Docker is available; otherwise retain an honest blocker.
5. Visual self-review of all 22 contact sheets, separated into responsive and desktop dispositions.

Update stale reports: the previous Playwright report still says Phase 10/UI-015 toast and the database
report still says 39 assertions. Report current truth only. Clean exact task-owned servers, traces,
scratch files, stale cached auth, and superseded generated review sheets. Return one structured
PASS/PARTIAL/FAIL delivery with task-by-task evidence, commands, exit codes, retained artifact paths,
remaining blockers, and explicit confirmation that native Android was not claimed.
