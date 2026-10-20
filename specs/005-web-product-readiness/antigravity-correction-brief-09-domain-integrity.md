# Correction Brief 09 — Rental and seña integrity

## Decision

Batch 03B1 is **not accepted yet**. Preserve the 144 accepted-domain PNGs, 18 contact sheets and all passing functional evidence. Correct only the integrity defects below, rerun the focused checks, and stop before T035.

## 1. Overlap protection must fail closed

`AlquileresService.checkOverlap()` currently returns when the database query errors. That can admit a conflicting rental.

- Throw an actionable server error when the overlap query fails; never interpret an unknown result as availability.
- Keep exact half-open semantics `[inicio_at, fin_at)`: adjacency is allowed and every positive intersection is rejected.
- For legacy rows lacking timestamps, interpret inclusive `fecha_fin` as the next Buenos Aires midnight. Do not truncate the last occupied day.
- Add tests proving query errors reject creation/update, legacy final-day overlap is rejected, adjacency is allowed, and update excludes itself.

## 2. Database concurrency protection must be mandatory

The migration catches every error while creating `btree_gist` and the exclusion constraint, allowing the migration to report success without concurrency protection.

- Remove broad exception swallowing around `CREATE EXTENSION` and the exclusion constraint. An inability to install the required protection or conflicting pre-existing data must fail the migration visibly.
- Retain idempotency by checking whether the named constraint exists before adding it; do not hide an actual add-constraint failure.
- Ensure all backfillable historical rows receive valid timestamps, then require `inicio_at` and `fin_at` for persisted rentals. If any unbackfillable historical rows exist, fail with a precise migration error instead of silently permitting null intervals.
- The exclusion constraint must cover the same business set as the service: non-deleted and non-cancelled rentals, with half-open ranges.
- Add a static/repository SQL assertion proving the migration contains the mandatory exclusion rule and no catch-all that downgrades its failure to a notice. Live application remains deferred while Docker/WSL are off.

## 3. Seña state must be coherent and positive when selected

The UI/API/database currently allow an active Grupo default or a personalized seña with value `0`, and the database does not constrain the choice/type/value/origin combinations.

- `sin_sena`: resolved amount is zero and type/value/origin are null.
- `heredar_grupo`: requires an active Grupo default with a strictly positive valid value, records type/value/source Grupo, and resolves amount server-side.
- `personalizada`: requires an explicit type and strictly positive value; percentage must be `> 0` and `<= 100`; fixed/resolved amount must not exceed the rental total.
- Grupo default may remain inactive with value zero, but when active its value must be strictly positive and percentage at most 100.
- Enforce these invariants in create and update DTO/service paths and with database check constraints. Update must recompute the resolved amount authoritatively; do not spread client-supplied seña fields directly into storage.
- Add API tests for active-zero Grupo rejection, custom-zero rejection, inconsistent seña metadata rejection, inherited source persistence, opt-out clearing metadata, and update recomputation/isolation.
- In `GrupoFormModal`, validate active value `> 0`, use a matching positive input minimum, and show an inline actionable error.

## 4. Canonical modality and Buenos Aires dates

- Unknown legacy/free-form Unidad modality values must never silently normalize to `mensual` for compatibility checks. Accept only the documented aliases; unknown values are unsupported and cannot authorize a rental modality.
- Derive compatibility `fecha_inicio`/`fecha_fin` from the `America/Argentina/Buenos_Aires` calendar dates represented by the interval, not UTC `toISOString().split('T')[0]`.
- Apply the same conversion on create and update, including cross-midnight hourly rentals.
- Add focused tests around the UTC date boundary and an unknown Unidad modality.

## 5. Verification and evidence

Run and report exact results for:

1. API rental and Grupo unit tests, then the complete API test suite and API build.
2. Types/package tests affected by normalization.
3. Direct web TypeScript/build.
4. The existing 11 rental/seña Playwright tests without weakened assertions.
5. A focused Playwright test for active Grupo seña value `0` showing inline validation and preventing submission.

Because the only intended visual change is Grupo validation, preserve the existing 144 PNGs and 18 sheets. Add a new non-overwriting `FORM-003-sena-zero-error` matrix at 375/768/1024/1440 in real light/dark (8 PNGs, one contact sheet), inspect it, and report hashes/theme collisions. Do not regenerate unrelated evidence.

Update findings/acceptance/`ESTADO-REAL.md` only after all checks pass. Keep T031–T034 checked only if the corrected contract is satisfied; do not start or check T035.

## Environment hygiene

Keep Docker/WSL off. Remove task-owned `test-results`, release ports 3000/3001, and terminate only task-owned browser/web/test processes. Preserve accepted evidence.

## Terminal delivery

Return:

1. files changed;
2. each integrity defect and its exact correction;
3. exact test/build totals;
4. retained and added screenshot/hash/contact-sheet counts;
5. migration fail-fast confirmation;
6. cleanup state;
7. explicit confirmation T035+ was not started.
