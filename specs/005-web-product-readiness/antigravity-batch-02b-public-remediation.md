# Antigravity batch 02B — public product remediation and acceptance (T021–T025)

## Objective

Remediate and independently accept the complete public/auth web experience using the truthful Brief 06 baseline. This is a product-change batch. Complete T021, T022, T023, T024 and T025 only; do not begin Gestor operational work (T026+) yet.

Use Playwright for every visual verification. Preserve public, Gestor/Delegado and dev separation. Test desktop web and responsive mobile/tablet web independently. This is not native Android work.

## Sources of truth

Read before editing:

- `specs/005-web-product-readiness/spec.md`
- `specs/005-web-product-readiness/plan.md`
- `specs/005-web-product-readiness/data-model.md`
- `specs/005-web-product-readiness/evidence/reports/public-findings.md`
- `specs/005-web-product-readiness/evidence/reports/findings.md`
- `specs/005-web-product-readiness/evidence/test-results/public-baseline.md`
- `specs/005-web-product-readiness/contracts/acceptance-matrix.md`
- the Rendo palette encoded in current semantic tokens and the supplied source image: light `#F7F5F0/#FFFFFF/#131F3C/#B89355/#9F783E/#667085/#D9D5CC/#EEEAE1`; dark `#0B1428/#131F3C/#182747/#B89355/#D2AD68/#F5F3EE/#AEB7C7/#293956/#C9A35F`.

For touched styles, use semantic Rendo tokens or these approved palette values. Do not introduce arbitrary colors. Do not globally retheme private surfaces in this bounded batch; shared global-token harmonization belongs to cross-cutting acceptance unless a change is proven safe by regression evidence.

## Mandatory pre-remediation revalidation

The current overflow helper treats any protruding descendant as page overflow even when an ancestor intentionally clips it. Before changing product for FIND-005-013, FIND-005-016, FIND-005-018 or FIND-005-020:

1. Correct `checkHorizontalOverflow` so a left/right protrusion counts only when it can escape to the document viewport. Ignore descendants clipped by an ancestor with effective `overflow-x: hidden|clip` and SVG/map internals clipped by their viewport/container. Keep actual `documentElement.scrollWidth > innerWidth` failures.
2. Add deterministic helper tests for unclipped left/right overflow, clipped decorative descendants, SVG internals and Leaflet-like translated tiles.
3. Re-run the exact affected cells.
4. If fresh evidence proves no document-level overflow, mark the stable finding `not-reproducible` with the contrary evidence. Do not edit product merely to satisfy a flawed helper.
5. If actual page overflow remains, fix the minimal product boundary and retain the finding through `fixed -> verified`.

## Product remediation requirements

### T021 — public navigation, isolation and detail behavior

1. **FIND-005-011**: anonymous and `public_user` surfaces must not expose direct operational `/dashboard` or `/dev` hrefs. Replace public header/footer/bottom-navigation operational links with an explicit Gestor access path through auth/onboarding, carrying a validated local `next` destination if appropriate. A Gestor may still reach the private dashboard after authorization. Labels must clearly distinguish public browsing from Gestor access; no anonymous bottom item labelled `Terminal` may directly target the private workspace.
2. **FIND-005-012**: normalize the Unit contact contract so the WhatsApp CTA renders when the API fixture supplies `whatsapp`. Prefer one canonical view-model field or an explicit backwards-compatible adapter; do not duplicate ambiguous phone logic. Keep privacy rules and validate the generated `wa.me` target.
3. Preserve anonymous exact-location privacy, favorite/report auth boundaries and public/Delegado/Gestor route denial behavior.

### T022 — auth, onboarding and invitation UX

1. Fix actual auth/onboarding overflow only if the clipped-aware revalidation proves it.
2. **FIND-005-019**: auth toggles, inputs and primary actions must provide at least 44x44 px mobile/tablet targets without bloating desktop layout.
3. **FIND-005-022**: login/registration primary action must be reachable by real sequential Tab navigation with a visible focus indicator. Preserve logical focus order and no keyboard traps.
4. Add **FIND-005-028** (`responsive`, severity `high`, status `open`) from supervisor evidence `SURF-009__public_user__default__375w__dark.png`: onboarding primary CTA text and trailing arrow escape/overlap the button/card at 375 px. Correct it using responsive wrapping/stacking and contained icon placement. Verify the complete CTA is readable and tappable in ES at 375 px and 768 px, both themes.
5. Keep invitation acceptance/rejection and role-conversion copy accurate: Buscador converts to Gestor; this does not grant Delegado rights or expose billing data.

### T023 — responsive, themes, accessibility and localization

1. **FIND-005-014/015/017/021**: correct genuine undersized touch targets to at least 44x44 px for search/filter controls, detail actions/tabs and legal back navigation while preserving compact desktop density.
2. **FIND-005-023**: at 768 px, use a deliberate tablet header/navigation treatment. No wrapped two-line primary nav labels, collisions or hero overlap. It may switch to the responsive/mobile navigation pattern.
3. **FIND-005-024**: when a unit has one photo, do not render empty/muted secondary gallery columns at 768 px. Use a balanced single-image layout; preserve multi-image behavior.
4. **FIND-005-025**: detail tabs at 375 px must all remain readable and reachable. Use a contained scrollable tablist, responsive labels or stacked controls; no clipped rightmost text, and keyboard semantics remain correct.
5. **FIND-005-026**: correct Home dark-theme primary CTA contrast to WCAG AA (normal control text >= 4.5:1) using the approved dark palette. Do not solve it by hiding the CTA.
6. **FIND-005-027**: correct every reproducible contrast failure in the public matrix. Use 4.5:1 for normal text/control labels and 3:1 only for genuinely qualifying large text. Re-run the comprehensive scanner and retain per-cell diagnostics for any exception.
7. Fix any missing ES strings introduced by touched public components and keep existing locale routing intact. Do not broaden into full PT/EN completion (T058).

## Required tests and visual evidence (T024)

1. Update existing focused Playwright assertions; do not weaken gates, remove actor boundaries or turn failures into unconditional skips.
2. Run helper tests, direct TypeScript compilation, web lint and production web build.
3. Run the full public suite with the real project:

   `pnpm --filter web exec playwright test e2e/product_readiness_public.spec.ts --project="Desktop Chrome" --reporter=list`

4. Product acceptance target is 144/144 passing. If a true low defect remains, it may be documented for T025, but T021–T023 cannot close with any critical/high/medium finding open and no unsupported screenshot cell may be called PASS.
5. Generate fresh post-remediation screenshots into a separate `evidence/screenshots/public/accepted/` directory, preserving all 128 cells and valid visible states. Do not overwrite the baseline directory.
6. Generate one contact sheet per inventory/state ID under `evidence/contact-sheets/public/accepted/` using the existing review tooling. Expected: 16 contact sheets, each containing all 8 responsive/theme cells with readable labels.
7. Confirm 128 valid accepted PNGs, 128 distinct hashes, zero light/dark collisions and no baseline/accepted path mixing.

## Acceptance and reporting (T025)

1. Transition each FIND-005-011 through FIND-005-028 truthfully (`fixed -> verified`, `not-reproducible`, or still open). Never delete stable IDs.
2. Update the public report, master findings, acceptance matrix and `ESTADO-REAL.md` with exact commands and results.
3. Mark T021–T025 complete only when the public/auth story is independently accepted.
4. Product code changes must remain within public/auth/shared UI needed by these findings. Do not modify API/database unless the WhatsApp contract cannot be safely adapted at the web view-model boundary; if that occurs, stop and report rather than silently expand scope.

## Resource and cleanup rules

- Keep Docker, Supabase and WSL off; this batch uses deterministic web/mock fixtures.
- One Playwright execution at a time.
- Remove only task-owned `apps/web/test-results`, temporary screenshots outside evidence, mock/test servers and generated scratch files after results are preserved.
- Leave ports 3000 and 3001 free and no Playwright/Node test children running.

## Delivery

Return once with changed product/test files, finding disposition table, exact helper/typecheck/lint/build/Playwright results, 128 accepted screenshot count, 16 contact-sheet count, representative evidence paths, product-scope confirmation and cleanup proof. Do not exit with a background task running.
