-- ==============================================================================
-- Migration: 20261005010000_operational_audit_record_fields.sql
-- Fix: Prevent SQLSTATE 42703 (record "old" has no field "estado") on operational updates.
-- Replaces public.audit_operational_mutation() preserving signature, security definer,
-- search_path = '', and audit schema invariants without schema drift or policy changes.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.audit_operational_mutation()
RETURNS trigger AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actor_user RECORD;
  v_gestor_id UUID;
  v_actor_rol TEXT;
  v_accion TEXT;
  v_recurso_tipo TEXT;
  v_recurso_id UUID;
  v_metadata JSONB := '{}'::jsonb;
  v_old_json JSONB;
  v_new_json JSONB;
  v_old_estado TEXT;
  v_new_estado TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, rol, workspace_id, deleted_at INTO v_actor_user
  FROM public.users
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Actor autenticado no registrado en public.users';
  END IF;

  IF v_actor_user.rol = 'delegado' THEN
    v_gestor_id := v_actor_user.workspace_id;
    v_actor_rol := 'delegado';
  ELSIF v_actor_user.rol = 'admin' THEN
    v_gestor_id := COALESCE(v_actor_user.workspace_id, v_uid);
    v_actor_rol := 'admin';
  ELSE
    v_gestor_id := v_uid;
    v_actor_rol := 'gestor';
  END IF;

  v_recurso_tipo := TG_TABLE_NAME;
  v_recurso_id := COALESCE(NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    v_accion := 'crear_' || TG_TABLE_NAME;
    v_metadata := jsonb_build_object('op', 'INSERT');
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);

    IF (TG_TABLE_NAME IN ('unidades', 'grupos', 'alquileres', 'inquilinos', 'modalidades_precio'))
       AND ((v_old_json->>'deleted_at') IS NULL AND (v_new_json->>'deleted_at') IS NOT NULL) THEN
      v_accion := 'eliminar_' || TG_TABLE_NAME;
      v_metadata := jsonb_build_object('op', 'SOFT_DELETE');
    ELSIF TG_TABLE_NAME = 'unidades' THEN
      v_old_estado := v_old_json->>'estado';
      v_new_estado := v_new_json->>'estado';
      IF v_old_estado IS DISTINCT FROM v_new_estado THEN
        v_accion := 'cambiar_estado_unidad';
        v_metadata := jsonb_build_object('estado_anterior', v_old_estado, 'nuevo_estado', v_new_estado);
      ELSE
        v_accion := 'actualizar_' || TG_TABLE_NAME;
        v_metadata := jsonb_build_object('op', 'UPDATE');
      END IF;
    ELSE
      v_accion := 'actualizar_' || TG_TABLE_NAME;
      v_metadata := jsonb_build_object('op', 'UPDATE');
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_accion := 'eliminar_fisico_' || TG_TABLE_NAME;
    v_metadata := jsonb_build_object('op', 'DELETE');
  END IF;

  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_gestor_id,
    v_uid,
    v_actor_rol,
    v_accion,
    v_recurso_tipo,
    v_recurso_id,
    v_metadata,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
