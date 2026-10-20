# Antigravity correction brief 03 — bounded settle and real keyboard focus

## Scope

Correct only T015 in:

- `apps/web/e2e/fixtures/product-readiness.ts`
- `apps/web/e2e/fixtures/product-readiness.spec.ts`
- `specs/005-web-product-readiness/evidence/test-results/helper-validation.md`
- `specs/005-web-product-readiness/tasks.md` only if status wording needs synchronization

Do not modify any other file. Do not start Docker, WSL, web servers or browsers for this correction.

## Required corrections

1. `waitForSettledState(page, timeoutMs)` currently ignores `timeoutMs` and can wait forever on `document.fonts.ready`. Use the argument as a real upper bound for the complete settle operation. Return a useful diagnostic/result indicating whether fonts settled or timeout fallback was used; do not throw only because optional web fonts missed the bound.
2. `setThemeAndWait` must request reduced motion through Playwright media emulation before applying the class/theme, then use the bounded settle helper. It must not permanently inject task styles into product DOM.
3. `checkVisibleFocus` must prove keyboard focus, not call `element.focus()` and synthesize events. Implement bounded Tab navigation:
   - blur/reset focus safely;
   - press Tab through the actual focus order until the requested element becomes `document.activeElement` or a bounded maximum is reached;
   - capture before and after computed styles;
   - fail with a diagnostic when the target is not keyboard reachable;
   - evaluate visible focus using the existing pure comparison function.
   Do not synthesize `FocusEvent`/`focusin` and do not treat programmatic focus as keyboard evidence.
4. Factor any pure bounded-state logic needed and add deterministic non-browser assertions. Keep browser-callable signatures typed and compile cleanly.
5. Run the local web compiler directly (`apps/web/node_modules/.bin/tsc.CMD --noEmit`) so no package installation or server starts. Run the existing pure Node assertions.

## Delivery

Return once with changed logic, exact command results, and confirmation no servers/browsers/Docker/WSL/listeners/temporaries remain.
