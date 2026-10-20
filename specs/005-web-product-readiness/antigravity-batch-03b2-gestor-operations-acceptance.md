# Batch 03B2 — Gestor operations remediation and acceptance (T035–T039)

## Scope and stop condition

Implement and close **T035, T036, T037, T038 and T039 only**. Do not start T040 or any Delegado-acceptance, dev-console, final-integration or native Android task.

Preserve accepted T031–T034 behavior, especially rental modality, half-open availability, truthful optional seña and Feature 004 fail-closed authorization. Docker/WSL remain off in this batch.

## Actor boundary

- Gestor owns billing, payments, fiscal configuration, private profile data and delegate administration.
- A Delegado may eventually receive almost every operational permission, but never billing, payments, fiscal configuration, sensitive Gestor data, delegate administration or development-console access.
- Do not weaken server authorization, route guards, middleware, navigation visibility or direct-request denials. UI hiding alone is insufficient.
- This batch remediates the Gestor owner experience and preserves existing denial behavior. Full Delegado acceptance remains T040+.

## T035 — Dashboard, Métricas and Logs

1. Fix FIND-005-035: Dashboard must never dereference missing arrays or metrics. Default, empty, partial-data, loading and API-error states must render without a Next.js error overlay.
2. Dashboard KPIs must have explicit labels, units/ranges and honest empty values; no fabricated business data. Links/actions must resolve to valid Gestor destinations.
3. Métricas must distinguish financial amounts, counts, occupancy and ranges. Avoid ambiguous zeros and cross-workspace data. Preserve owner/delegate visibility rules already defined by Feature 004.
4. Logs must present actor, action, affected resource, timestamp and outcome without exposing tokens, secrets or sensitive payloads. Empty/error states must be actionable.
5. Correct FIND-005-031 on SURF-020/021: no document-level horizontal overflow at 375px; use cards or contained horizontal scrolling with readable headers.
6. Correct FIND-005-032 on SURF-010/020: all essential mobile/tablet touch targets are at least 44×44px.
7. Correct FIND-005-033 on SURF-010/020/021: body/subtitle/control text reaches WCAG AA in real dark theme.

## T036 — Billing, payments and AFIP readiness

1. SURF-017/SURF-018 and FORM-002 must clearly separate plan/subscription, payment status and fiscal/AFIP configuration. Never imply an external integration is active when it is not.
2. Provide explicit states for not configured, ready, blocked/missing prerequisites, loading, empty, success, API error and retry. Keep sensitive values masked where appropriate.
3. Validate fiscal fields and payment actions server-side and client-side. No debug alerts/console UX, fake success or swallowed API errors.
4. Preserve owner-only access in navigation, pages, controllers and services. Add negative tests proving Delegado access remains denied for UI route and direct API requests.
5. Correct FIND-005-031 on SURF-017/018 and FIND-005-033 on SURF-017/018 across 375/768/1024/1440 and both themes.

## T037 — Delegate owner UX

1. Gestor can invite, inspect, modify and revoke a Delegado with explicit confirmation and visible effective status (`pendiente`, `activo`, `revocado` or canonical equivalents).
2. Permission assignment must express read/manage separately and scope explicitly: whole operational account, selected Grupo(s), or selected Unidad(es).
3. Near-owner operational rights are allowed only when explicitly granted; sensitive exclusions must remain immutable and explained in the UI.
4. FORM-007 invitation/configuration and FORM-013 revoke confirmation need validation, submitting, success, API-error and retry states. Revocation must not happen on a single accidental click.
5. Correct FIND-005-032 on SURF-019; all essential actions and permission controls must be at least 44×44px at 375/768.
6. Never expose invitations, tokens, emails or permission internals in logs/screenshots beyond deterministic test fixtures.

## Functional verification

Extend focused API/unit and Playwright tests for:

- Dashboard default/empty/partial/error loads with no runtime overlay.
- Metrics and logs meaningful loading/empty/error/data states and workspace-safe requests.
- Billing/AFIP not-configured, validation, success, API failure/retry and owner-only denial.
- Delegate invite, permission/scope edit, API failure/retry and two-step revoke confirmation.
- Existing Feature 004 direct denials for billing/fiscal/delegate-admin stay green.
- No console errors, invalid internal links, document-level overflow, undersized essential targets or WCAG AA text/control contrast on the owned surfaces.

Do not weaken baseline assertions or convert failures into soft passes.

## T038 — Required Playwright visual evidence

Use Playwright for every visual verification. Store fresh non-overwriting acceptance evidence under:

- `evidence/screenshots/gestor/accepted-operations/`
- `evidence/contact-sheets/gestor/accepted-operations/`

Capture 375, 768, 1024 and 1440 in persisted real light/dark for these nine canonical items:

- SURF-010 Dashboard
- SURF-017 Planes/Facturación
- SURF-018 Facturación AFIP
- SURF-019 Delegados
- SURF-020 Métricas
- SURF-021 Logs
- FORM-002 billing/payment action
- FORM-007 delegate invite/edit
- FORM-013 delegate revoke confirmation

This canonical matrix is **72 PNGs and 9 PNG contact sheets**.

Also capture material state matrices, each at all four widths and both themes:

- `SURF-010-empty`, `SURF-010-api-error`;
- `SURF-020-empty`, `SURF-020-api-error`;
- `SURF-021-empty`, `SURF-021-api-error`;
- `FORM-002-validation-error`, `FORM-002-api-error`, `FORM-002-success`;
- `FORM-007-validation-error`, `FORM-007-api-error`, `FORM-007-success`;
- `FORM-013-api-error`, `FORM-013-success`.

That is **112 additional PNGs and 14 contact sheets**, for **184 PNGs and 23 contact sheets total** in accepted-operations. Use deterministic local fixtures; never depend on external AFIP/payment/network availability.

Inspect every contact sheet. Record exact file count, unique hashes, identical light/dark pairs, and per-cell overflow/touch/contrast diagnostics. A DOM assertion alone cannot mark a visual finding verified.

## T039 — Acceptance records

- Update the acceptance matrix for SURF-010/017/018/019/020/021 and FORM-002/007/013 with exact functional, responsive, theme and accessibility outcomes.
- Transition FIND-005-031/032/033/035 truthfully to verified/fixed, partial or open; never delete IDs.
- Add new stable findings for any newly discovered product defect and assign the correct later task.
- Update `ESTADO-REAL.md` and tasks only after all owned checks pass.
- Mark T035–T039 complete only when no high defect remains in this scope and every medium exception has an explicit decision.

## Verification commands and hygiene

Run focused tests, complete API suite/build, direct web TypeScript/build and focused Playwright. Report exact discovered/passed/failed/skipped totals separately.

Keep Docker/WSL off. Remove task-owned `test-results`, temporary screenshots outside declared evidence, trace/video files and temporary reports. Release ports 3000/3001 and terminate only task-owned browser/web/test processes. Preserve all accepted and baseline evidence.

## Terminal delivery

Return:

1. product/test/documentation files changed;
2. exact behavior by T035, T036 and T037;
3. exact test/build totals;
4. exact 184-PNG/23-sheet evidence inventory, hashes and visual inspection result;
5. finding dispositions and acceptance-matrix changes;
6. authorization regression result;
7. cleanup/RAM-relevant process state;
8. explicit confirmation T040+ and native Android were not started.
