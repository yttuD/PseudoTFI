# Antigravity Batch 02A — Public baseline audit (T017–T020)

## Governing artifacts

Read completely:

- `.specify/memory/constitution.md`
- `specs/005-web-product-readiness/{spec.md,plan.md,tasks.md,research.md,data-model.md,quickstart.md}`
- `specs/005-web-product-readiness/contracts/*.md`
- `specs/005-web-product-readiness/evidence/manifests/{routes-and-states,interactions,actor-surface-matrix,acceptance-matrix}.md`
- `specs/005-web-product-readiness/evidence/reports/findings.md`
- `apps/web/e2e/fixtures/{actors,product-readiness,mock-api-server}.ts`

## Exact scope

Execute T017, T018, T019 and T020 only. This is a baseline audit: **do not modify product source** and do not perform T021–T025.

Allowed writes:

- `apps/web/e2e/product_readiness_public.spec.ts`
- `apps/web/e2e/fixtures/**` only where deterministic public test data/SSR mocks are required
- `specs/005-web-product-readiness/evidence/screenshots/public/baseline/**`
- `specs/005-web-product-readiness/evidence/test-results/public-baseline.md`
- `specs/005-web-product-readiness/evidence/reports/public-findings.md`
- `specs/005-web-product-readiness/evidence/reports/findings.md`
- `specs/005-web-product-readiness/tasks.md` only to check T017–T020 when their artifacts exist

Protected: all `apps/web/src/**`, `apps/api/**`, `supabase/**`, packages, existing specs/evidence and configuration.

## Public denominator

At minimum audit current inventory IDs:

- SURF-001 Home/Marketplace
- SURF-002 Catálogo
- SURF-003 Detalle Unidad
- SURF-004 Favoritos
- SURF-005 Términos
- SURF-006 Privacidad
- SURF-007 Login
- SURF-008 Registro
- SURF-009 Onboarding Gestor as the post-registration boundary
- SURF-026 Bandeja de invitaciones
- FORM-008 Reporte
- FORM-009 Search Wizard
- FORM-010 Registro
- FORM-011 Login
- FORM-012 Onboarding
- FORM-014 Acciones de invitación
- FORM-015 Filtros
- CTRL-001 Favorito
- CTRL-002 WhatsApp
- CTRL-003 Idioma
- CTRL-004 Tema

Reconcile this list with manifests/source first; add a finding if it is wrong or incomplete.

## Required actor/state coverage

1. Anonymous default browsing, search/filter, no-results, detail/contact, report auth boundary, favorites auth boundary, login, register and legal pages.
2. `public_user` with canonical auth role `buscador`: favorites add/remove and empty/populated states, report submit/validation, invitation empty/list/accept/reject outcomes.
3. Direct access attempts from anonymous/public user to operational and dev destinations must not expose private content; test only representative boundary routes here because complete matrices belong to later stories.
4. Onboarding must route/guard correctly for anonymous, buscador and Gestor context without persisting fake product data.
5. Error behavior: API/network failure fixtures for marketplace list/detail, favorites, report and invitations; no raw stack traces or indefinite loading.

## Visual and accessibility matrix

- Every rendered public/auth destination: 375x667, 768x1024, 1024x768, 1440x900, light and dark.
- Use Feature 005 helpers for reduced motion, bounded settle, overflow, touch targets, computed contrast and screenshot naming.
- Capture final stable viewport states to `evidence/screenshots/public/baseline/`.
- Capture relevant open/interacted states for Search Wizard, filters, report, validation and invitations. Use named state suffixes.
- Verify visible keyboard focus through actual Tab navigation for representative primary controls on every surface family.
- Tests must hard-fail objective violations but continue collecting through `expect.soft` or case isolation; do not weaken thresholds.

## Execution

- Docker/Supabase/WSL remain off.
- Use the existing Playwright web server and deterministic mock server only.
- Run web lint/type check for the new suite, then the new public suite.
- Failures are allowed and expected in this audit; record exact failed assertions as findings. Do not relabel failing tests PASS.
- Classify findings critical/high/medium/low with exact case, actor, width/theme, expected/actual, screenshot and target files.
- Update the master findings register with stable IDs following FIND-005-010.
- Check T017–T020 only after test definitions, execution evidence, screenshots and the public finding report all exist. A red baseline does not prevent these audit tasks from being complete.

## Cleanup

Stop all Playwright browsers, Next/mock servers and task-owned processes. Remove `apps/web/test-results`, traces, `.last-run`, PID and temporary files. Retain baseline screenshots and reports. Confirm ports 3000/3001 free and WSL still stopped.

## Terminal delivery

Return once with:

1. T017–T020 state;
2. exact test totals: passed/failed/skipped and command exits;
3. screenshot counts by surface/state/actor/width/theme;
4. reproduced findings by severity and ID;
5. inventory discrepancies;
6. files created/changed;
7. cleanup/resource confirmation.
