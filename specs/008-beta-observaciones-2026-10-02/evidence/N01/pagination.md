# Evidencia de Verificación: B006-N01a — Alcance antes de Paginación (Cierre Gate Final)

**Fecha**: 2026-10-04
**Ambiente**: Supabase Local Rendo (`http://127.0.0.1:54321`, Docker Engine, Node v22.16.0)
**Alcance**: Sub-lote B006-N01a (Aislamiento de inventario y recuentos en `findAll`). N01 NO se declara cerrado (restan accesos directos, mutaciones y UI en B007).

---

## 1. Criterios de Aceptación y Estado de Gates

| Criterio | Estado | Detalle y Evidencia Ejecutable |
| :--- | :--- | :--- |
| **AC1: Regresiones Unitarias Rojo/Verde** | **PASS** | Fase Roja histórica verificada (6 fallas esperadas, exit 1). Fase Verde vigente: 12/12 passed (`exit 0`, 3.66s). Asserts `invocationCallOrder` garantizan `eq`/`in` antes de `order` y `range`. Cobertura: Gestor A/B, Delegado (cuenta, grupo, IDs, lista vacía, pendiente/revocado sin N+1) y fail-closed ante actor/scope anómalo. Cero `any` nuevo. |
| **AC2: Implementación Acotada** | **PASS** | `findAll` en controller y service sin feature-detection de test ni casts. Desempate directo `.order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, to)`. Reutilización estricta de `DelegationConfiguration`. Controller fail-closed ante contexto de Delegado anómalo. |
| **AC3: Regresiones y Typecheck** | **PASS (Suite Relevante & Build Fuente)** | 1. Suite relevante (`unidades` y `authorization`): 9 suites, 73/73 tests passed (`exit 0`, 6.69s).<br>2. Typecheck productivo (`tsconfig.build.json`): `exit 0` limpio.<br>3. Typecheck general (`tsconfig.json`): `exit 1` real por 4 archivos base preexistentes con problemas abiertos; 0 errores en archivos del lote. No se afirma build global apto. |
| **AC4: Harness Real contra Supabase Local** | **PASS** | `beta-isolation.e2e-spec.ts`: 3/3 passed (`exit 0`, 5.45s). Test directo de `SupabaseAuthGuard`, `UnidadesController` y `UnidadesService` (NO HTTP supertest ni AppModule completo). Auth signIn real, JWT real, RPCs de delegación, empate explícito de `created_at` verificado con orden idéntico en repeticiones de página, `count` de scope constante (2) en `limit: 1`, y recurso de otro workspace excluido. |
| **AC5: Seguridad y Cleanup Verificado** | **PASS** | Revalidación de `localhost` previa a cleanup. Orden estricto de eliminación (Delegado primero para respetar FK `users_workspace_id_fkey`). Verificación de errores en cada delete y comprobación exhaustiva de ausencia en `delegaciones`, `invitaciones_delegados`, `unidades`, `grupos`, `log_acciones`, `users` y `auth.admin.getUserById` (solo se tolera 404/user_not_found; otro error hace fallar). Cero credenciales ni tokens expuestos. |

---

## 2. Comandos Reales Ejecutados tras la Última Edición

### 1. Suite Unitaria de Aislamiento (`unit`)
```bash
node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.ts apps/api/src/unidades/unidades.isolation.spec.ts
```
- **Exit Code**: `0`
- **Resultado**: `Test Files: 1 passed (1) | Tests: 12 passed (12) | Duration: 3.66s`

### 2. Suite de Regresión (`regression`)
```bash
node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.ts apps/api/src/unidades apps/api/src/authorization
```
- **Exit Code**: `0`
- **Resultado**: `Test Files: 9 passed (9) | Tests: 73 passed (73) | Duration: 6.69s` (Cero `any` nuevo: `onfulfilled` en `unidades.observaciones.spec.ts` tipado estrictamente).

### 3. Harness Real contra Supabase Local (`real`)
```bash
node apps/api/node_modules/vitest/vitest.mjs run --config apps/api/vitest.config.e2e.ts apps/api/test/beta-isolation.e2e-spec.ts
```
- **Exit Code**: `0`
- **Resultado**: `Test Files: 1 passed (1) | Tests: 3 passed (3) | Duration: 5.45s`

### 4. Typecheck de Fuentes Productivas (`tsc tsconfig.build.json`)
```bash
node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.build.json
```
- **Exit Code**: `0`
- **Resultado**: Cero errores de TypeScript en los fuentes de producción.

### 5. Typecheck General (`tsc tsconfig.json`)
```bash
node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json
```
- **Exit Code**: `1`
- **Resultado**: Cero errores en los archivos tocados/creados por el lote. 4 archivos preexistentes ajenos permanecen con problemas de tipos base abiertos (`supabase-auth.guard.spec.ts`, `test-adapter.spec.ts`, `delegados.controller.spec.ts`, `app.e2e-spec.ts`).

---

## 3. Archivos Modificados / Creados en el Lote

- `apps/api/src/unidades/unidades.controller.ts` (solo `findAll` fail-closed)
- `apps/api/src/unidades/unidades.service.ts` (solo `findAll` con cadena directa `.order('created_at', ...).order('id', ...)`)
- `apps/api/src/unidades/unidades.isolation.spec.ts` (suite unitaria sin `any`, 12 tests)
- `apps/api/src/unidades/unidades.observaciones.spec.ts` (mock de `query.order` encadenable y thenable para `findAll`)
- `apps/api/src/authorization/delegado-read-authorization.spec.ts` (mock adaptado al servicio scoped de delegación)
- `apps/api/test/beta-isolation.e2e-spec.ts` (harness real directo con cleanup riguroso de errores y ausencia)
- `specs/008-beta-observaciones-2026-10-02/evidence/N01/pagination.md` (este documento de evidencia)
