# Antigravity Correction Brief 08 — Finish the Interrupted Phase 15 Patch

The previous Phase 15 run was interrupted after eight silent minutes. Finish only the implementation
patch; do not update reports and do not regenerate all screenshots in this batch. Codex will run the
full verification after the code is complete.

## Existing partial changes to review

- `playwright.config.ts` now calls the Next binary directly and sets `reuseExistingServer: false`.
- `global.teardown.ts` now scans ports and force-kills every listener. This broad cleanup is unsafe:
  if startup fails because another application owns 3000/3001, teardown could kill an unrelated
  user process. Replace it with deterministic cleanup of only the process tree created by this test,
  or rely on Playwright's directly owned `webServer` if its natural termination is proven. Do not
  enumerate and kill arbitrary listeners.
- No visual component or E2E state changes were completed.

## Implement now

1. In `components/ui/dialog.tsx`, make the base dialog surface use the Rendo palette correctly in
   both themes and avoid duplicate utility conflicts. Dark must be a dark surface with warm primary
   and blue-gray secondary text. Component classes must not be overridden back to a light popover.
2. In `AlquilerFormModal.tsx`, make the 375px dialog inset on both sides with a single authoritative
   width/max-width rule; keep the title untruncated and reserve space for an inset 44x44 close action.
3. In `delegado_scope_authorization.spec.ts`, extend capture setup so UI-009's Grupo selection is
   re-established after every viewport change and the screenshot is scrolled/positioned to show
   `Edificio Torre Norte`, its summary and `Revisar y Confirmar` together. Add bounding-box assertions
   for UI-017 title, close button and dialog at every viewport/theme. Preserve existing 176 filenames.
4. Make the Next/mock server lifecycle task-owned and Windows-safe without a broad `taskkill` by
   port. Direct Playwright must eventually terminate naturally.

Run only web lint and build in this batch. Return a concise terminal PASS/FAIL with changed files.
Do not touch Docker, API, SQL, reports, screenshots, contact sheets, or unrelated code.
