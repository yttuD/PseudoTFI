-- ==============================================================================
-- pgTAP Test: 010_beta_operational_audit.sql
-- Batch B007c: Operational Audit Mutation Trigger Verification Across Schemas
-- Verifies public.audit_operational_mutation() under authenticated RLS, actor
-- attribution, soft-delete, physical delete, insert, and log immutability.
-- ==============================================================================

BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(36);

-- ------------------------------------------------------------------------------
-- 1. Helper function for setting JWT claims
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_test_claims(p_uid UUID, p_role TEXT DEFAULT 'authenticated')
RETURNS void AS $$
BEGIN
  IF p_uid IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', COALESCE(p_role, 'anon'), true);
    PERFORM set_config('request.jwt.claims', json_build_object('role', COALESCE(p_role, 'anon'))::text, true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
    PERFORM set_config('request.jwt.claim.role', COALESCE(p_role, 'authenticated'), true);
    PERFORM set_config('request.jwt.claims', json_build_object(
      'sub', p_uid::text,
      'role', COALESCE(p_role, 'authenticated'),
      'email', p_uid::text || '@test.com'
    )::text, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Verify audit trigger function existence
-- ------------------------------------------------------------------------------
SELECT has_function('public', 'audit_operational_mutation', ARRAY[]::text[], 'audit_operational_mutation trigger function exists');

-- ------------------------------------------------------------------------------
-- 3. Setup isolated transaction fixtures with unique UUIDs (no conflict silencing)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_gestor_a UUID := 'a1000000-0000-0000-0000-000000000001'::uuid;
  v_gestor_b UUID := 'b1000000-0000-0000-0000-000000000001'::uuid;
  v_delegado_a UUID := 'a1000000-0000-0000-0000-000000000002'::uuid;
  v_grupo_a UUID := 'a1000000-0000-0000-0000-000000000010'::uuid;
  v_grupo_b UUID := 'b1000000-0000-0000-0000-000000000010'::uuid;
  v_unidad_a UUID := 'a1000000-0000-0000-0000-000000000020'::uuid;
  v_modalidad_a UUID := 'a1000000-0000-0000-0000-000000000030'::uuid;
  v_inquilino_a UUID := 'a1000000-0000-0000-0000-000000000040'::uuid;
  v_alquiler_a UUID := 'a1000000-0000-0000-0000-000000000050'::uuid;
  v_inv_a UUID := 'a1000000-0000-0000-0000-000000000080'::uuid;
  v_del_a UUID := 'a1000000-0000-0000-0000-000000000090'::uuid;
BEGIN
  -- Insert auth.users which automatically creates public.users profile via trigger
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at) VALUES
    (v_gestor_a, 'gestor_audit_a@local.test', '{"role": "gestor", "full_name": "Gestor A"}'::jsonb, NOW()),
    (v_gestor_b, 'gestor_audit_b@local.test', '{"role": "gestor", "full_name": "Gestor B"}'::jsonb, NOW()),
    (v_delegado_a, 'delegado_audit_a@local.test', '{"role": "gestor", "full_name": "Delegado A"}'::jsonb, NOW());

  -- Update Delegado profile to set role and workspace under explicit mutation permission
  PERFORM set_config('rendo.allow_user_mutation', 'true', true);
  UPDATE public.users SET rol = 'delegado', workspace_id = v_gestor_a WHERE id = v_delegado_a;
  PERFORM set_config('rendo.allow_user_mutation', 'false', true);

  -- Groups
  INSERT INTO public.grupos (id, gestor_id, nombre) VALUES
    (v_grupo_a, v_gestor_a, 'Grupo Audit A'),
    (v_grupo_b, v_gestor_b, 'Grupo Audit B');

  -- Unit in Grupo A
  INSERT INTO public.unidades (id, gestor_id, grupo_id, titulo_es, estado, categoria) VALUES
    (v_unidad_a, v_gestor_a, v_grupo_a, 'Depto Audit A', 'publicada', 'departamento');

  -- Modalidad on Unit A
  INSERT INTO public.modalidades_precio (id, unidad_id, unidad_tiempo, cantidad_tiempo, precio) VALUES
    (v_modalidad_a, v_unidad_a, 'mes', 1, 60000);

  -- Inquilino on Gestor A
  INSERT INTO public.inquilinos (id, gestor_id, nombre_completo, email) VALUES
    (v_inquilino_a, v_gestor_a, 'Inquilino Audit A', 'inq_audit@local.test');

  -- Alquiler on Gestor A
  INSERT INTO public.alquileres (id, gestor_id, unidad_id, inquilino_id, modalidad, fecha_inicio, fecha_fin, inicio_at, fin_at, monto_total) VALUES
    (v_alquiler_a, v_gestor_a, v_unidad_a, v_inquilino_a, 'mensual', CURRENT_DATE, CURRENT_DATE + 30,
     CURRENT_DATE::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires',
     (CURRENT_DATE + 30)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires', 60000);

  -- Invitation and Delegation for Delegado A
  INSERT INTO public.invitaciones_delegados (id, gestor_id, delegado_id, email, email_snapshot, estado) VALUES
    (v_inv_a, v_gestor_a, v_delegado_a, 'delegado_audit_a@local.test', 'delegado_audit_a@local.test', 'aceptada');

  INSERT INTO public.delegaciones (id, invitacion_id, gestor_id, delegado_id, estado, permiso, alcance_tipo, grupo_id) VALUES
    (v_del_a, v_inv_a, v_gestor_a, v_delegado_a, 'activa', 'gestionar', 'grupo', v_grupo_a);
END $$;

-- ------------------------------------------------------------------------------
-- 4. Test UPDATE on grupos (table without 'estado') under authenticated RLS
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1000000-0000-0000-0000-000000000001'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.grupos SET nombre = 'Grupo Audit Renombrado' WHERE id = 'a1000000-0000-0000-0000-000000000010'::uuid $$,
  'UPDATE on grupos executes without record old has no field estado error'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT nombre FROM public.grupos WHERE id = 'a1000000-0000-0000-0000-000000000010'::uuid),
  'Grupo Audit Renombrado',
  'Grupo row was updated and persisted'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000010'::uuid
     AND accion = 'actualizar_grupos'
     AND gestor_id = 'a1000000-0000-0000-0000-000000000001'::uuid
     AND actor_id = 'a1000000-0000-0000-0000-000000000001'::uuid
     AND actor_rol = 'gestor'
     AND metadata->>'op' = 'UPDATE'),
  1,
  'Audit log recorded actualizar_grupos with actor gestor and op UPDATE'
);

-- ------------------------------------------------------------------------------
-- 5. Test UPDATE on inquilinos (table without 'estado')
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.inquilinos SET nombre_completo = 'Inquilino Modificado' WHERE id = 'a1000000-0000-0000-0000-000000000040'::uuid $$,
  'UPDATE on inquilinos executes without missing field error'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT nombre_completo FROM public.inquilinos WHERE id = 'a1000000-0000-0000-0000-000000000040'::uuid),
  'Inquilino Modificado',
  'Inquilino row was updated and persisted'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000040'::uuid
     AND accion = 'actualizar_inquilinos'
     AND metadata->>'op' = 'UPDATE'),
  1,
  'Audit log recorded actualizar_inquilinos with op UPDATE'
);

-- ------------------------------------------------------------------------------
-- 6. Test UPDATE on modalidades_precio (table without 'estado')
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.modalidades_precio SET precio = 70000 WHERE id = 'a1000000-0000-0000-0000-000000000030'::uuid $$,
  'UPDATE on modalidades_precio executes without missing field error'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT precio FROM public.modalidades_precio WHERE id = 'a1000000-0000-0000-0000-000000000030'::uuid),
  70000::numeric,
  'Modalidad precio was updated and persisted'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000030'::uuid
     AND accion = 'actualizar_modalidades_precio'
     AND metadata->>'op' = 'UPDATE'),
  1,
  'Audit log recorded actualizar_modalidades_precio with op UPDATE'
);

-- ------------------------------------------------------------------------------
-- 7. Test UPDATE on alquileres (table without 'estado')
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.alquileres SET observaciones = 'Obs Audit Test' WHERE id = 'a1000000-0000-0000-0000-000000000050'::uuid $$,
  'UPDATE on alquileres executes without missing field error'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT observaciones FROM public.alquileres WHERE id = 'a1000000-0000-0000-0000-000000000050'::uuid),
  'Obs Audit Test',
  'Alquiler observaciones was updated and persisted'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000050'::uuid
     AND accion = 'actualizar_alquileres'
     AND metadata->>'op' = 'UPDATE'),
  1,
  'Audit log recorded actualizar_alquileres with op UPDATE'
);

-- ------------------------------------------------------------------------------
-- 8. Test UPDATE on unidades: normal title update vs state change
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

-- 8a: Title update (estado unchanged)
SELECT lives_ok(
  $$ UPDATE public.unidades SET titulo_es = 'Depto Titulo Modificado' WHERE id = 'a1000000-0000-0000-0000-000000000020'::uuid $$,
  'UPDATE on unidades without estado change executes successfully'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT titulo_es FROM public.unidades WHERE id = 'a1000000-0000-0000-0000-000000000020'::uuid),
  'Depto Titulo Modificado',
  'Unidad titulo_es was updated and persisted'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000020'::uuid
     AND accion = 'actualizar_unidades'
     AND metadata->>'op' = 'UPDATE'),
  1,
  'Audit log recorded actualizar_unidades for title change'
);

-- 8b: State change (estado publicada -> pausada)
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.unidades SET estado = 'pausada' WHERE id = 'a1000000-0000-0000-0000-000000000020'::uuid $$,
  'UPDATE on unidades changing estado executes successfully'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT estado FROM public.unidades WHERE id = 'a1000000-0000-0000-0000-000000000020'::uuid),
  'pausada',
  'Unidad estado was updated to pausada'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000020'::uuid
     AND accion = 'cambiar_estado_unidad'
     AND metadata->>'estado_anterior' = 'publicada'
     AND metadata->>'nuevo_estado' = 'pausada'),
  1,
  'Audit log recorded cambiar_estado_unidad with estado_anterior and nuevo_estado'
);

-- ------------------------------------------------------------------------------
-- 9. Test SOFT_DELETE on grupos: Direct UPDATE denied by RLS, RPC archive permitted
-- ------------------------------------------------------------------------------
-- 9a. Direct UPDATE of deleted_at under authenticated RLS is DENIED (SQLSTATE 42501)
-- can_manage_grupo() returns FALSE on rows with deleted_at IS NOT NULL, failing WITH CHECK
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ UPDATE public.grupos SET deleted_at = NOW() WHERE id = 'a1000000-0000-0000-0000-000000000010'::uuid $$,
  '42501',
  NULL,
  'Direct client UPDATE of deleted_at on grupos is denied by RLS (SQLSTATE 42501)'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT deleted_at FROM public.grupos WHERE id = 'a1000000-0000-0000-0000-000000000010'::uuid),
  NULL,
  'Grupo deleted_at remains NULL after denied direct update'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000010'::uuid
     AND accion = 'eliminar_grupos'),
  0,
  'No audit log generated for aborted direct deleted_at update'
);

-- 9b. Authorized archive via archive_grupo RPC succeeds and triggers operational audit
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT public.archive_grupo('a1000000-0000-0000-0000-000000000010'::uuid) $$,
  'archive_grupo RPC executes successfully for owner gestor'
);

SET LOCAL ROLE postgres;

SELECT isnt(
  (SELECT deleted_at FROM public.grupos WHERE id = 'a1000000-0000-0000-0000-000000000010'::uuid),
  NULL,
  'Grupo deleted_at is now set by archive_grupo RPC'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000010'::uuid
     AND accion = 'eliminar_grupos'
     AND metadata->>'op' = 'SOFT_DELETE'),
  1,
  'Audit log recorded eliminar_grupos with op SOFT_DELETE via trigger'
);

-- ------------------------------------------------------------------------------
-- 10. Test INSERT and Physical DELETE retention
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

-- Insert a temporary group
SELECT lives_ok(
  $$ INSERT INTO public.grupos (id, gestor_id, nombre)
     VALUES ('a1000000-0000-0000-0000-000000000099'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'Grupo Temp') $$,
  'INSERT into grupos executes successfully'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000099'::uuid
     AND accion = 'crear_grupos'
     AND metadata->>'op' = 'INSERT'),
  1,
  'Audit log recorded crear_grupos with op INSERT'
);

-- Physical delete of temporary group
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ DELETE FROM public.grupos WHERE id = 'a1000000-0000-0000-0000-000000000099'::uuid $$,
  'Physical DELETE from grupos executes successfully'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000099'::uuid
     AND accion = 'eliminar_fisico_grupos'
     AND metadata->>'op' = 'DELETE'),
  1,
  'Audit log recorded eliminar_fisico_grupos with op DELETE'
);

-- ------------------------------------------------------------------------------
-- 11. Test Delegado actor attribution
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1000000-0000-0000-0000-000000000002'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ UPDATE public.unidades SET titulo_es = 'Depto Delegado Mod' WHERE id = 'a1000000-0000-0000-0000-000000000020'::uuid $$,
  'UPDATE on unidades by delegado executes successfully'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1000000-0000-0000-0000-000000000020'::uuid
     AND actor_rol = 'delegado'
     AND actor_id = 'a1000000-0000-0000-0000-000000000002'::uuid
     AND gestor_id = 'a1000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Audit log attributed actor_rol delegado, actor_id delegado, gestor_id workspace'
);

-- ------------------------------------------------------------------------------
-- 12. Test Workspace Isolation (cannot update other workspace group)
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1000000-0000-0000-0000-000000000001'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$ WITH upd AS (
       UPDATE public.grupos SET nombre = 'Robo'
       WHERE id = 'b1000000-0000-0000-0000-000000000010'::uuid
       RETURNING *
     ) SELECT count(*)::int FROM upd $$,
  $$ VALUES (0::int) $$,
  'Updating group in different workspace affects 0 rows under RLS'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones WHERE recurso_id = 'b1000000-0000-0000-0000-000000000010'::uuid),
  0,
  'No audit log generated for cross-workspace update attempt'
);

-- ------------------------------------------------------------------------------
-- 13. Test Client Immutability on log_acciones (RLS prevents direct mutations)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

-- Direct INSERT must be rejected (throws)
SELECT throws_ok(
  $$ INSERT INTO public.log_acciones (gestor_id, actor_id, actor_rol, accion, recurso_tipo, recurso_id)
     VALUES ('a1000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'gestor', 'fake', 'unidades', 'a1000000-0000-0000-0000-000000000020'::uuid) $$,
  NULL,
  NULL,
  'Direct client INSERT into log_acciones is rejected'
);

-- Direct UPDATE affects 0 rows under RLS
SELECT results_eq(
  $$ WITH upd AS (
       UPDATE public.log_acciones SET accion = 'tampered'
       WHERE gestor_id = 'a1000000-0000-0000-0000-000000000001'::uuid
       RETURNING *
     ) SELECT count(*)::int FROM upd $$,
  $$ VALUES (0::int) $$,
  'log_acciones entries cannot be updated (zero rows affected under RLS)'
);

-- Direct DELETE affects 0 rows under RLS
SELECT results_eq(
  $$ WITH del AS (
       DELETE FROM public.log_acciones
       WHERE gestor_id = 'a1000000-0000-0000-0000-000000000001'::uuid
       RETURNING *
     ) SELECT count(*)::int FROM del $$,
  $$ VALUES (0::int) $$,
  'log_acciones entries cannot be deleted (zero rows affected under RLS)'
);

SET LOCAL ROLE postgres;

SELECT * FROM finish();
ROLLBACK;
