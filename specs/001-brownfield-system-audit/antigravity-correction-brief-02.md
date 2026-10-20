# Antigravity Correction Brief 02 — Final Audit Convergence

**Prior delivery status**: REJECTED / PARTIAL  
**Execution mode**: new clean Antigravity conversation  
**Required model**: `gemini-3.8-flash-medium`, medium effort  
**Time boundary**: finish directly within one turn; do not spawn background tasks or rerun the full
200-cell gallery  
**Allowed product-tree change**: `apps/web/e2e/brownfield_system_audit.spec.ts` only  
**Allowed documentation**: `.specify/` and `specs/001-brownfield-system-audit/` only

Read completely before editing:

1. `.specify/memory/constitution.md` (now 1.1.0)
2. `specs/001-brownfield-system-audit/architecture-boundaries.md`
3. `spec.md`, `plan.md`, `data-model.md`, `tasks.md`, `quickstart.md`
4. `contracts/inventory-row.md` and `contracts/audit-delivery.md`
5. every existing audit manifest/report and this brief

The objective is an honest, internally consistent PARTIAL audit package. Do not claim SUCCESS
unless every success criterion is truly met. Existing screenshots are retained evidence, but their
labels and claims must match what the executed test actually proved.

## 1. Correct the route and visual denominators

- Source contains 25 `page.tsx` route entries, but `/[locale]/grupos` is a redirect alias to
  `/[locale]/mis-unidades`; it is not a distinct rendered Surface.
- Inventory the 25 entries as **24 rendered surfaces + 1 redirect alias**. Preserve stable IDs but
  mark SURF-014 as `redirect-alias -> SURF-011`, or introduce an explicit route-entry ID without
  silently renumbering evidence.
- The eight SURF-014 images are byte-identical to SURF-011 because of the redirect. Mark them
  rejected/redundant, delete those exact task-owned PNGs, and record the deletion.
- Before deletion the actual count is 202 PNGs: 192 surface files + 10 form files. After deleting
  the 8 redundant alias captures, the expected retained count is 194 unless another exact,
  documented correction changes it.
- Distinct visual matrix: 24 rendered surfaces × 4 viewports × 2 themes = 192 expected cells.
  Existing evidence contains 184 retained rendered-surface cells plus 8 currently unresolved cells
  for SURF-019. Keep forms outside the surface-cell denominator.
- Add route-kind, audience, actor, and channel to the route inventory as required by the amended
  contract. Report desktop web (1024/1440) separately from responsive web (375/768).

## 2. Correct what the Playwright run actually proved

`apps/web/playwright.config.ts` loads `e2e/.auth/user.json` for both projects. The audit spec used
that same authenticated storage state for every route. Therefore it did **not** prove anonymous,
Gestor, Delegado, Usuario/Buscador, or dev/admin separation.

Update `brownfield_system_audit.spec.ts` so future runs:

- use explicit actor contexts/storage state; public anonymous checks must use an empty storage
  state, while protected roles use their own fixture or an explicit named blocker;
- assert final URL and expected page identity; test the `/grupos` redirect explicitly;
- fail or soft-fail on unexpected page errors, console errors, and horizontal overflow instead of
  merely collecting or logging them;
- distinguish known expected failures/blockers from unexpected failures;
- never use conditional `if (isVisible)` as proof that an interaction passed;
- keep full-matrix screenshot generation available but do not rerun the full matrix in this final
  correction.

Run only targeted Playwright checks needed to establish the `/grupos` redirect, explicit anonymous
access, protected-route rejection, and SURF-019 reproducibility. Save raw stdout/stderr and exit
code. If actor fixtures are unavailable, mark the corresponding matrix rows unverified/blocked.

## 3. Correct false form claims

The existing form test mostly opened a route/modal and captured one image. It did not prove the
valid submission, boundary, cancellation, server failure, keyboard, or destructive safeguards
claimed by `form-behavior.md`.

Reclassify each field independently:

- FORM-001, 003, 004, 007, 008: modal-open visual evidence only; no successful submission or full
  behavior matrix was proven by this audit run.
- FORM-002: invalid CUIT/browser validation was attempted; live AFIP issuance remains blocked.
- FORM-005: a submit click and screenshot occurred, but no explicit validation assertion proves the
  claimed error; report it as unverified unless a small targeted Playwright check proves it.
- FORM-006: the retained screenshot does not visibly prove map interaction; report unverified.
- FORM-009: retained capture is the homepage, not proof of a wizard step transition.
- FORM-010: disabled-submit assertion is proven; the screenshot duplicates the registration page
  visual and does not prove valid submission or server failure.
- FORM-008 was captured while an authenticated storage state was loaded; do not label the actor
  anonymous.

Do not delete these ten captures unless they are corrupt; they still document the limited state
that was observed. Correct their evidence descriptions.

## 4. Add missed authorization findings

Inspect and cite the current source. These are confirmed review findings and override the prior
report's false RBAC matrix:

### P0 — API authentication bypass fallback

`apps/api/src/auth/supabase-auth.guard.ts` accepts invalid/unverified bearer values through decode
and length-based fallbacks, including treating any token longer than 10 characters as a fixed
Gestor when Supabase does not validate it. There is no explicit development-only environment gate.
Record this as a critical authentication-bypass risk, map all guarded capabilities, and create the
first remediation candidate.

### P1 — Dev/admin console authorization gap

`apps/web/src/app/[locale]/dev/layout.tsx` redirects only `buscador`; ordinary Gestores and
Delegados are not rejected. The console must require an explicit dev/admin role. Current Dev
screenshots prove rendering, not authorized dev access.

### P1 — Delegado scope and permission model absent

The intended model is account/Grupo/selected-Unidades × Ver/Gestionar. Current implementation has
only `users.rol IN ('gestor','delegado')`, no scope or permission level, and workspace RLS uses
`FOR ALL`. Most APIs have only `SupabaseAuthGuard`. `ESTADO-REAL.md` already describes this as
all-or-nothing. Replace the prior false claim that `rol_permiso`, Ver/Gestionar enforcement, or a
role selector already exists. The missing modal selector is only one symptom of the absent model.

### P1/P2 — Responsive dev console unusable

The 375px captures show a fixed desktop-style dev sidebar and dense tables compressed into a very
narrow content strip. Record a separate responsive-web disposition; do not mark mobile pass.

Also retain the existing verified product findings: missing automatic Alquiler→Unidad transition,
mojibake, raw emoji icons, sticky action-bar overlap, and other evidence-backed gaps. Re-evaluate
severity and deduplicate by root cause.

## 5. Correct role, platform, and mobile claims

- Rewrite `role-and-privacy.md` around the three trust surfaces in
  `architecture-boundaries.md`: public, operational workspace, dev/admin.
- Distinguish source-inspected intent from executed actor evidence. Hidden sidebar items are not
  authorization proof.
- Explicitly state that the audit did not validate a native Android app. The 375/768 captures are
  responsive web. The Capacitor wrapper receives readiness-only findings, including hard-coded LAN
  server URL, cleartext traffic, `allowMixedContent`, and debugging enabled in its current config.
- Native Android implementation and physical-device testing are deferred to a future feature. Do
  not request device access in this batch.

## 6. Correct command and delivery evidence

- Existing Markdown run summaries are prose, not raw logs. Rerun API tests, API build, and web
  build only if needed and save exact stdout/stderr plus exit code under `evidence/runs/` using
  clearly named `.log` files. Do not mutate dependency versions or purge `node_modules`.
- Save the targeted Playwright output the same way.
- Remove the stable demo-user UUID from the environment report. Keep credentials and cookie values
  out of all evidence.
- Correct `delivery.json`: status must be `PARTIAL` unless every amended criterion is met; totals
  must reconcile exactly; blockers/unverified areas must be explicit; do not count an item as both
  verified and blocked.
- Update task checkboxes only for tasks whose independent test is actually satisfied. It is valid
  for the final honest audit to leave T012-T021 partially open and to explain why.
- Add this correction brief and `architecture-boundaries.md` to the artifact list.

## 7. Cleanup and terminal response

- Stop only task-owned servers/processes.
- Delete only exact task-owned temporary Playwright result/report paths that did not pre-exist and
  exact rejected/redundant screenshots. Preserve retained evidence and every pre-existing dirty-tree
  file.
- Update the cleanup ledger with exact paths removed and retained.
- Return the `audit-delivery.md` response directly in the foreground. Do not return progress
  narration, do not launch a background subagent, and do not wait for a full visual rerun.
