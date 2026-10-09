-- ==============================================================================
-- Migration: 20261008040000_unit_archive_rpc.sql
-- Batch N01 / B008: Atomic unit archive & concurrent rental serialization
-- Soft-deletes public.unidades without relaxing table-level RLS policies.
-- Enforces:
-- 1. Real Supabase Auth UID and active user in public.users.
-- 2. Authorization and row-level locking PRIOR to rental queries (no information disclosure oracle).
-- 3. Lock order: delegaciones FOR UPDATE -> unidades FOR UPDATE.
-- 4. Active rentals check strictly AFTER acquiring unit row-lock.
-- 5. Atomic soft-delete updating deleted_at = NOW(), triggering audit_operational_mutation().
-- 6. Concurrent coordination: trg_check_unidad_active_for_rental takes FOR SHARE on
--    public.unidades during rental creation/activation, serializing against archive_unidad.
-- 7. Anti-oracle protection in rental trigger: unauthorized actors bypass internal
--    unit inspection and fail uniformly closed under RLS (no private state leakage).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.archive_unidad(p_unidad_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Restrict execution privileges
REVOKE ALL ON FUNCTION public.archive_unidad(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_unidad(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_unidad(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_unidad(UUID) TO service_role;

-- ==============================================================================
-- Protocolo común de bloqueo para creación y activación de alquileres
-- Serializa contra archive_unidad tomando FOR SHARE sobre public.unidades
-- Protege contra oráculos: actores no autorizados son rechazados uniformemente por RLS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_unidad_active_for_rental()
RETURNS trigger AS $$
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
              v_authorized := EXISTS (
                SELECT 1 FROM public.delegacion_unidades du
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_check_unidad_active_for_rental ON public.alquileres;
CREATE TRIGGER trg_check_unidad_active_for_rental
  BEFORE INSERT OR UPDATE OF estado, unidad_id, deleted_at ON public.alquileres
  FOR EACH ROW EXECUTE FUNCTION public.check_unidad_active_for_rental();
