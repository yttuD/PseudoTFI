# Antigravity correction brief 04 — truthful, complete public visual baseline

## Supervisor decision

T017 and T019 remain complete because their task is to add behavioral coverage. T018 and T020 are reopened. The Batch 02A delivery is not accepted as a complete visual baseline.

The rejection is evidence-based:

1. The report claims complete interaction-state coverage, but only 104 PNG files exist: 80 default-surface cells plus 24 cells for FORM-008, FORM-009 and FORM-015. The 24 required cells for FORM-010, FORM-011 and FORM-014 are absent. The complete denominator is 128 PNG files: 10 surfaces x 4 viewports x 2 themes, plus 6 interaction states x 4 viewports x 2 themes.
2. The single interacted-state test timed out/stopped before the last three form groups. A single failure or timeout must not prevent later cells from executing.
3. FORM-008 screenshots labelled `report-modal-open` do not show an open report dialog. FORM-009 screenshots labelled `wizard-open` do not show an opened wizard. FORM-015 screenshots labelled `filters-active` do not prove an active filter state. A filename is not evidence unless the asserted UI state is visible before capture.
4. SURF-009 was visually captured with the `gestor` actor although onboarding to Gestor is a public/Buscador journey. Use the canonical `public_user` actor (`buscador`) for this matrix cell, and keep the separate anonymous boundary test.
5. Contrast was checked only on the first heading. It missed visibly illegible controls in the 1440 dark Home screenshot, including the two secondary CTA labels. It also did not evaluate representative body text, inputs, buttons, links, tabs and dialog content.
6. Viewport-only images cut off long pages. The baseline must show the complete rendered surface/state at each responsive width.
7. Supervisor screenshot review also found unclassified product defects: cramped/wrapped desktop navigation at 768 px; an unbalanced half-image/half-empty hero region on unit detail at 768 px; clipped/illegible detail tabs on 375 px; and dark-theme CTA/control contrast failures. These must be deterministically reproduced and entered into the findings register, not silently folded into existing findings.

## Scope

Correct only the public baseline audit and its evidence:

- `apps/web/e2e/product_readiness_public.spec.ts`
- `apps/web/e2e/fixtures/product-readiness.ts` and its pure tests only if a reusable objective helper is required
- `apps/web/e2e/fixtures/actors.ts` and `mock-api-server.ts` only when required to make the declared public state deterministic
- `specs/005-web-product-readiness/evidence/screenshots/public/baseline/`
- `specs/005-web-product-readiness/evidence/test-results/public-baseline.md`
- `specs/005-web-product-readiness/evidence/reports/public-findings.md`
- `specs/005-web-product-readiness/evidence/reports/findings.md`
- `specs/005-web-product-readiness/tasks.md`
- `ESTADO-REAL.md`

Do not modify product code under `apps/web/src/**`, API product code, database files, or any unrelated feature. Do not start Docker or WSL.

## Required test corrections

1. Keep every default surface/theme/viewport cell isolated as its own Playwright test.
2. Split every interaction/theme/viewport cell into its own Playwright test as well. Never place all 48 interaction cells in one test.
3. Before every interaction screenshot, perform and assert the named state:
   - FORM-008: authenticated `public_user`; click Reportar; assert the report dialog is visible and contains its expected fields/actions.
   - FORM-009: perform the real action that opens the search wizard/drawer; assert the wizard container and its controls are visible.
   - FORM-010: submit the registration form in an invalid/empty state; assert visible validation feedback.
   - FORM-011: submit the login form in an invalid/empty state; assert visible validation feedback.
   - FORM-014: load the populated invitation inbox and expose the real invitation action/confirmation state selected for evidence; assert it is visible.
   - FORM-015: open the mobile filter drawer when applicable, or activate a real desktop filter; assert the filter UI and active state are visible.
4. Capture complete-page evidence (`fullPage: true`) after the state assertion and after bounded font/theme settling. Preserve the existing deterministic filename contract.
5. Use `public_user` for SURF-009 visual cells. The filename and report must agree with the actor fixture.
6. Expand objective contrast coverage. At minimum evaluate every visible heading and representative body, link, input, button, tab and dialog text/control in each theme. Large text may use 3:1 only when its computed size/weight qualifies; normal text and control labels require 4.5:1. Do not pass absent selectors.
7. Add deterministic assertions for the supervisor-observed defects:
   - no wrapped/cramped primary header navigation at 768 px;
   - no empty or malformed responsive hero split on SURF-003 at 768 px;
   - every detail tab is present, readable and contained at 375 px;
   - Home primary/secondary CTA labels and search controls pass contrast in dark mode.
8. Capture screenshots before soft product assertions can end a test, but only after the declared UI state itself is hard-asserted. Product defects may make the final baseline suite exit non-zero; missing/mislabelled evidence may not.

## Evidence reconciliation

1. Verify the exact baseline target resolves inside `specs/005-web-product-readiness/evidence/screenshots/public/baseline/`, then remove only the obsolete PNG files in that exact directory before recapture. Do not remove any other evidence or user files.
2. The corrected directory must contain exactly 128 uniquely named PNGs unless an additional explicitly documented state is added. No default screenshot may be counted as interaction evidence.
3. Update the two findings reports with all independently reproduced product defects, using new stable IDs after FIND-005-022. Do not change an open finding to resolved; this is still audit-only.
4. Correct all statements that currently claim complete/validated evidence when it was incomplete. Record the prior evidence rejection and the corrected denominator truthfully.
5. Mark T018 and T020 complete only after all 128 files exist, every interaction state has a preceding visibility/state assertion, reports match the actual files, and the suite has run to terminal completion.

## Verification and delivery

Run, in this order:

1. Pure helper tests if a helper changes.
2. Local TypeScript compiler.
3. Web lint.
4. The corrected public Playwright suite to terminal completion.
5. A script/check that proves exactly 128 expected unique filenames exist and reports missing/extra files.

Return once with:

- exact test totals, pass/fail/skip and exit codes;
- exact screenshot count and missing/extra check;
- a table mapping all 16 IDs (10 surfaces plus 6 forms) to 8 cells each;
- each newly reproduced finding with severity and affected cells;
- changed files;
- confirmation that product code was untouched;
- confirmation that Playwright/Next/Node mock processes, ports 3000/3001, and task-owned temporary results are clean, while Docker/WSL remained stopped.
