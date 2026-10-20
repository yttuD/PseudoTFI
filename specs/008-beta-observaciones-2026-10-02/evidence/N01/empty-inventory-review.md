# N01 — Ejecución de Matriz Completa (36 Pruebas), Análisis Visual Mobile y Reporte de Estado

Fecha: 2026-10-07
RISK: HIGH
EVIDENCE_PROFILE: API | UI | SECURITY
SOL_REVIEW: FULL_AFFECTED_DIFF

## 1. Ejecución de la Matriz Completa Actual (36 Pruebas)
Comando ejecutado:
```bash
node apps/web/e2e/beta-real-runtime.mjs
```
- **Resultado consolidado**:
  - **Passed**: 35 / 36 (97.2%)
  - **Failed**: 1 / 36 (Escenario 2 en `auth-matrix-1440-light` por timeout de red transitorio de Supabase GoTrue Auth: `Processing this request timed out, please retry after a moment.` en `beta-real-fixtures.ts:140` al crear delegado para revocación)
  - **Skipped**: 0
  - **Flaky**: 0
  - **Errores de hooks**: 0 (todos los `beforeAll`, `beforeEach` y `afterAll` completaron exitosamente)
- **Desglose de pruebas pasadas (35/36)**:
  - Escenario 1 (Aislamiento A/B): **7/7 PASS** en los 7 proyectos visuales.
  - Escenario 1b (Modo solo lectura y tabla): **7/7 PASS** en los 7 proyectos visuales.
  - Inventario vacío localizado (@empty): **7/7 PASS** en los 7 proyectos visuales (ES, EN con "across", PT con "Exibindo").
  - Escenario 3 (Paginación, out-of-range y límites inválidos): **7/7 PASS** en los 7 proyectos visuales.
  - Escenario 4 (SSR error handling y recuperación): **7/7 PASS** en los 7 proyectos visuales.
- **Preservación de artefactos**:
  - Reporte histórico de 29 pruebas intacto: `specs/008-beta-observaciones-2026-10-02/evidence/N01/playwright-inventory-results.json` (NO sobrescrito).
  - Reporte de la nueva ejecución de 36 pruebas registrado en: `specs/008-beta-observaciones-2026-10-02/evidence/N01/playwright-real-results.json`.

## 2. Inventario de Capturas: Revisadas vs Solamente Generadas
- **Lote total generado**: 77 archivos en `specs/008-beta-observaciones-2026-10-02/evidence/N01/captures/`.
- **Capturas abiertas y examinadas directamente (22 archivos)**:
  1. *Mobile Tabla*:
     - `visual-375-light_gestorA_tabla.png`: Tabla mobile con ID REF, TÍTULO y GRUPO adaptados; sin desbordamiento horizontal.
     - `visual-375-dark_gestorA_tabla.png`: Tema oscuro con cabeceras salmón suave, filas en blanco nítido y contenedor `#131F3C`.
  2. *Mobile Solo Lectura*:
     - `visual-375-light_readonly_bento.png`: Banner con icono de ojo, badge "Modo Solo Lectura" compacto, botones de creación suprimidos.
     - `visual-375-dark_readonly_bento.png`: Badge con acento dorado `#B89355` sobre fondo `#101B37`, sin acciones de mutación.
     - `visual-375-light_readonly_tabla.png` & `visual-375-dark_readonly_tabla.png`: Tabla mobile en modo lectura con texto "Solo lectura" en acciones.
  3. *Mobile Error SSR y Recuperación*:
     - `visual-375-light_error_unidades.png`: Card `[role="alert"]` con advertencia e icono, botón "REINTENTAR" reacomodado abajo con target de 44px.
     - `visual-375-dark_error_unidades.png`: Variante oscura con borde delimitado y contraste verificado.
  4. *Mobile Paginación*:
     - `visual-375-light_paginacion_page2.png` & `visual-375-dark_paginacion_page2.png`: Página 2 (límite 1) muestra la unidad 2 sin colisión con controles.
  5. *Mobile Vacío Localizado (ES, EN, PT)*:
     - `visual-375-light_empty_es.png` & `visual-375-dark_empty_es.png`: "Inventario Vacío", "Mostrando 0 de 0...", botón "+ Registrar Unidad".
     - `visual-375-light_empty_en.png` & `visual-375-dark_empty_en.png`: "Empty inventory", "Showing 0 of 0 authorized units across 0 groups", "+ Register unit".
     - `visual-375-light_empty_pt.png` & `visual-375-dark_empty_pt.png`: "Inventário vazio", "Exibindo 0 de 0 unidades autorizadas em 0 grupos", "+ Cadastrar unidade".
  6. *Desktop y Tablet (muestra representativa examinada)*:
     - `visual-1440-light_gestorA_inventario.png`, `visual-1440-dark_gestorA_inventario.png`, `visual-1440-light_gestorB_inventario.png`, `visual-768-light_gestorA_inventario.png`, `visual-1440-light_readonly_bento.png`, `visual-1440-light_error_unidades.png`, `visual-1440-light_paginacion_page2.png`, `visual-1440-light_empty_es.png`.
- **Capturas solamente generadas (no reexaminadas en este pase)**: 55 archivos restantes (variantes intermedias de tablet 1024px e imágenes de prueba repetidas por combinaciones secundarias).

## 3. Contraste WCAG AA (Canvas 2D sRGB + Composición Alfa)
- El cálculo corresponde **exclusivamente al badge de solo lectura** (`[data-testid="readonly-badge"]`):
  - Light mode (`visual-1440-light_contrast.json`): FG `rgba(19, 31, 60, 1)`, BG `rgba(253, 246, 228, 1)`, Ratio **15.11:1** (>= 4.5:1 PASS).
  - Dark mode (`visual-1440-dark_contrast.json`): FG `rgba(184, 147, 85, 1)`, BG `rgba(16, 27, 55, 1)`, Ratio **5.95:1** (>= 4.5:1 PASS).

## 4. Cleanup y Recursos Propios
- Puertos 3200, 3201 y 3202 verificados y libres tras la ejecución.
- Residuos de prueba en Supabase Auth eliminados: **0 usuarios sintéticos b007b residuales**.
- Cuentas de testers y datos de producción intactos y sin alteración.
