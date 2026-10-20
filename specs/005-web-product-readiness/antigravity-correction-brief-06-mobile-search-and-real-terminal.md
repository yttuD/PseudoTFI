# Antigravity correction brief 06 — mobile search evidence and real terminal command

## Supervisor rejection

T018/T020 remain open for two exact reasons:

1. The delivery claimed `pnpm --filter web exec playwright test e2e/product_readiness_public.spec.ts --project=chromium --reporter=list -> 64 passed`, but the repository has no `chromium` project. `apps/web/playwright.config.ts` exposes only `Desktop Chrome`. Independent `--list` with that real project enumerates exactly 144 tests. The reported command/result is therefore not valid terminal evidence for the complete suite.
2. `FORM-009__anonymous__wizard-active__375w__dark.png` is byte-identical to `SURF-002__anonymous__default__375w__dark.png`. Visual inspection confirms no `Centro` value and no `departamento` selection. The cause is in lines 583–611: the fallback locator takes `h3:has-text("Filtros del Catálogo")` itself as `searchContainer`; descendant field lookups return absent, and optional `if (isVisible())` guards silently skip both actions and hard assertions.

## Scope

Correct only:

- `apps/web/e2e/product_readiness_public.spec.ts`
- public baseline PNG/report/task/status evidence

Do not modify shared helpers unless a direct compile defect is found. Do not modify product source, API, database or unrelated tests. Docker/WSL stay off.

## Required FORM-009 correction

1. Implement an explicit responsive branch:
   - when `[data-testid="search-wizard"]` is visible, use that component and its real input/combobox;
   - otherwise, require the responsive catalog fallback. Resolve the actual enclosing filter card from the `Filtros del Catálogo` heading (for example its nearest stable card ancestor), then locate the `Ej: Palermo...` input and category combobox inside that card.
2. In both branches, `Centro` input and `departamento` selection are mandatory. Do not guard required actions/assertions with optional `if (isVisible())` blocks. Hard-fail when the responsive equivalent or any required control is absent.
3. Immediately before capture hard-assert visible value `Centro` and visible selected category `departamento` in the active responsive component.
4. Recapture all eight FORM-009 cells under the already corrected theme/media system. Delete/replace only those eight exact PNGs.
5. Add a hard evidence gate that every FORM-009 cell differs by SHA-256 from the corresponding SURF-002 default cell. The 375w dark pair must no longer collide. The complete 128-file directory must then have 128 distinct hashes unless a different pair is explicitly demonstrated and approved; do not pre-accept collisions.

## Required terminal verification

1. Run the actual configured project and wait synchronously to completion:

   `pnpm --filter web exec playwright test e2e/product_readiness_public.spec.ts --project="Desktop Chrome" --reporter=list`

2. This command must discover and execute 144 tests. Product audit assertions may cause a non-zero exit; report exact pass/fail/skip and exit code. Do not replace the full result with a targeted or grep-filtered count.
3. Preserve raw terminal summary in the evidence report before cleaning transient Playwright artifacts.
4. Run the 128-name/PNG/hash/theme/FORM-014/FORM-009 gates after the full suite, because the full suite rewrites evidence.
5. Correct every report/history statement that currently cites the nonexistent `chromium` project or `64 passed` as the complete suite result.
6. Mark T018/T020 complete only after the 144-test terminal execution and all screenshot gates are truthful.

## Delivery

Return once with the exact command, real project name, 144-test terminal totals/exit code, 128/128 files, 128 distinct hashes, zero identical light/dark pairs, zero FORM-014/default pairs, zero FORM-009/default pairs, changed files, and process/port/temp cleanup. Do not exit with a background task running.
