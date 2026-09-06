---
trigger: always_on
---

## Verificación de UI — Playwright vs Browser subagent

    Para verificar rutas, redirects, auth flows, estados de UI y comportamiento
    de componentes → usar Playwright E2E tests en `apps/web/e2e/`.

    Para inspección visual puntual de diseño/layout (sin aserciones) →
    browser subagent es aceptable solo como complemento, nunca como único método.

    Toda verificación que implique:
    - "ruta X redirige a Y"
    - "sin login → comportamiento Z"
    - "con login → comportamiento W"
    - "componente muestra estado X"

    ...debe tener un test de Playwright como evidencia entregada al Juez.

    Correr con: `pnpm --filter web exec playwright test`
    Tests en: `apps/web/e2e/`