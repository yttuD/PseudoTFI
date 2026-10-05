# Evidencia de Archivado Seguro de Grupos en Runtime (B007d / N01 / T005 / N07 / N08)

> Documento de preparación histórica. Resultados actuales y correcciones de
> diagnóstico: group-archive-review.md. No confundir PREPARED con aceptación.

- **Fecha**: 2026-10-04
- **Lote**: `specs/008-beta-observaciones-2026-10-02/antigravity-batch-007d-group-archive.md`
- **Revisión**: `specs/008-beta-observaciones-2026-10-02/antigravity-batch-007d-review.md`
- **Perfil de Evidencia**: DB | API | SECURITY | MIGRATION
- **Estado**: PREPARED (Solución y pruebas preparadas para review de seguridad de Codex; DB no migrada).

---

## 1. Diagnóstico del Fallo de Archivado Bajo RLS

1. **Fallo Observado en `010_beta_operational_audit.sql`**:
   - `UPDATE public.grupos SET deleted_at = NOW()` arrojaba `SQLSTATE 42501 (insufficient_privilege)`.
2. **Causa Raíz en Políticas RLS de `grupos`**:
   - La política `Grupos update policy` impone `WITH CHECK (public.can_manage_grupo(id))`.
   - La función `can_manage_grupo(id)` evalúa la tupla resultante:
     ```sql
     SELECT id, gestor_id, deleted_at INTO v_grupo FROM public.grupos WHERE id = p_grupo_id;
     IF NOT FOUND OR v_grupo.deleted_at IS NOT NULL THEN RETURN FALSE; END IF;
     ```
   - El UPDATE directo reproducido arroja42501 y las políticas excluyen archivados.
     No se aisló cuál expresión RLS lo provoca primero; el comportamiento de
     snapshot/tupla de WITH CHECK no se demostró experimentalmente.
3. **Fallo en Capa API (`GruposService.remove`)**:
   - Previamente ejecutaba `.from('grupos').update({ deleted_at }).is('deleted_at', null).select().single()`.
   - El `.select()` disparaba `Grupos select policy` (`public.can_read_grupo(id)`), que también excluye filas con `deleted_at IS NOT NULL`.

---

## 2. Decisión Arquitectónica y Diseño Defensivo

- **Principio**: No relajar políticas de tabla (no poner `WITH CHECK (true)` ni abrir `SELECT` a registros eliminados) ni puentear mediante `adminClient` en el servicio NestJS.
- **Solución**: RPC estrecho `public.archive_grupo(p_grupo_id UUID) RETURNS jsonb`:
  - `SECURITY DEFINER` con `search_path = ''`.
  - Exige `auth.uid()` real no nulo y actor activo en `public.users` (`deleted_at IS NULL`).
  - Comparaciones seguras mediante `IS DISTINCT FROM` para evitar que valores `NULL` anulen las comprobaciones de guardia en SQL.
  - Orden de bloqueos y alcance:
    - **Gestor owner**: Omite bloqueo de delegaciones. Filtra por pertenencia (`gestor_id = v_uid`) antes del bloqueo `FOR UPDATE` para no bloquear filas ajenas.
    - **Delegado**: Bloquea delegación activa primero (`delegaciones WHERE estado = 'activa' FOR UPDATE`), validando `permiso = 'gestionar'` y `alcance_tipo = 'cuenta'`. Luego bloquea el grupo filtrando por el workspace correspondiente (`gestor_id = v_actor.workspace_id`). Este orden es compatible con `configure_delegacion` y `revoke_delegacion`.
    - Bloquea delegados con alcance `'grupo'`, `'unidades'`, permiso `'ver'`, delegaciones pendientes, revocadas o actores con rol `'buscador'`.
  - Ejecución atómica de soft-delete (`UPDATE public.grupos SET deleted_at = NOW()`), que dispara el trigger operativo `public.audit_operational_mutation()` atribuyendo la acción a `auth.uid()`.
  - Privilegios mínimos: `REVOKE FROM PUBLIC, anon; GRANT TO authenticated, service_role`.
  - Validación en NestJS: `GruposService.remove()` valida explícitamente `res.success === true && res.id === id`.

---

## 3. Archivos Afectados

1. `supabase/migrations/20261005020000_group_archive_rpc.sql`:
   Definición de `public.archive_grupo` con orden de bloqueos anti-carrera, comparaciones `IS DISTINCT FROM` y filtrado previo de workspace.
2. `apps/api/src/grupos/grupos.service.ts`:
   `GruposService.remove()` invoca `archive_grupo` y valida rígidamente `success === true && id === id`.
3. `apps/api/src/grupos/grupos.service.spec.ts`:
   Suite unitaria que cubre validaciones de `remove`: éxito, null, `success: false`, `id` discrepante y error de RPC.
4. `supabase/tests/010_beta_operational_audit.sql`:
   Ajustado seam 9 (`plan(36)`): verifica rechazo 42501 en UPDATE directo de `deleted_at`, y éxito con auditoría vía `archive_grupo`.
5. `supabase/tests/011_beta_group_archive.sql`:
   Nueva suite pgTAP (`plan(24)`) cubriendo matriz de permisos (deleted actor, buscador, null workspace, pending, units, ver, revocado, cross-workspace), coexistencia de historial revocado + activa, doble archivado y ocultación RLS en SELECT.
6. `apps/api/test/beta-isolation.e2e-spec.ts`:
   Pruebas positiva de borrado por Gestor owner y Delegado cuenta (usando `fixtureMarker` en scope), y negativas para alcance grupo, unidades, ver y workspace ajeno.

---

## 4. Limitaciones y Divulgaciones Honestas

- Los archivos se entregan en estado `PREPARED`, sin ejecución de suites ni aplicación SQL previa, respetando la directiva de seguridad del brief hasta la revisión y migración local por parte de Codex.
- El orden de locks fue revisado; no se ejecutaron pruebas de concurrencia y no
  se afirma serialización demostrada de todos los cambios simultáneos de perfil.
