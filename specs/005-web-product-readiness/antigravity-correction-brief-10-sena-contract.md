# Correction Brief 10 — Truthful seña and rental contract

## Decision

Correction 09 is only partially accepted. Preserve its concurrency, timezone, fail-closed and Grupo-zero fixes. Batch 03B1 remains **not accepted** because the rental UI can display one seña choice/amount while sending different metadata to the API. Correct only this contract and its adjacent modality invariants; stop before T035.

## 1. Never invent or misassociate a Grupo

Current defects in `AlquilerFormModal`:

- `selectedGrupo` falls back to `gruposList[0]` when the Unidad has no matching `grupo_id`.
- The inheritance card invents `Edificio Los Álamos` and `20%` when no valid Grupo default exists.
- `heredar_grupo` is the initial choice, silently forcing an optional seña.
- The inheritance action treats a fixed Grupo amount as a percentage.

Required behavior:

- Resolve only the Grupo whose `id` exactly equals the selected Unidad's explicit `grupo_id`; otherwise use `null`.
- A Grupo default is available only when that exact Grupo is active, type-valid and has a strictly positive valid value.
- Show/enable `Heredar del grupo` and its source card only when such a default is actually available. Never render fallback names, values or percentages.
- Default every new rental to `sin_sena`, even if a Grupo default exists. Inheritance requires an explicit user choice.
- When the selected Unidad changes and the inherited option is no longer valid, switch safely to `sin_sena` and clear derived fields.
- Calculate inherited percentage and fixed amount according to their real type. The preview must equal the server-resolved monetary amount.

## 2. Personalized seña must send exactly what the user sees

Current defect: the visible custom `monto_sena` may be 65,000 while hidden defaults send `sena_tipo='porcentaje'` and `sena_valor=20`; the server therefore persists 20% rather than the visible amount.

- Under `personalizada`, expose an explicit type choice: `monto_fijo` or `porcentaje`.
- For fixed amount, the visible input is the fixed value and the preview/resolved amount is identical.
- For percentage, the visible input is the percentage (`> 0`, `<= 100`) and show the calculated monetary amount before submit.
- Submit one coherent contract: `sena_eleccion`, explicit `sena_tipo`, explicit positive `sena_valor`; `monto_sena` may be sent only as the matching calculated preview and must never contradict those fields.
- `sin_sena` submits null type/value and zero resolved amount. `heredar_grupo` submits the choice only; the server obtains type/value/source from the exact Unidad Grupo.
- Update Zod/UI validation and labels so error text names the field the user actually edits.
- The API must require explicit type/value for `personalizada`; remove the silent `monto_sena`/default-type fallback for new create/update requests. Keep historical database compatibility in the migration/backfill, not by accepting ambiguous new payloads.
- Database coherence must require `sena_origen_grupo_id IS NULL` for `personalizada`.

## 3. Rental modality and total invariants

- `modalidad` is required for new rentals; do not silently default omitted input to monthly.
- A Unidad with no valid offered pricing modality must reject rental creation. The selected modality must be explicitly offered.
- On update, validate the effective modality whenever either Unidad or modality changes; moving a rental to another Unidad cannot bypass compatibility.
- Unknown current modality must fail explicitly rather than fall back to monthly.
- Rental total must be strictly positive in UI, DTO/service and database constraint. Avoid a late generic database error for zero totals.

## 4. Required tests

Strengthen—not replace—the existing tests to prove actual request and persistence semantics:

1. Playwright intercepts the create request and asserts exact payloads for:
   - no seña;
   - exact valid Grupo inheritance;
   - custom fixed amount;
   - custom percentage and calculated preview.
2. Playwright proves a Unidad without a matching active Grupo has no inheritance option/card and never shows a fabricated Grupo/value.
3. Playwright proves changing Unidad invalidates an inherited selection safely.
4. API tests reject ambiguous personalized payload, zero total, omitted modality, modality not offered, empty modality list, unknown current modality, and changing to an incompatible Unidad.
5. API tests prove coherent fixed/percentage payload resolution and custom origin null.
6. Static SQL test proves personalized origin must be null and positive total is constrained.

Run the complete API suite/build, direct web TypeScript/build, and all rental/seña Playwright tests. Report exact totals.

## 5. Visual evidence

Use Playwright. Do not overwrite or delete prior evidence; document the old `FORM-001-sena-custom` as superseded for contract acceptance.

Add and inspect non-overwriting matrices at 375/768/1024/1440 in real light/dark for:

- `FORM-001-sena-custom-fixed`;
- `FORM-001-sena-custom-percentage`;
- `FORM-001-sena-unavailable` (no inheritance card/option).

That is 24 PNGs and 3 contact sheets. Report exact hashes and light/dark collisions. The screenshots must visibly include the relevant choice, input label/value and calculated preview.

## 6. Documentation and hygiene

Update findings, acceptance matrix and `ESTADO-REAL.md` with the corrected contract and superseded evidence note. Keep Docker/WSL off. Remove task-owned `test-results`, release ports 3000/3001 and terminate task-owned browser/web/test processes. Do not start or check T035.

## Terminal delivery

Return:

1. files changed;
2. exact UI-to-request-to-persistence behavior for all three choices;
3. exact API and Playwright assertions added;
4. exact test/build totals;
5. screenshot/hash/contact-sheet totals and inspection result;
6. cleanup state;
7. confirmation T035+ remains untouched.
