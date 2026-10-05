# Evidencia N01 — API Range y Aislamiento Runtime

## 1. Comando 1: Pruebas Unitarias de Aislamiento y Manejo de Range (Vitest)
- **Comando:** `node node_modules/vitest/vitest.mjs run src/unidades/unidades.isolation.spec.ts`
- **Cwd:** `D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI\apps\api`
- **Exit Code:** `0`
- **Salida:**
```text
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

 RUN  v4.1.11 D:/Programacion-Cosas/Proyecto_inmobiliaria/TFI/apps/api

 Test Files  1 passed (1)
      Tests  21 passed (21)
   Duration  3.26s
```
- **Conteos:** 1 archivo, 21 tests ejecutados, 21 passed, 0 failed.

## 2. Comando 2: Pruebas de Integración E2E con DB y Auth Real (Vitest)
- **Comando:** `node node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts test/beta-isolation.e2e-spec.ts`
- **Cwd:** `D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI\apps\api`
- **Exit Code:** `0`
- **Salida:**
```text
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

 RUN  v4.1.11 D:/Programacion-Cosas/Proyecto_inmobiliaria/TFI/apps/api

 Test Files  1 passed (1)
      Tests  34 passed (34)
   Duration  8.25s
```
- **Conteos:** 1 archivo, 34 tests ejecutados, 34 passed, 0 failed.
- **Validaciones cubiertas:**
  - Gestor A `page=9999`: recuento auténtico 4, data [], exitoso sin PGRST103.
  - Gestor B `page=9999`: recuento auténtico 1, data [], exitoso sin PGRST103.
  - Delegado grupo `page=9999`: recuento auténtico 2, data [].
  - Delegado unidades `page=9999`: recuento auténtico 1, data [].
  - Regresión no-PGRST103: código de error diferente con mención a PGRST103 en texto lanza 422 sin llamar a HEAD.
