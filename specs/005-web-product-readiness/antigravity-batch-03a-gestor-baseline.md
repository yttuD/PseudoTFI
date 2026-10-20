# Batch 03A — Complete Gestor baseline audit (T026–T030 only)

## Role and stop condition

You are the implementation/test worker. Execute **only T026–T030** from `specs/005-web-product-readiness/tasks.md`.

This is an audit/baseline batch. You may add or correct Playwright suites, deterministic test-adapter fixtures, evidence generators, manifests, and audit reports. **Do not remediate product code** under `apps/web/src/**`, `apps/api/src/**`, `packages/**`, or `supabase/**` in this batch. Product failures are expected and must be recorded honestly for T031–T037.

Stop after a terminal delivery for T026–T030. Do not start T031+.

## Canonical sources

Read and obey:

- `specs/005-web-product-readiness/spec.md`
- `specs/005-web-product-readiness/plan.md`
- `specs/005-web-product-readiness/tasks.md`
- `specs/005-web-product-readiness/evidence/manifests/routes-and-states.md`
- `specs/005-web-product-readiness/evidence/manifests/actor-surface-matrix.md`
- `specs/005-web-product-readiness/evidence/manifests/api-capabilities.md`
- accepted public-suite helpers and evidence conventions from `apps/web/e2e/product_readiness_public.spec.ts` and `apps/web/e2e/fixtures/product-readiness.ts`
- Feature 004 authorization evidence; do not weaken its fail-closed boundaries.

## T026 — Gestor route/state and CRUD journeys

Create `apps/web/e2e/product_readiness_gestor.spec.ts` and cover every Gestor operational surface:

- SURF-010 Dashboard
- SURF-011 Mis Unidades
- SURF-012 Nueva Unidad
- SURF-013 Editar Unidad
- SURF-014 Grupos redirect and its destination behavior
- SURF-015 Inquilinos
- SURF-016 Alquileres
- SURF-017 Planes y Facturación
- SURF-018 Facturación AFIP
- SURF-019 Delegados y Permisos
- SURF-020 Métricas
- SURF-021 Logs

Exercise visible default, loading, empty, populated, validation-error, submitting, success, API-error, and unauthorized/direct-navigation states wherever the state exists. Cover complete create/read/edit journeys for Grupo, Unidad and Inquilino; cover location/map, images, price modalities, consent/guarantor fields, reload persistence, cancel/close and retry behavior. Validate real state changes in the deterministic fixture, not only toast text.

Keep Gestor owner-only data separate from public and delegated actor fixtures. Do not expose dev routes in Gestor navigation.

## T027 — Rental modality journeys

Create `apps/web/e2e/product_readiness_rentals.spec.ts`. Treat each modality as a distinct domain journey, never as one generic date form:

- **Monthly**: monthly labels/price semantics and relevant date fields only.
- **Daily**: check-in/check-out or start/end date semantics and daily total only.
- **Hourly**: date plus start/end time, hourly price/total, and explicit `America/Argentina/Buenos_Aires` boundary handling.

For each modality cover valid creation, edit/reload, invalid range, exact boundary adjacency that is allowed, and true overlap that is rejected. Include cross-midnight/DST-safe expectations where relevant to the domain; never compare naive local strings as UTC accidentally.

## T028 — Optional and reusable seña

Cover independently:

- no seña selected and payload omits/nulls the fields correctly;
- explicit seña present with valid amount/percentage and visible summary;
- invalid seña validation;
- an explicit Grupo default applied to multiple units/rentals;
- visible inheritance source, per-rental override and opt-out without mutating unrelated units;
- persistence after reload.

Do not invent mandatory seña behavior. The Gestor decides whether to use one. Group configuration is an explicit convenience, not an implicit global default.

## T029 — Complete visual/accessibility baseline

Use Playwright screenshots for **every Gestor route, form, dialog, drawer and material state** discovered above. Matrix widths are 375, 768, 1024 and 1440; themes are real persisted light and dark.

At minimum include FORM-001 through FORM-007, FORM-013, CTRL-003, CTRL-004 and CTRL-005 where applicable. Test desktop and responsive web separately. Native Android is out of scope.

For every cell:

- settle fonts, lazy media, animations and asynchronous fixture data;
- capture full-page PNG under `specs/005-web-product-readiness/evidence/screenshots/gestor/baseline/`;
- test document overflow plus direct viewport containment for fixed/sticky headers, sidebars, dialogs and action bars;
- check 44×44 touch targets at 375/768;
- check keyboard order, focus visibility, labels/errors, modal focus containment/escape restoration and WCAG AA computed contrast;
- detect text/control clipping and controls hidden behind fixed navigation;
- prove light and dark are real and not identical.

Build one labeled PNG contact sheet per audited inventory/state ID under `specs/005-web-product-readiness/evidence/contact-sheets/gestor/baseline/` plus an HTML index. Preserve baseline screenshots even when a product assertion fails.

## T030 — Evidence and classification

Create/update:

- `specs/005-web-product-readiness/evidence/reports/gestor-findings.md`
- master `evidence/reports/findings.md`
- `evidence/manifests/acceptance-matrix.md`
- `evidence/test-results/gestor-baseline.md`
- any inventory row discovered missing from the existing manifests.

Every finding needs a stable new FIND-005 ID, inventory/state, actor, width/theme when visual, severity, reproducible steps, expected/actual result, screenshot/test evidence, and intended remediation task T031–T037. Distinguish product defects from harness/environment defects. Do not mark product defects fixed in this batch.

Mark T026–T030 complete only if the coverage/evidence itself is complete and terminally reproducible. Baseline product test failures do **not** block audit completion when they are fully classified.

## Execution integrity

- Use the configured Playwright project `Desktop Chrome`; report exact discovered, executed, passed, failed and skipped counts.
- Never convert assertions to optional no-ops. Conditional branches may only represent a documented state and must assert which branch occurred.
- Do not use root `overflow-x-hidden` as proof that child controls are visible.
- Run direct TypeScript validation for new suites/helpers and their focused fixture tests.
- Docker and WSL remain off for this baseline; use deterministic test adapters/network fixtures. Do not claim live database/API integration.
- Clean only task-owned temporary output; preserve baseline evidence. Release ports 3000/3001 and terminate task-owned Playwright/web processes.

## Terminal delivery

Return only after completion with:

1. exact files created/changed;
2. exact route/form/state inventory audited;
3. exact rental/seña cases and assertions;
4. terminal Playwright discovery/execution totals and baseline result;
5. screenshot count, unique SHA-256 count, light/dark collision count and contact-sheet count;
6. findings by severity mapped to T031–T037;
7. TypeScript/helper results;
8. cleanup state;
9. an explicit statement that no product remediation and no T031+ work occurred.
