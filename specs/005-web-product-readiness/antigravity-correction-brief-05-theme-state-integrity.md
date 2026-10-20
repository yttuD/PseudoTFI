# Antigravity correction brief 05 — theme, interaction and full-page state integrity

## Supervisor decision

T018 and T020 are reopened again. The 128-file denominator and terminal execution are now real, but the visual content is not yet trustworthy enough for acceptance.

Independent review found:

1. There are 128 unique filenames but only 103 distinct SHA-256 image contents. The reports incorrectly call all 128 PNGs unique without distinguishing filename uniqueness from content uniqueness.
2. Multiple light/dark pairs are byte-identical, including Login, Registro validation, legal pages, Favoritos, Invitaciones and active Catalog filters. Source inspection shows `next-themes` owns the root class and persists preference under local storage. `setThemeAndWait` only mutates the current DOM class/data attribute; a later provider render can restore the persisted/system theme. Therefore those dark-labelled captures are not proof of dark-mode product behavior.
3. `FORM-009__...__wizard-open__375w__light.png` does not visibly contain an open listbox despite the test asserting one before capture. The popup is not preserved by the full-page capture. The screenshot label overclaims the visible state.
4. FORM-014 interaction screenshots are byte-identical to SURF-026 default screenshots in several cells. The test merely asserts that action buttons exist; it performs no action. This violates the required interaction-state evidence.
5. Full-page Home evidence contains unloaded/lazy blank media because the test screenshots without progressively scrolling and waiting for visible images/media. A full-page PNG of unloaded placeholders is not a settled visual baseline.

## Scope

Correct only:

- `apps/web/e2e/fixtures/product-readiness.ts`
- `apps/web/e2e/fixtures/product-readiness.spec.ts`
- `apps/web/e2e/product_readiness_public.spec.ts`
- public audit screenshots and reports under `specs/005-web-product-readiness/evidence/`
- `specs/005-web-product-readiness/tasks.md`
- `ESTADO-REAL.md`

Do not modify `apps/web/src/**`, API/database product code, or unrelated tests. Docker and WSL remain off.

## Required corrections

### A. Deterministic real theme

1. Make theme setup compatible with `next-themes` rather than relying on a transient root-class mutation.
2. Persist the requested theme using the actual storage key (`theme`) and establish it before the final rendered capture. A bounded reload is acceptable and preferred if required for provider state to resolve correctly.
3. After all settling and immediately before each screenshot, hard-assert all of the following:
   - the persisted preference equals the requested theme;
   - the root class still contains the requested theme;
   - the computed `--background` value matches the requested Rendo light/dark token family and differs between the paired light/dark cells.
4. Add pure/helper coverage for persistence and the theme-state evaluation. Do not hardcode a false pass based only on the requested parameter.
5. After recapture, verify every same ID/state/viewport light-vs-dark pair has a different SHA-256 content hash. A byte-identical pair is a hard evidence failure, not automatically a product finding.

### B. Settled full-page media

1. Add a bounded Playwright helper that progressively scrolls through the document, waits for lazy images/media in each viewport segment to either load or reach a documented bounded failure state, then returns to the top and settles before capture.
2. Use it for all complete-page surface/form screenshots. Do not wait indefinitely on inaccessible third-party assets.
3. Hard-assert that visible unit-card images expected from the deterministic mock are loaded (`complete`, non-zero natural dimensions) before Home/Catalog captures. If the mock URL itself is invalid, correct only the test fixture URL/data, never product source.

### C. Truthful visible interaction states

1. FORM-009: do not claim an open popup that disappears from the PNG. Produce a stable visibly interacted state by entering a deterministic keyword and selecting/applying a category, then hard-assert the chosen value/active control is visibly rendered. Rename the state and filenames to `wizard-active` if needed; remove obsolete `wizard-open` PNGs and update reports/contracts consistently.
2. FORM-014: perform a real invitation action. Intercept the accept endpoint with a controllable pending response, click Aceptar, hard-assert visible `Aceptando...`/disabled processing state, capture it, then release/fulfil the request so the test cleans up. Rename the state to `invitation-accepting` if needed. The interaction image must not be byte-identical to the corresponding SURF-026 default image.
3. Preserve the valid FORM-008 modal, FORM-010/011 error, and FORM-015 active-filter interactions, but recapture them under the corrected deterministic theme and media setup.

### D. Evidence truth and findings

1. Resolve the exact baseline directory, delete only its obsolete PNGs, and recapture all 128 cells from a clean directory so no previous-run files can mask missing evidence.
2. Report separately:
   - 128 expected unique filenames;
   - 128 valid PNG files;
   - actual distinct SHA-256 content count;
   - zero identical light/dark pairs;
   - zero FORM-014/default identical pairs.
3. Revalidate FIND-005-026 and FIND-005-027 against genuinely dark captures. Keep stable IDs. If fresh evidence contradicts a finding, mark it `not-reproducible` with the correction evidence; otherwise keep it open with accurate cells.
4. Add a test-evidence correction note explaining that the prior 103-content result was fixture-related and superseded. Do not describe prior mislabeled images as product dark-mode failures.
5. T018/T020 may be checked only after the corrected matrix, reports and hash-pair gates all pass as evidence infrastructure. Product soft assertions may still fail and remain open findings.

## Verification and delivery

Run helper tests, direct TypeScript compilation, lint, and the full corrected public suite. Run the long suite synchronously to terminal completion; do not exit while a background task remains.

Deliver once with:

- exact terminal test totals and exit codes;
- 128/128 expected filename proof;
- actual distinct hash count and explicit zero identical theme pairs;
- explicit zero FORM-014/default identical pairs;
- changed files and confirmation product source was untouched;
- newly validated/not-reproducible finding statuses;
- cleanup proof for test temporaries, ports 3000/3001, Playwright/Node test processes, and Docker/WSL.
