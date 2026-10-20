# Antigravity Correction Brief 05 — Live Database Gate

Implement only Phase 13 (T098–T100) with `gemini-3.8-flash-medium`, medium effort. Docker and the
local Supabase stack are now available. Work from the real failures below, rerun until terminal, and
do not touch unrelated UI or regenerate screenshots unless a directly affected web test requires it.

## Reproduced evidence

`supabase db reset` applied every migration including
`20260925120000_delegado_scope_authorization.sql` and exited 0. It warned that configured
`supabase/seed.sql` does not exist.

`supabase test db` exited 1:

```text
004_delegado_scope_authorization.sql:71: ERROR:
function isnt(integer, integer, boolean, unknown) does not exist
Tests: 29; planned 121; Result: FAIL
```

Fix that assertion correctly. Then keep executing reset + pgTAP and repair every subsequent failure
until all 121 planned assertions actually run and pass. Do not reduce coverage or plan count to make
the suite green.

## Actor switching

The current `set_test_actor` performs `RESET ROLE` and sets `role` inside a `SECURITY DEFINER`
function. Replace it with a PostgreSQL-valid test pattern: while the test session is privileged,
explicitly `RESET ROLE`, set Supabase JWT claims, then `SET LOCAL ROLE anon|authenticated` outside a
security-definer routine for each actor block. Ensure every actor transition returns to the
privileged role first. Prove revoked anon execution with `42501` and authenticated helper access with
real execution.

## Invitation RPC boundary

`create_delegado_invitation(UUID, TEXT)` currently:

- permits any caller whose public role is not `delegado`, instead of only a Gestor owner;
- accepts the delivery email from the RPC caller and does not prove it belongs to the target;
- does not require the target `auth.users` identity to be email-verified inside the authoritative
  transaction.

Make the direct RPC safe against crafted calls. Prefer a UUID-only public signature and derive the
canonical normalized email from the locked, verified target identity; if compatibility requires an
email parameter, validate exact canonical equality but never use an untrusted mismatch. Require the
caller to satisfy the Gestor-owner invariant. Add live pgTAP cases for valid verified target,
unverified target, mismatched email/crafted request, authenticated public user, admin/non-owner, self,
duplicate, and cross-workspace conflict. Update the NestJS caller and unit tests to the final
signature.

## Required commands and result

Use the available local Supabase CLI/Docker stack and record exact outputs:

1. `supabase db reset` — exit 0 without a missing-seed warning.
2. `supabase test db` — all 121 planned assertions execute and pass, exit 0.
3. API lint, all API tests, and API build — exit 0.
4. Run only web gates directly affected by signature/fixture changes; otherwise preserve the already
   accepted 22/22 Playwright and 176 visual artifacts.

Update `database-validation.md`, security review, traceability, cleanup ledger, tasks and
`ESTADO-REAL.md`. Remove the obsolete Docker blocker. Keep local Supabase running for Codex's
independent confirmation unless it conflicts with a documented cleanup rule. Return one structured
PASS/FAIL report; PARTIAL is no longer justified by Docker availability. Native Android remains out
of scope.
