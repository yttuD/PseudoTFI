# Antigravity Correction Brief 03

Implement only Phase 11 (T081–T090) in one terminal batch with
`gemini-3.8-flash-medium`, medium effort. Read the feature spec, constitution, authorization matrix,
UI state matrix, data model, Phase 11 tasks, and this brief before editing. Source and fresh execution
override prior reports.

## Confirmed blockers

### Database policy catalog

The current migration creates new restrictive policies without dropping several earlier policies.
PostgreSQL permissive policies combine with OR, so the old rules remain effective or invoke the now
revoked `get_workspace_id()` and break legitimate access. At minimum audit and replace these exact
legacy policies:

- `Gestor puede ver sus pagos`
- `Gestores config fiscal workspace`
- `Gestores acceden a sus comprobantes AFIP`
- prior authenticated-wide analytics SELECT policies
- `Contratos son accesibles`
- `Gestor puede subir contratos`
- `Gestor puede eliminar contratos`
- `Fotos de unidades son publicas`, `Gestor puede subir fotos`, and `Gestor puede borrar fotos`

Do not assume this list is exhaustive: compare every policy created by earlier migrations against the
final policy catalog for each table in Feature 004. Preserve the public published-Unidad projection
and safe public analytics writes, but never public contract reads or all-authenticated file mutation.
Use role-targeted policies and an explicit function privilege inventory. Ensure anon marketplace
queries never depend on a helper lacking anon execute; ensure authenticated RLS has every required
helper grant. Do not use a blanket revoke without restoring all legitimate functions.

### Database test quality

The current 39-assertion SQL is not an actor matrix. It does not insert matching `auth.users`, switch
JWT claims/roles, exercise Ver/Gestionar/unconfigured/revoked/cross-workspace identities, test
Storage, or execute lifecycle RPC behavior. It will likely violate the `public.users -> auth.users`
foreign key on a fresh database. Rebuild it per T084. Keep execution marked BLOCKED unless a real
local Supabase reset and pgTAP run actually occurs.

### Audit atomicity

Operational controllers mutate first and call `ActionLogService` afterward. Throwing on log failure
does not undo the committed mutation. Move mutation plus audit into one database transaction through
narrow authenticated RPCs or trusted triggers. Do not trust body-supplied actor/workspace identity.
Lifecycle RPCs already append within their transaction; avoid duplicate application-level entries.

### Web/E2E truthfulness

Codex independently ran the suite. All 22 assertions were reached, but output contained repeated
`ECONNREFUSED 127.0.0.1:3001`, `fetch failed`, and private dashboard/list fetches during UI-012. The
runner remained alive after test 22 and required Ctrl+C. Passing through caught backend failures is
not deterministic verification.

- UI-012 must render pending/zero access before children make private calls and assert zero private
  resource requests.
- Provide a deterministic API fixture process or server-side fixture adapter that handles SSR fetches;
  browser `page.route` alone cannot intercept Next server fetches. Unexpected proxy/network/page/
  console failures fail the suite.
- UI-015 currently registers a POST 403 route but never performs a mutation. Execute the attempt,
  assert the request occurred, and visibly prove the safe denial/access-changed result.
- UI-020 screenshots capture the animated heading at inconsistent partial strings (`di`, `direc`,
  etc.). Wait for completion or use reduced motion before every capture.
- UI-008–UI-010 dark text/panel contrast remains poor; mobile captures must visibly prove the named
  scope and its confirmation without footer obstruction.
- Remove `parentElement` as a generic 44px exemption. Only the control itself or an explicit,
  semantically associated wrapper that is proven to activate/focus it counts.
- The unsigned test identity adapter must require an explicit opt-in and be impossible in production
  even when environment flags are misconfigured. Apply the same gate in middleware, server auth, and
  access-context code.

## Required terminal evidence

Run API lint/full tests/build, web production build, and the feature Playwright suite. Playwright must
exit cleanly, report 22/22 only with zero unexpected server/network/page/console errors, and retain
exactly 176 final PNGs. Self-review all 22 contact sheets. Correct reports and task statuses; do not
claim integrated or visual proof from filenames or mocks. Clean only task-owned processes, temporary
servers, traces, and superseded review artifacts. Return exactly one structured PASS/PARTIAL/FAIL
report. If Docker/local Supabase is still unavailable, the final status remains PARTIAL and clearly
separates authored SQL from unexecuted database proof. Do not claim native Android validation.
