# Antigravity Correction Brief 06 — Exact pgTAP Failures

Implement only Phase 14 (T101–T103) with `gemini-3.8-flash-medium`, medium effort. Do not alter
application behavior, RLS policies, UI, screenshots, or the 121-test plan to make the suite green.

## Independent live evidence

Codex ran a fresh local `supabase db reset`: all migrations and `supabase/seed.sql` applied and the
command exited 0. The subsequent `supabase test db` executed all 121 assertions and failed exactly
five:

```text
105 caught 42501 RLS, wanted 23514 (grupo scope CHECK)
106 caught 42501 RLS, wanted 23514 (unconfigured shape CHECK)
107 caught no exception (users.rol mutation)
109 caught no exception (log_acciones DELETE)
121 returned no visible row under RLS (revoked user state)
Result: FAIL, 116/121 passing
```

These are test-harness defects, not authorization gaps. Preserve the product's denial policies.

## Required corrections

1. The fixture calls `set_config('rendo.allow_user_mutation', 'true', true)` inside the suite-wide
   transaction and leaves it active. Set it back to `false` immediately after fixture creation so
   later trigger assertions are meaningful.
2. Assertions 105–106 cannot reach table CHECK constraints as `authenticated` because direct
   mutations on `delegaciones` are intentionally denied by RLS. After `RESET ROLE`, mutate an
   existing valid fixture row into each invalid shape inside `throws_ok(..., '23514', ...)`; the
   failed statement rolls back itself. Then explicitly restore claims and `SET LOCAL ROLE
   authenticated` before client-boundary checks.
3. Assertion 107 currently updates another user's row, so RLS correctly affects zero rows and the
   trigger never runs. Attempt to change the authenticated actor's own `rol` (or another protected
   field) and require the trigger exception, with the fixture bypass already cleared. Verify the
   protected value remains unchanged from the privileged role.
4. A denied RLS `DELETE` is allowed to affect zero rows without throwing. Replace assertion 109
   with an affected-row assertion (`DELETE ... RETURNING` count = 0), then `RESET ROLE` and prove
   the audit rows still exist. Keep the total plan at 121 by replacing assertions, not merely adding
   or deleting coverage.
5. Assertion 121 must `RESET ROLE` before reading the revoked user's resulting `rol` and
   `workspace_id`; its current authenticated actor is not entitled to see that row after revocation.

## Terminal gate

Run and report the exact commands and exit codes:

1. fresh `supabase db reset` — exit 0;
2. `supabase test db` — exactly 121/121 passing, exit 0;
3. API lint, all API tests, API build — all exit 0.

Update `database-validation.md`, security review, traceability, cleanup ledger, `tasks.md`,
`ESTADO-REAL.md`, and delivery report only after those commands finish. Mark T098–T103 complete only
when retained evidence supports each claim. Return one terminal structured PASS or FAIL report.
