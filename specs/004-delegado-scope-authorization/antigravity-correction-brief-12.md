# Antigravity Correction Brief 12 — Stable UI-017 Success State

Use `gemini-3.8-flash-medium` at `medium` effort. Implement only this bounded correction.
Do not run or update the full closeout reports in this batch.

## Verified diagnosis

Codex independently reproduced UI-017 with:

```powershell
pnpm --filter web exec playwright test e2e/delegado_scope_authorization.spec.ts --grep "UI-017" --workers=1
```

Result: 1 failed at `captureVisualEvidence` line 100. The product geometry is correct at 375px in
the retained light/dark screenshots. Timestamp evidence shows seven UI-017 captures were refreshed
and only `1440w__dark` remained stale. The failure occurs on the eighth capture, not at 375px.

The root cause is the success callback in
`apps/web/src/components/gestor/AlquilerFormModal.tsx`: after setting the success message, a
two-second `setTimeout` closes the dialog, clears success and refreshes the router. The evidence
loop captures eight viewport/theme combinations; the final combination measures the dialog during
`data-closed:zoom-out-95`, so its transformed bounding box never satisfies the stable geometry
predicate before disappearance.

## Required product correction

Modify only the files needed for this stable success state and its focused test:

- `apps/web/src/components/gestor/AlquilerFormModal.tsx`
- `apps/web/e2e/delegado_scope_authorization.spec.ts` only if a product-facing assertion is needed;
  do not weaken or remove existing geometry assertions

Requirements:

1. Remove the timed automatic dialog close/reset after a successful Alquiler operation.
2. Refresh the underlying route/data without destroying the visible success state.
3. Keep the success state stable until the user explicitly dismisses it.
4. Add an accessible, localized-in-current-style explicit close action in the success panel with a
   minimum 44x44 target. The existing top-right close control must remain usable.
5. When the dialog closes by either control, reset `successMessage` so reopening shows the form.
6. Preserve the already-correct viewport-safe width classes and all existing UI-017 title, close,
   inset, overflow and touch-target assertions.
7. Do not add sleeps, raise the poll timeout to mask the timer, skip the final theme, remove the
   animation, or change screenshot ordering as a substitute for the product fix.

## Required verification

Run sequentially:

1. `pnpm --filter web lint`
2. Run UI-017 alone three consecutive times with one worker. Every run must print `1 passed`, exit
   naturally with code 0, generate all eight UI-017 captures, and leave no listener on 3000/3001.
3. Confirm the eight UI-017 files all have timestamps from the final run and inspect the 375 light,
   375 dark, 1440 light and 1440 dark images for stable success content.

Remove only the focused run's `apps/web/test-results`, `.last-run.json`, and run-owned PID/stop
markers after recording results. Preserve retained UI-017 screenshots.

## Terminal delivery

Return one terminal `STATUS: PASS` or `STATUS: FAIL` report with changed files, exact commands and
exit codes, results for all three focused runs, eight screenshot timestamps, port/process cleanup,
and any remaining defect. Do not update `tasks.md`, evidence reports, `ESTADO-REAL.md`, database,
API, other screenshots, or unrelated code in this batch.

Completion criterion: the product success state remains stable until explicit dismissal and UI-017
passes three consecutive fresh runs without weakening its assertions.
