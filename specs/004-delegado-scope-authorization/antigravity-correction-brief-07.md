# Antigravity Correction Brief 07 — Visual Truth and Clean Exit

Implement only Phase 15 (T104–T106) with `gemini-3.8-flash-medium`, medium effort. Work strictly in
the TFI project. Docker/Supabase and API/database code are out of scope; their gates already pass.

## Reproduced Playwright lifecycle defect

Codex ran the direct installed binary:

```powershell
apps/web/node_modules/.bin/playwright.CMD test e2e/delegado_scope_authorization.spec.ts
```

All 22 tests printed `ok`, but the process never returned an exit code. Port 3000 remained owned by
the Next.js process tree:

```text
cmd.exe /c next dev -H 0.0.0.0
  node .../next/dist/bin/next dev -H 0.0.0.0
    node .../next/dist/server/lib/start-server.js  (LISTEN 3000)
```

`playwright.config.ts` currently uses `command: 'npm run dev'` and `reuseExistingServer: true` while
`globalTeardown.ts` is empty. Establish one deterministic Windows-safe owner for the Next server.
The final direct command must return naturally with exit 0 and leave no port 3000/3001 listener;
Codex must not need Ctrl+C or manual process cleanup.

## Reproduced visual defects from today's original PNGs

These are pixel-observed defects, not assumptions:

1. UI-002/UI-003 and UI-008–UI-010 dark captures use a light/gray dialog surface while child text
   switches to warm white/gray. Titles and descriptions become nearly invisible. The shared
   `DialogContent` contributes `bg-popover text-popover-foreground`; component-level duplicate
   background utilities do not reliably override it. Fix the shared/component styling so dark
   dialogs use the Rendo dark surface (`#131F3C`/`#182747`) with `#F5F3EE` primary and `#AEB7C7`
   secondary text, or an equally valid AA pairing. Do not solve this by changing the screenshot.
2. `UI-009__...__375w__{light,dark}.png` shows **Toda la Cuenta**, not the selected Grupo. The test
   selects `grp-1` before `captureVisualEvidence`, but changing the viewport to 375 resets or loses
   the state. Capture each viewport only after its required interaction state is established. At
   375 both themes must visibly contain `Edificio Torre Norte`, the plain-language Grupo summary,
   and the reachable `Revisar y Confirmar` action in the same PNG.
3. `UI-017__...__375w__{light,dark}.png` places the modal flush against or beyond the viewport edges;
   the dark capture loses part of `Nuevo Alquiler`, and the close control is at the extreme/right
   edge. Keep the dialog width mathematically inset (including border/padding), prevent competing
   `w-full`/`w-[95vw]` utilities, avoid truncated headings, and keep title, close action and success
   feedback fully inside 375 px in both themes.
4. Add objective assertions before capture: dialog bounding box inside viewport, title/close box
   inside dialog and viewport, no clipped/ellipsis title, and expected UI-009 selected value/summary
   after every viewport change. Preserve existing touch-target, overflow and strict error checks.

## Required terminal evidence

1. Web lint exit 0.
2. Web production build exit 0.
3. Direct feature Playwright command: 22/22, natural exit 0.
4. Ports 3000 and 3001 have zero listeners after exit.
5. Exactly 176 fresh PNGs and 22 freshly generated contact sheets.

Visually self-review all 22 contact sheets, but focus on the exact originals above. Do not mark
T104–T106 complete or update reports to PASS if the command hangs or any named pixel defect remains.
Return one terminal structured PASS or FAIL report.
