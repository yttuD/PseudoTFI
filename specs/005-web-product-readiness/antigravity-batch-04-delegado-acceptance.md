# Antigravity Batch 04 — Delegado acceptance (T040–T047)

## Scope and terminal condition

Implement and close **T040–T047 only**. Do not start dev-admin acceptance (`T048+`), cross-cutting finalization, deployment, or native Android work.

Use Playwright for every browser/visual verification and deliver actual PNG screenshots plus contact sheets. Desktop, tablet and mobile web are separate acceptance cells; this is not native mobile validation.

## Existing baseline to preserve

- Feature 004 already provides `apps/web/e2e/delegado_scope_authorization.spec.ts` (`UI-001`–`UI-022`). Extend it only where inventory behavior is not already covered; do not duplicate or weaken it.
- Gestor acceptance and canonical nested camelCase delegation DTOs are already accepted.
- Roles are distinct: `gestor`, `delegado_read`, `delegado_manage`, `public_user`, `dev_admin`.
- A delegate may receive nearly all operational rights, but never owner-sensitive account, plan/payment, fiscal/AFIP, delegate-administration, owner metrics, owner audit logs, or dev-console access.
- Authorization is fail-closed and server-authoritative. Hidden controls are UX only, never the security boundary.

## Required functional matrix (T040–T041)

Cover both direct navigation and API behavior with canonical deterministic fixtures.

### Scope semantics

For both `ver` and `gestionar`, test these scopes independently:

1. `cuenta`: all operational units/groups assigned to the owner;
2. `grupo`: only units belonging to the assigned group;
3. `unidades`: only the explicit unit IDs.

Required positive/negative journeys:

- dashboard and sidebar describe the active permission and scope in plain language;
- list/detail results contain only in-scope units, tenants and rentals;
- direct out-of-scope IDs are concealed as not found, without revealing title, owner or existence;
- `delegado_read` can inspect in-scope operational data but has no create/edit/delete/publish/rental mutation affordance and receives a localized denial for direct mutations;
- `delegado_manage` can create or mutate only in-scope operational resources, including units, tenants and monthly/daily/hourly rentals with the accepted optional/group seña rules;
- group-scoped creation cannot escape the group; explicit-unit scope cannot create or reassign broader inventory unless the authorization contract explicitly permits it;
- changing account → group → explicit units takes effect on the next request, without stale visibility;
- revocation and `aceptada_sin_configurar` take effect immediately and expose zero operational data;
- no UI or API response leaks owner billing/fiscal data, delegate administration, owner analytics/audit logs, service secrets or other users' data.

### Owner-only and dev denials

For both delegate levels, assert direct navigation denial and no sensitive content for:

- `/es/facturacion` (SURF-017);
- `/es/facturacion-afip` (SURF-018);
- `/es/delegados` (SURF-019);
- `/es/metricas` (SURF-020);
- `/es/logs` (SURF-021);
- every real `/es/dev/*` destination (SURF-022–025), including direct URLs rather than sidebar-only checks.

Also exercise the corresponding sensitive API endpoints where present. Assert 403/404 according to the existing concealment contract, no payload leakage, and a sanitized audit event for sensitive denial/mutation attempts where FR-025 requires it.

Create `apps/web/e2e/product_readiness_delegado.spec.ts` for the Feature 005 cross-surface suite. Use strict semantic/test-id assertions; no `expect.soft` for authorization, identity, scope, or leakage gates. No skips, retries, double-clicks, fixed-delay success assumptions, or test-only production fallbacks.

## Visual/accessibility matrix (T042, T046)

Write accepted screenshots to:

`specs/005-web-product-readiness/evidence/screenshots/delegado/accepted/`

and contact sheets to:

`specs/005-web-product-readiness/evidence/contact-sheets/delegado/accepted/`

Capture every state below at **375×667, 768×1024, 1024×768 and 1440×900**, in real persisted **light and dark** themes:

1. `DEL-READ-dashboard-account`
2. `DEL-READ-units-group`
3. `DEL-READ-tenants-units`
4. `DEL-READ-rentals-group`
5. `DEL-READ-mutation-denied`
6. `DEL-MANAGE-dashboard-account`
7. `DEL-MANAGE-units-group`
8. `DEL-MANAGE-unit-create-group`
9. `DEL-MANAGE-unit-edit-in-scope`
10. `DEL-MANAGE-tenants-units`
11. `DEL-MANAGE-rentals-hourly-group`
12. `DEL-MANAGE-out-of-scope-concealed`
13. `DEL-STATE-unconfigured`
14. `DEL-STATE-revoked`
15. `DEL-DENY-owner-only`
16. `DEL-DENY-dev-console`

Expected denominator: **128 named PNG files** and **16 PNG contact sheets**. Each capture must show the named state, not merely the default page. Enforce:

- zero document-level horizontal overflow;
- all essential mobile/tablet targets at least 44×44;
- WCAG AA body/control contrast in both themes;
- visible keyboard focus, usable dialogs, no clipped titles/actions;
- correct responsive navigation with no owner-only/dev links for delegates;
- no runtime overlay, console exception or unexpected failed request;
- 128 distinct SHA-256 hashes and zero light/dark collision pairs.

Use the accepted Rendo navy/gold/warm-white palette. Do not copy the reference image's home composition.

## Findings and remediation (T043–T045)

Populate `evidence/reports/delegado-findings.md` before remediation with reproducible IDs, inventory/state, actor/scope, severity, expected/actual behavior and evidence path.

Fix every critical/high defect and any medium authorization/data-leak defect. UI changes belong only in relevant gestor/delegado/middleware code. API changes must preserve controller/service authorization, database/RLS/exclusion rules, and fail-closed behavior. Do not fabricate success, scope, identity or data when a service fails.

Run focused unit/integration tests for every changed authorization/controller/service path. If a migration is truly required, make it idempotent and document why; do not start Docker merely to create evidence.

## Acceptance records (T047)

- Update `evidence/manifests/acceptance-matrix.md` from `PENDING:US3` to exact results for delegate cells.
- Update `delegado-findings.md` with `verified`, `accepted-low`, or a precise remaining blocker. No undocumented open critical/high/medium-security issue.
- Check T040–T047 only after all gates pass.

## Required verification

Report exact commands and totals for:

1. Feature 004 delegate suite;
2. Feature 005 `product_readiness_delegado.spec.ts` functional suite;
3. 128-cell Playwright visual suite;
4. affected API authorization tests;
5. API build;
6. direct web TypeScript check;
7. web production build;
8. PNG/name/hash/theme/contact-sheet integrity gates.

## Resource and cleanup contract

- Keep Docker/WSL off; use the deterministic mock API for this batch.
- Do not run unrelated suites or start `T048+`.
- Remove only task-owned traces, reports, temporary diagnostics, `apps/web/test-results`, and transient servers.
- Leave ports 3000/3001 free and report final Node/Playwright process state.
- Preserve accepted screenshots and contact sheets; they are evidence, not trash.

Return one concise terminal delivery: tasks closed, findings/remediations, exact test/build totals, 128/128 evidence integrity, changed files, cleanup/resource state, and explicit confirmation that T048+, deployment and native Android were not started.
