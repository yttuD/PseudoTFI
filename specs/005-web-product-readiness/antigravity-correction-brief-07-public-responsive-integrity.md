# Correction Brief 07 — Public responsive integrity

## Decision

The Batch 02B delivery is **not yet accepted**. Keep scope on T021–T025 only. Do not start T026+.

## Supervisor-observed defects

### 1. SURF-001 is not actually Home on mobile web

The accepted `SURF-001` screenshots at 375 px show `/es/unidades` (catalog), not `/es` (Home). The current middleware treats a regular mobile browser user agent as native mode and redirects the landing page. This invalidates the SURF-001 mobile cells and hides responsive Home defects.

Required behavior:

- Ordinary web browsers at 375, 768, 1024, and 1440 must remain on the requested public route `/es`.
- Web mobile and web desktop are separate responsive experiences of the same public website.
- Native-app routing is deferred. If an explicit native marker already exists, it may remain supported, but mobile user-agent detection alone must not activate native routing.
- Add a functional assertion after navigation that the normalized pathname is still `/es` for ordinary mobile web.
- Regenerate all affected SURF-001 accepted screenshots after the fix. At 375 px they must visibly show the responsive Home, not the catalog.

### 2. Marketplace header is clipped at 768 px

The accepted 768 px screenshots for SURF-001, SURF-002, and SURF-003 visibly cut off the right side of `Panel Gestor`. Root `overflow-x-hidden` masks document overflow, so the existing helper returns a false pass. The current assertion only checks wrapping/header height and does not verify containment.

Required behavior:

- At 768 px, every visible header link/button/control must have `left >= 0` and `right <= window.innerWidth` (allow at most 1 CSS pixel tolerance).
- No label or control may be visually clipped.
- Prefer a deliberate tablet layout. A valid solution can hide secondary center navigation until a larger breakpoint while retaining accessible navigation paths; do not shrink text below readable sizes.
- Add a direct viewport-containment assertion for visible header controls at 768 px. Do not rely only on document scroll width or root clipping.
- Regenerate every affected accepted screenshot and contact sheet.

## Verification contract

1. Run the focused assertions first for:
   - SURF-001 at 375 light/dark: pathname remains `/es`, Home content is present.
   - SURF-001/SURF-002/SURF-003 at 768 light/dark: all visible header controls are inside viewport.
2. Re-run TypeScript, web lint, and web production build.
3. Re-run the actual full suite with `--project="Desktop Chrome"`; terminal result must remain exactly 144 executed with zero failures/skips.
4. Rebuild the full accepted evidence set: exactly 128 PNGs, 128 distinct hashes, 0 light/dark collisions, and 16 PNG contact sheets.
5. Update FIND-005-023 evidence honestly. Add a separate finding for the incorrect mobile-web redirect and mark it fixed only after the explicit pathname assertion passes.
6. Keep Docker and WSL off. Remove test-owned temporary output, release ports 3000/3001, and terminate only task-owned test/server processes.

## Terminal delivery

Return:

- exact product and test files changed;
- focused results;
- exact 144-test terminal result;
- TypeScript/lint/build results;
- screenshot/hash/contact-sheet counts;
- confirmation that 375 px SURF-001 is Home and that the 768 px header controls are contained;
- cleanup state.
