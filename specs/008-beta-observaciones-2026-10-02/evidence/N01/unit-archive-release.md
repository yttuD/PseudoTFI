# B009 — Publicación de Archivador de Unidades en Beta (N01)

- **Fecha / Timestamp**: 2026-10-09T01:59:00-03:00 (2026-10-09T04:59:00Z)
- **Perfil de Evidencia**: API | DB | SECURITY | MIGRATION
- **Revisión**: FULL_AFFECTED_DIFF
- **Proyecto Supabase**: `maeiuaketocznpogmtic` (organización `snpjqinernydjtlzfoug`)
- **API Beta**: `https://rendo-beta-api.vercel.app`
- **Web Beta (intacta)**: `https://rendo-beta-web.vercel.app`

---

## 1. Baseline y Estado Previo

- **Git Baseline**: Rama `codex/rendo-beta-deploy`, upstream `origin/codex/rendo-beta-deploy`. HEAD previo `7e66fc4` (`docs(beta): record interrupted UI verification and scoped cleanup`).
- **Deployment API previo**: `dpl_6EQBEFvG6JsUcPfJ9rFuTzcUswcm`, verificado `READY`, alias `https://rendo-beta-api.vercel.app` con `/health/live=200`, `/health/ready=200`, `/unidades=401`.
- **Autenticaciones**: Vercel CLI (cuenta `yttud`, scope `team_7VskngbUFc8h5haIO6O0AEau`); Supabase CLI enlazado a `maeiuaketocznpogmtic`. Ningún secreto expuesto ni modificado.

---

## 2. Verificación y Aplicación de la Migración SQL

- **Archivo aprobado**: `supabase/migrations/20261008040000_unit_archive_rpc.sql`
- **SHA-256 verificado**: `88B17B290C030AADFB6D9ED0378B7D98D2DE33F45120EDCFEFBAAEAA4606601A` (coincidencia exacta 100%).
- **Pre-check**: `npx supabase migration list --linked` confirmó como única migración pendiente `20261008040000`.
- **Dry-run**: `npx supabase db push --dry-run` exit code `0`.
- **Aplicación efectiva**: `npx supabase db push --linked` exit code `0`.
- **Post-check**: `npx supabase migration list --linked` confirmó paridad y registro en historial:
  `{"local":"20261008040000","remote":"20261008040000","time":"2026-10-08 04:00:00"}`.

---

## 3. Catálogo y Definiciones Efectivas en Supabase Remoto

> [!IMPORTANT]
> **Aclaración Documental**: La paridad en el historial de migraciones no demuestra por sí sola igualdad completa del esquema de base de datos. Se acreditaron las definiciones efectivas consultando el catálogo del sistema:

1. **`archive_unidad(p_unidad_id UUID)`**:
   - `pg_proc.prosecdef`: `true` (`SECURITY DEFINER`).
   - `pg_proc.proconfig`: `['search_path=""']`.
   - `information_schema.routine_privileges`:
     - Revocada terminantemente de `PUBLIC` y `anon`.
     - Permisos `EXECUTE` restringidos exclusivamente a `authenticated`, `service_role` y `postgres`.
2. **`check_unidad_active_for_rental()`**:
   - `pg_proc.prosecdef`: `true` (`SECURITY DEFINER`).
   - `pg_proc.proconfig`: `['search_path=""']`.
   - Trigger `trg_check_unidad_active_for_rental` activo (`tgenabled: 'O'`) en tabla `public.alquileres`.

---

## 4. Candidato API Aislado y Validación Unitaria

- **Fuente Base Verificada**: `snapshots/candidate-api/src/unidades/unidades.service.ts` (Commit `55b8e19`).
  - SHA-256 Baseline: `13583df9601742908088d9a1f7e963a91ae0e22d7b9b77132f761c83c4046ef2`.
- **Candidato Construido**: `snapshots-vercel/api-candidate/apps/api/src/unidades/unidades.service.ts` y `apps/api/src/unidades/unidades.service.ts`.
  - SHA-256 Candidato: `6656e3bd561bdd7c0244c2971c55155f43f4abbc138d17d9d564b7d74c28c728`.
  - Diff exacto: Únicamente método `remove` reemplazado por llamada atómica a RPC `archive_unidad` con manejo de excepciones 422 (`alquileres activos`) y 404 (`Unidad no encontrada`). Cero modificaciones a creación, traducción o modalidades de precio.
- **Pruebas Unitarias Afectadas**: `apps/api/src/unidades/unidades.archive.spec.ts`:
  - Éxito RPC: `4 passed, 0 failed` (exit code `0`).
  - `unidades.isolation.spec.ts`: `21 passed, 0 failed` (exit code `0`).
  - Compilación NestJS (`pnpm --filter api build`): exit code `0`.

---

## 5. Publicación en Vercel (Producción Beta)

- **Comando**: `npx vercel deploy snapshots-vercel/api-candidate --project prj_dL8gNB3eb3ePfOI9NBoE1GbRLtVB --scope team_7VskngbUFc8h5haIO6O0AEau --prod --archive=tgz -m actor=antigravity -m rendoBatch=B009-unit-archive -y`
- **Código de salida**: `0`
- **Deployment ID**: `dpl_9PD8rFu5ZZRRTTZ5Gwa2e5ezkpXN`
- **Estado**: `READY`
- **Target**: `production`
- **URL directa**: `https://rendo-beta-aj6vd8pev-dutty.vercel.app`
- **Alias de producción actualizado**: `https://rendo-beta-api.vercel.app`
- **Archivos desplegados**: 399 archivos aislados (sin cambios sucios locales).
- **Web App**: `https://rendo-beta-web.vercel.app` NO redesplegada (se mantiene intacta la versión previa).

---

## 6. Verificación HTTP Smoke en Beta

Consultas HTTP públicas a los alias de producción:

| Endpoint | Método | Status | Body Recibido |
|---|---|---|---|
| `https://rendo-beta-api.vercel.app/health/live` | GET | `200` | `{"status":"ok"}` |
| `https://rendo-beta-api.vercel.app/health/ready` | GET | `200` | `{"status":"ok"}` |
| `https://rendo-beta-api.vercel.app/unidades` | GET | `401` | `{"message":"Token inválido o no autorizado","error":"Unauthorized","statusCode":401}` |
| `https://rendo-beta-web.vercel.app/es` | GET | `200` | `<!DOCTYPE html><html lang="es">...` |

---

## 7. Plan de Recuperación Operativa y Estado de N01

- **Rollback Inmediato**: El deployment previo `dpl_6EQBEFvG6JsUcPfJ9rFuTzcUswcm` se mantiene intacto y puede re-aliasearse instantáneamente si fuera necesario.
- **Compatibilidad**: La migración `20261008040000` es aditiva y no altera destructivamente el esquema de lectura/escritura de versiones anteriores de la API.
- **Alcance**: N01 permanece formalmente **ABIERTO**. Este lote publica exclusivamente la infraestructura de archivado y la API compatible. No se crearon cuentas ni se ejecutaron suites remotas en esta intervención.
