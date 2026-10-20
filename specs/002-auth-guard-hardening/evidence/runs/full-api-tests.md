# Full API Test Run Evidence

## Execution Details

- **Command**: `pnpm --filter api test`
- **Working Directory**: `D:\Programacion-Cosas\Proyecto_inmobiliaria\TFI`
- **Start Time**: 2026-09-25T18:00:53.5714300-03:00
- **End Time**: 2026-09-25T18:01:02.9554555-03:00
- **Exit Code**: 0
- **Test Files**: 10 passed (10 total)
- **Tests**: 88 passed | 0 failed | 0 skipped (Total: 88)
- **Duration**: 7.28s (runner elapsed)

## Test Suite Breakdown

1. `src/auth/supabase-auth.guard.spec.ts` - 49 passed (hardened guard regression suite)
2. `src/alquileres/alquileres.service.spec.ts` - passed
3. `src/cupo/cupo.service.spec.ts` - passed
4. `src/favoritos/favoritos.controller.spec.ts` - passed
5. `src/favoritos/favoritos.service.spec.ts` - passed
6. `src/grupos/grupos.controller.spec.ts` - passed
7. `src/grupos/grupos.service.spec.ts` - passed
8. `src/pagos/pagos.service.spec.ts` - passed
9. `src/pagos/pricing.spec.ts` - passed
10. `src/reportes/reportes.controller.spec.ts` - passed

## Pre-Existing vs Introduced Status

- **Pre-existing failures**: 0. The baseline had 9 passing test files (39 passed tests).
- **Introduced failures**: 0.
- **Delta**: +1 test file (`supabase-auth.guard.spec.ts`), +49 passed tests (42 initial + 7 Codex review correction cases).
- **Conclusion**: All 88 API tests pass green. Zero regressions across existing API controllers, services, or pricing logic.
