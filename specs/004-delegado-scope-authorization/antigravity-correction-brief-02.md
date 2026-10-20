# Antigravity Correction Brief 02

## Authority and operating mode

Implement Phase 10 (T068–T080) of `tasks.md`. Use `gemini-3.8-flash-medium` at medium effort.
This is one bounded correction batch. Do not watch or narrate Codex; complete the batch, verify it,
then return one terminal structured report: `PASS`, `PARTIAL`, or `FAIL`.

Read these files before editing:

1. `spec.md`, especially FR-001–FR-030 and acceptance scenarios for US1–US5.
2. `contracts/authorization-matrix.md`, `contracts/ui-state-matrix.md`, and `contracts/openapi.yaml`.
3. `data-model.md`, `plan.md`, `quickstart.md`, and `.specify/memory/constitution.md`.
4. `tasks.md`, Phase 10, plus the still-blocked T049/T063 database gates.
5. Existing evidence reports only as historical claims; source and fresh execution are authoritative.

## Confirmed defects — do not re-audit them away

1. `DelegadosService` calls auth-dependent RPCs through `getAdminClient()`. The RPCs require
   `auth.uid()`, so the real caller identity is absent. Several methods retain non-transactional
   fallbacks; `configureDelegado` can repeat mutation work after an RPC.
2. `protect_user_fields()` is `SECURITY DEFINER` while checking `current_user` for `postgres` or
   `service_role`; this can cause the function to observe its owner and bypass protection. Direct
   policies also allow broader invitation/delegation/scope changes than the RPC-only design.
3. Authenticated clients can forge notification/audit content: notification insert/update policies
   are broad and `log_acciones` accepts rows whose only binding is `actor_id = auth.uid()`.
   `ActionLogService` uses admin authority, swallows errors, and is optional in mutation controllers.
4. Web auth accepts unsigned base64/JWT payloads whenever `AUTH_ALLOW_DEV_TOKENS=true`, including
   production code paths. Operational layout defaults an unresolved role to Gestor. UI-022 therefore
   renders the normal Delegados page and invite action instead of a fail-closed state.
5. UI-017 captures an unhandled Next.js `fetch failed` overlay in all eight screenshots. Its test
   performs no allowed operation and asserts no success feedback.
6. The touch-target check uses 24px and `width < 24 && height < 24`, while the contract requires a
   44x44 minimum. UI-004 clips at 768px; UI-005's reject button is illegible in dark mode; the
   UI-008–UI-010 mobile dialog footers are not demonstrated reachable and dark contrast is weak.
7. Account/Grupo `Gestionar` creation rights are implemented in the authorization model/database but
   hidden or denied by parts of the web UI, contrary to the authorization matrix.
8. The suite/report says 22/22 PASS despite screenshots proving UI-017 and UI-022 fail. Most original
   Phase 1–7 tasks remain unchecked while Phase 9 claims they were reconciled.

## Required implementation decisions

- Propagate the verified bearer token from the guard/controller to user-scoped Supabase RPC calls.
  Never solve identity by accepting an actor id from the request body or by using service-role RPC
  calls that trust caller-supplied identity.
- Lifecycle state, membership, permission, and scope transitions have exactly one transactional path.
  RPC absence/network/database failure returns a safe error and makes no partial mutation.
- Do not let a trigger infer privilege from a `SECURITY DEFINER`-changed `current_user`. Use a design
  whose bypass is explicit and testable, or keep sensitive changes exclusively inside narrowly
  granted functions while denying direct column changes. Revoke implicit function execution.
- Client users may read their notifications and update only their own read timestamp through a narrow
  operation. They may not forge title/message/recipient. Audit rows must be server/RPC-generated and
  immutable; clients cannot insert/update/delete them.
- Access context is the authority for all operational pages. If it cannot be resolved, render a
  localized retryable blocked state before fetching or showing protected content for every actor.
  User metadata is not authorization. The E2E identity adapter must be impossible in production even
  if an environment flag is accidentally enabled.
- Keep public marketplace behavior separate. Do not broaden AFIP, billing, Cupo, platform Pagos,
  complete logs, Delegado administration, or dev/admin access to Delegados.
- Implement the exact create matrix from `authorization-matrix.md`, including direct-route guards.
- Playwright must perform functional assertions before screenshots. A page error, blank page, normal
  protected page in an error scenario, or unreachable dialog footer is a failed test.
- At 375 and 768, assert each visible action's own box or an explicit associated wrapper is at least
  44x44. Do not lower the contract or exempt controls merely because they are small.

## Verification and evidence

Run and record:

1. API lint, all API tests, and API production build.
2. Web production build.
3. Feature Playwright suite with exactly UI-001–UI-022, four widths (375/768/1024/1440), and both
   themes. Retain exactly 176 final screenshots after removing only superseded task-owned captures.
4. Visual self-review of all 176 captures; descriptions in `visual-manifest.md` must match pixels.
5. Local Supabase reset and pgTAP only if the real daemon is available. Never substitute mocks or an
   authored SQL count. If unavailable, leave T049/T063 blocked and return `PARTIAL`.

Update all Phase 10 checkboxes honestly. Reopen any earlier checked task contradicted by fresh source
or execution. The terminal report must list changed files, exact command outcomes/counts, screenshot
count and location, cleanup performed, remaining failures/skips/blockers, migration/rollback notes,
and confirmation that no native Android validation was claimed.
