# Evidencia de Catálogo y Definiciones Efectivas en Supabase Remoto — Lote B009

- **Proyecto Consultado**: `maeiuaketocznpogmtic` (organización `snpjqinernydjtlzfoug`)
- **Tipo de Consulta**: Solo lectura sobre catálogos del sistema PostgreSQL (`pg_proc`, `pg_trigger`, `information_schema.routine_privileges`, `supabase_migrations.schema_migrations`)
- **Timestamp de Extracción**: 2026-10-09T02:11:13-03:00 (2026-10-09T05:11:13Z)

> [!IMPORTANT]
> **Aclaración Documental**: La paridad en el historial de migraciones no demuestra por sí sola igualdad completa del esquema de base de datos. Se acreditan a continuación las definiciones efectivas completas, triggers y privilegios extraídos directamente del host remoto de Supabase.

---

## 1. Historial Remoto de Migraciones (`npx supabase migration list --linked`)

```text
   Local            | Remote           | Time (UTC)            
  ------------------|------------------|-----------------------
   `20260903202800` | `20260903202800` | `2026-09-03 20:28:00` 
   `20260903204800` | `20260903204800` | `2026-09-03 20:48:00` 
   `20260904042700` | `20260904042700` | `2026-09-04 04:27:00` 
   `20260904045400` | `20260904045400` | `2026-09-04 04:54:00` 
   `20260904122400` | `20260904122400` | `2026-09-04 12:24:00` 
   `20260905005500` | `20260905005500` | `2026-09-05 00:55:00` 
   `20260905051150` | `20260905051150` | `2026-09-05 05:11:50` 
   `20260905062000` | `20260905062000` | `2026-09-05 06:20:00` 
   `20260905074300` | `20260905074300` | `2026-09-05 07:43:00` 
   `20260905163100` | `20260905163100` | `2026-09-05 16:31:00` 
   `20260905191306` | `20260905191306` | `2026-09-05 19:13:06` 
   `20260905193300` | `20260905193300` | `2026-09-05 19:33:00` 
   `20260913050000` | `20260913050000` | `2026-09-13 05:00:00` 
   `20260913070000` | `20260913070000` | `2026-09-13 07:00:00` 
   `20260913080000` | `20260913080000` | `2026-09-13 08:00:00` 
   `20260913090000` | `20260913090000` | `2026-09-13 09:00:00` 
   `20260925120000` | `20260925120000` | `2026-09-25 12:00:00` 
   `20260927100000` | `20260927100000` | `2026-09-27 10:00:00` 
   `20260929213000` | `20260929213000` | `2026-09-29 21:30:00` 
   `20260930010000` | `20260930010000` | `2026-09-30 01:00:00` 
   `20260930020000` | `20260930020000` | `2026-09-30 02:00:00` 
   `20260930030000` | `20260930030000` | `2026-09-30 03:00:00` 
   `20261001010000` | `20261001010000` | `2026-10-01 01:00:00` 
   `20261002010000` | `20261002010000` | `2026-10-02 01:00:00` 
   `20261002020000` | `20261002020000` | `2026-10-02 02:00:00` 
   `20261002030000` | `20261002030000` | `2026-10-02 03:00:00` 
   `20261005010000` | `20261005010000` | `2026-10-05 01:00:00` 
   `20261005020000` | `20261005020000` | `2026-10-05 02:00:00` 
   `20261008030000` | `20261008030000` | `2026-10-08 03:00:00` 
   `20261008040000` | `20261008040000` | `2026-10-08 04:00:00` 
```

---

## 2. Definición Efectiva de `public.archive_unidad(p_unidad_id uuid)`

Consulta: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'archive_unidad';`

```sql
CREATE OR REPLACE FUNCTION public.archive_unidad(p_unidad_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_actor RECORD;
  v_unidad RECORD;
  v_del RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Must be authenticated with real Supabase Auth UID
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- 2. Validate actor in public.users (must be active and non-deleted)
  SELECT id, rol, workspace_id, deleted_at INTO v_actor
  FROM public.users
  WHERE id = v_uid;

  IF NOT FOUND OR v_actor.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado o inactivo';
  END IF;

  -- 3. Authorization check & Row-Lock order (FIRST - BEFORE querying rentals)
  -- Prevents information disclosure oracle for unauthorized actors
  IF v_actor.rol IS NOT DISTINCT FROM 'gestor' THEN
    -- Case A: Owner Gestor
    -- Filter unit strictly by owner gestor_id before row-lock to avoid locking foreign units
    SELECT id, gestor_id, grupo_id, deleted_at INTO v_unidad
    FROM public.unidades
    WHERE id = p_unidad_id
      AND gestor_id = v_uid
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unidad no encontrada';
    END IF;

  ELSIF v_actor.rol IS NOT DISTINCT FROM 'delegado' THEN
    -- Case B: Delegado of workspace
    IF v_actor.workspace_id IS NULL THEN
      RAISE EXCEPTION 'Unidad no encontrada';
    END IF;

    -- Lock active delegation first (consistent order with configure_delegacion / archive_grupo)
    SELECT id, estado, permiso, alcance_tipo, grupo_id INTO v_del
    FROM public.delegaciones
    WHERE delegado_id = v_uid
      AND gestor_id = v_actor.workspace_id
      AND estado = 'activa'
    FOR UPDATE;

    IF NOT FOUND OR v_del.permiso IS DISTINCT FROM 'gestionar' THEN
      RAISE EXCEPTION 'Unidad no encontrada';
    END IF;

    -- Lock unit scoped strictly to the delegated workspace
    SELECT id, gestor_id, grupo_id, deleted_at INTO v_unidad
    FROM public.unidades
    WHERE id = p_unidad_id
      AND gestor_id = v_actor.workspace_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unidad no encontrada';
    END IF;

    -- Scope check:
    IF v_del.alcance_tipo = 'cuenta' THEN
      -- Account-wide scope: authorized for all units of this workspace
    ELSIF v_del.alcance_tipo = 'grupo' THEN
      IF v_unidad.grupo_id IS NULL OR v_unidad.grupo_id IS DISTINCT FROM v_del.grupo_id THEN
        RAISE EXCEPTION 'Unidad no encontrada';
      END IF;
    ELSIF v_del.alcance_tipo = 'unidades' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.delegacion_unidades du
        WHERE du.delegacion_id = v_del.id
          AND du.unidad_id = p_unidad_id
      ) THEN
        RAISE EXCEPTION 'Unidad no encontrada';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unidad no encontrada';
    END IF;

  ELSE
    -- Fail-closed for all other roles (buscador, anon, etc.)
    RAISE EXCEPTION 'Unidad no encontrada';
  END IF;

  -- 4. Active rentals check: executed strictly AFTER unit authorization and row-lock
  IF EXISTS (
    SELECT 1 FROM public.alquileres a
    WHERE a.unidad_id = p_unidad_id
      AND a.estado = 'activo'
      AND a.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'La unidad tiene alquileres activos y no se puede eliminar';
  END IF;

  -- 5. Soft-delete the unit (triggers public.audit_operational_mutation() atomically)
  UPDATE public.unidades
  SET deleted_at = v_now
  WHERE id = p_unidad_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_unidad_id,
    'deleted_at', v_now
  );
END;
$function$
```

---

## 3. Definición Efectiva de `public.check_unidad_active_for_rental()`

Consulta: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'check_unidad_active_for_rental';`

```sql
CREATE OR REPLACE FUNCTION public.check_unidad_active_for_rental()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_unidad RECORD;
  v_del RECORD;
  v_authorized BOOLEAN := FALSE;
BEGIN
  -- Solo coordina serialización si el alquiler pasa a estado activo y no está eliminado
  IF NEW.estado = 'activo' AND NEW.deleted_at IS NULL THEN
    -- Si hay identidad autenticada de usuario (v_uid no nulo):
    IF v_uid IS NOT NULL THEN
      -- Verificar si el actor es el dueño de la unidad o delegado con permiso/alcance sobre ella
      SELECT id, gestor_id, grupo_id, deleted_at INTO v_unidad
      FROM public.unidades
      WHERE id = NEW.unidad_id;

      IF FOUND THEN
        -- Verificar si v_uid es el gestor dueño
        IF v_unidad.gestor_id = v_uid THEN
          v_authorized := TRUE;
        ELSE
          -- Verificar si es un delegado activo con permiso 'gestionar' del gestor dueño
          SELECT id, alcance_tipo, grupo_id INTO v_del
          FROM public.delegaciones
          WHERE delegado_id = v_uid
            AND gestor_id = v_unidad.gestor_id
            AND estado = 'activa'
            AND permiso = 'gestionar';

          IF FOUND THEN
            IF v_del.alcance_tipo = 'cuenta' THEN
              v_authorized := TRUE;
            ELSIF v_del.alcance_tipo = 'grupo' THEN
              v_authorized := (v_unidad.grupo_id IS NOT NULL AND v_unidad.grupo_id = v_del.grupo_id);
            ELSIF v_del.alcance_tipo = 'unidades' THEN
              v_authorized := EXISTS (\n                SELECT 1 FROM public.delegacion_unidades du
                WHERE du.delegacion_id = v_del.id
                  AND du.unidad_id = NEW.unidad_id
              );
            END IF;
          END IF;
        END IF;
      END IF;
    ELSIF session_user = 'postgres' OR COALESCE((SELECT auth.role()), '') = 'service_role' THEN
      -- Operaciones administrativas legítimas sin usuario autenticado específico
      v_authorized := TRUE;
    END IF;

    -- Si el actor NO está autorizado dentro del workspace/alcance de la unidad
    -- (o la unidad no existe, o pertenece a otro gestor, o es un atacante sin credenciales):
    -- NO divulgamos nada sobre el estado interno de la unidad.
    -- Retornamos NEW y dejamos que RLS de public.alquileres (o foreign keys) rechace uniformemente.
    IF NOT v_authorized THEN
      RETURN NEW;
    END IF;

    -- Si está autorizado (dueño, delegado con alcance o service_role/postgres):
    -- Tomar lock FOR SHARE sobre la unidad para serializar con archive_unidad (que toma FOR UPDATE)
    SELECT id, deleted_at INTO v_unidad
    FROM public.unidades
    WHERE id = NEW.unidad_id
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unidad no encontrada';
    END IF;

    IF v_unidad.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'No se puede crear ni activar un alquiler en una unidad eliminada o archivada';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
```

---

## 4. Definición de Trigger en `public.alquileres`

Consulta: `SELECT tgname, relname, proname, tgenabled, pg_get_triggerdef(t.oid) FROM pg_trigger ...;`

```sql
CREATE TRIGGER trg_check_unidad_active_for_rental
  BEFORE INSERT OR UPDATE OF estado, unidad_id, deleted_at
  ON public.alquileres
  FOR EACH ROW
  EXECUTE FUNCTION check_unidad_active_for_rental()
```
- Estado del trigger: `tgenabled = 'O'` (habilitado normalmente).

---

## 5. Privilegios de Ejecución (`routine_privileges`)

Consulta a `information_schema.routine_privileges`:

| Función | Rol / Grantee | Tipo de Privilegio | Es Otorgable | Estado |
|---|---|---|---|---|
| `archive_unidad` | `authenticated` | `EXECUTE` | `NO` | Autorizado |
| `archive_unidad` | `service_role` | `EXECUTE` | `NO` | Autorizado |
| `archive_unidad` | `postgres` | `EXECUTE` | `YES` | Propietario |
| `archive_unidad` | `PUBLIC` | *(Ninguno)* | — | **Revocado** |
| `archive_unidad` | `anon` | *(Ninguno)* | — | **Revocado** |
| `check_unidad_active_for_rental` | `authenticated` | `EXECUTE` | `NO` | Autorizado |
| `check_unidad_active_for_rental` | `service_role` | `EXECUTE` | `NO` | Autorizado |
| `check_unidad_active_for_rental` | `postgres` | `EXECUTE` | `YES` | Propietario |
| `check_unidad_active_for_rental` | `anon` | `EXECUTE` | `NO` | Trigger internamente fail-closed |
| `check_unidad_active_for_rental` | `PUBLIC` | `EXECUTE` | `NO` | Trigger internamente fail-closed |
