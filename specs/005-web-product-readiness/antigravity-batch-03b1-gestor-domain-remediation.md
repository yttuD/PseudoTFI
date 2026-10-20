# Batch 03B1 — Gestor domain remediation (T031–T034 only)

## Scope and stop condition

Implement **T031, T032, T033 and T034 only**. Do not start T035+.

Product code changes are allowed in the exact task-owned web/API/type/migration paths. Preserve Feature 004 authorization and fail closed. Use the verified Batch 03A findings as the defect contract.

## Architecture decisions

### Rental modality is explicit

Use a canonical enum/union with exactly:

- `mensual`
- `diaria`
- `por_hora`

Do not infer modality from duration or labels. A Unidad may offer one or more compatible pricing modalities; Alquiler creation must select one offered by the chosen Unidad.

### Time interval semantics

- Persist one normalized, timezone-aware interval with start inclusive and end exclusive: `[inicio_at, fin_at)`.
- Canonical timezone is `America/Argentina/Buenos_Aires`; do not serialize naive local values as UTC.
- Exact adjacency (`existing.fin_at === new.inicio_at`) is allowed.
- Any positive interval intersection for the same Unidad and active/non-deleted rental is rejected.
- Enforce overlap in the service and, when practical, with a PostgreSQL exclusion constraint so concurrent requests cannot bypass it.
- Maintain compatibility/backfill for existing `fecha_inicio`/`fecha_fin`; do not destroy existing data.

Field/UI semantics:

- `mensual`: month/date range and monthly tariff/summary; no time pickers.
- `diaria`: check-in/check-out dates and daily tariff/quantity/summary; no hour controls.
- `por_hora`: local date, start time, end time, hourly tariff/quantity/summary; cross-midnight must be explicit and valid.

### Seña is optional and explicit

Use an explicit rental choice:

- `sin_sena`
- `heredar_grupo`
- `personalizada`

Never silently force a seña. `sin_sena` must persist as absent/null semantics, not become a mandatory zero-value policy.

Grupo may optionally store a reusable default:

- active/inactive;
- type `porcentaje` or `monto_fijo`;
- positive value with percentage bounded to 0–100;
- clear UI explanation of which units/rentals inherit it.

Server-side resolution is authoritative:

- Resolve the selected Unidad's explicit Grupo.
- `heredar_grupo` requires an active valid Grupo default and records the source Grupo.
- `personalizada` records its own type/value.
- `sin_sena` opts out without mutating the Grupo.
- Changes to one rental never mutate the Grupo default or sibling units/rentals.
- Persist the resolved monetary amount plus origin metadata so reload/audit remains intelligible.

### Migration

The current schema cannot represent hourly timezone-aware intervals or Grupo seña defaults. Add one forward-only migration after the existing `20260925120000` migration. It must be idempotent where practical, include constraints/indexes/backfill, and preserve old rows. Do not edit an already-existing migration.

Docker/WSL remain off in this batch. Validate migration statically and with repository SQL tests if they do not require the full local stack. Live migration/integration is deferred to final integration.

## T031 — Grupo, Unidad and location workflow

- Extend Grupo create/update API DTOs and UI for optional default seña configuration.
- Keep Grupo CRUD, Unidad assignment and Unidad pricing modalities coherent.
- Normalize Unidad pricing modality values to the canonical rental union without breaking existing Spanish legacy values; add a compatibility adapter if required.
- Correct affected responsive/touch behavior on SURF-011/012/013 and FORM-003/005/006.
- Improve the 375px location selector so selected coordinates/address remain visibly summarized outside the map dialog. Do not require the live Nominatim network in tests.
- Provide clear loading, validation, success and API-error states; remove debug `console.log`/`alert` UX from touched flows.

## T032 — Inquilino workflow

- Correct SURF-015 / FORM-004 responsive overflow and touch issues.
- Verify create/read/edit, guarantor/consent fields, validation, submitting, success, error and retry states.
- Do not weaken delegated scope checks.

## T033 — Monthly/daily/hourly rental and availability

- Implement explicit modality selection and conditional fields/summaries in `AlquilerFormModal`.
- Extend API DTO/service/types and relevant Unidad data to validate offered modality, timezone-aware interval, positive totals and half-open overlap boundaries.
- Make service overlap detection exclude the current row during edit and ignore cancelled/soft-deleted rentals.
- Return actionable 400/409 errors and surface them inline in the modal.
- Preserve/edit/reload the selected modality and interval.
- Update list/card displays to show modality-appropriate date/time and tariff language.

## T034 — Optional and Grupo-configurable seña

- Implement Grupo default seña UI/API/persistence.
- In rental form show `Sin seña`, `Heredar del grupo` only when available, and `Personalizada`.
- Show inheritance source and calculated amount before submit.
- Support override and opt-out without side effects.
- Validate custom amount/percentage and amount <= rental total.
- Persist and display source/type/value/resolved amount after reload.

## Required tests and evidence

1. Extend API/unit tests for:
   - canonical modality validation;
   - monthly, daily, hourly interval normalization;
   - allowed adjacency and rejected overlap;
   - edit excluding itself;
   - cancelled/deleted exclusion;
   - cross-midnight hourly interval in Buenos Aires;
   - seña absent, inherited, custom amount, custom percentage, invalid percentage/amount, override and opt-out isolation.
2. Make all 11 tests in `product_readiness_rentals.spec.ts` pass without weakening assertions.
3. Add/update focused Gestor tests for Grupo/Unidad/Inquilino CRUD and validation/error/retry states.
4. Use Playwright for visual verification. Capture fresh targeted accepted screenshots at 375, 768, 1024 and 1440 in real light/dark for:
   - SURF-011, SURF-012, SURF-013, SURF-015, SURF-016;
   - FORM-001, FORM-003, FORM-004, FORM-005, FORM-006;
   - modality states monthly/daily/hourly;
   - seña states absent/inherited/custom/validation-error;
   - relevant submitting/success/API-error states.
5. Store screenshots under `specs/005-web-product-readiness/evidence/screenshots/gestor/accepted-domain/` and contact sheets under `evidence/contact-sheets/gestor/accepted-domain/`. Never overwrite baseline.
6. Inspect every generated contact sheet; record exact counts/hashes/theme collisions. Do not mark findings verified solely from DOM assertions.
7. Run focused Playwright with the real configured project, direct TypeScript, web lint/build, API tests/build and package/type tests affected by the change.

Update findings, acceptance matrix, `ESTADO-REAL.md`, and mark T031–T034 complete only after product tests pass. Keep FIND-005-031/032 open for surfaces owned by later tasks.

## Environment hygiene

Use deterministic fixtures and mocked map tiles. Keep Docker/WSL off. After verification remove task-owned `test-results`, release ports 3000/3001 and terminate task-owned browsers/web/test processes. Preserve accepted and baseline evidence.

## Terminal delivery

Return only after completion with:

1. product/schema/test files changed;
2. migration design and compatibility notes;
3. exact functional behavior for all three modalities and all three seña choices;
4. exact test/build results;
5. screenshot/hash/contact-sheet inventory;
6. finding dispositions and remaining later-task findings;
7. cleanup state;
8. explicit confirmation T035+ was not started.
