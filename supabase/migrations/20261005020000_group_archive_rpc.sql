-- ==============================================================================
-- Migration: 20261005020000_group_archive_rpc.sql
-- Batch B007d: Atomic group archive via dedicated SECURITY DEFINER RPC
-- Soft-deletes public.grupos without relaxing table-level RLS policies.
-- Lock order: delegaciones FOR UPDATE -> grupos FOR UPDATE (for delegados).
-- Group ownership filtered prior to row-lock to avoid foreign workspace locking.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.archive_grupo(p_grupo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actor RECORD;
  v_grupo RECORD;
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

  -- 3. Authorization check & Lock order
  IF v_actor.rol IS NOT DISTINCT FROM 'gestor' THEN
    -- Case A: Owner Gestor
    -- Filter group strictly by owner gestor_id before row-lock to avoid locking foreign groups
    SELECT id, gestor_id, deleted_at INTO v_grupo
    FROM public.grupos
    WHERE id = p_grupo_id
      AND gestor_id = v_uid
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Grupo no encontrado';
    END IF;

  ELSIF v_actor.rol IS NOT DISTINCT FROM 'delegado' THEN
    -- Case B: Delegado of workspace
    IF v_actor.workspace_id IS NULL THEN
      RAISE EXCEPTION 'Grupo no encontrado';
    END IF;

    -- Lock active delegation first (order matches configure_delegacion / revoke_delegacion)
    -- Filter estado = 'activa' to never select historical revoked delegations
    SELECT id, estado, permiso, alcance_tipo, gestor_id INTO v_del
    FROM public.delegaciones
    WHERE delegado_id = v_uid
      AND gestor_id = v_actor.workspace_id
      AND estado = 'activa'
    FOR UPDATE;

    IF NOT FOUND
       OR v_del.permiso IS DISTINCT FROM 'gestionar'
       OR v_del.alcance_tipo IS DISTINCT FROM 'cuenta' THEN
      RAISE EXCEPTION 'Grupo no encontrado';
    END IF;

    -- Lock group scoped strictly to the delegated workspace
    SELECT id, gestor_id, deleted_at INTO v_grupo
    FROM public.grupos
    WHERE id = p_grupo_id
      AND gestor_id = v_actor.workspace_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Grupo no encontrado';
    END IF;

  ELSE
    -- Fail-closed for all other roles (buscador, anon, etc.)
    RAISE EXCEPTION 'Grupo no encontrado';
  END IF;

  -- 4. Soft-delete the group (triggers public.audit_operational_mutation() atomically)
  UPDATE public.grupos
  SET deleted_at = v_now
  WHERE id = p_grupo_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', p_grupo_id,
    'deleted_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Restrict execution privileges
REVOKE ALL ON FUNCTION public.archive_grupo(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_grupo(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_grupo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_grupo(UUID) TO service_role;
