-- ==============================================================================
-- pgTAP Test: 011_beta_group_archive.sql
-- Batch B007d: Regression test suite for public.archive_grupo() RPC
-- Verifies authorization matrix: Owner Gestor, Delegado (Cuenta, Grupo, Ver,
-- Revocado, Pendiente, Unidades, Null Workspace), Actor Deleted, Role Buscador,
-- Historical Revoked + Active Coexistence, Cross-Workspace Isolation,
-- Double-archive rejection, RLS SELECT concealment, and operational audit log.
-- ==============================================================================

BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(24);

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
-- 2. Verify RPC existence
-- ------------------------------------------------------------------------------
SELECT has_function(
  'public',
  'archive_grupo',
  ARRAY['uuid']::text[],
  'archive_grupo RPC exists in public schema'
);

-- ------------------------------------------------------------------------------
-- 3. Setup test fixtures with distinct IDs
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_gestor_a UUID := 'a1100000-0000-0000-0000-000000000001'::uuid;
  v_gestor_b UUID := 'b1100000-0000-0000-0000-000000000001'::uuid;
  v_del_cuenta UUID := 'a1100000-0000-0000-0000-000000000002'::uuid;
  v_del_grupo UUID := 'a1100000-0000-0000-0000-000000000003'::uuid;
  v_del_ver UUID := 'a1100000-0000-0000-0000-000000000004'::uuid;
  v_del_revocado UUID := 'a1100000-0000-0000-0000-000000000005'::uuid;
  v_actor_deleted UUID := 'a1100000-0000-0000-0000-000000000006'::uuid;
  v_actor_buscador UUID := 'a1100000-0000-0000-0000-000000000007'::uuid;
  v_del_noworkspace UUID := 'a1100000-0000-0000-0000-000000000008'::uuid;
  v_del_pending UUID := 'a1100000-0000-0000-0000-000000000009'::uuid;
  v_del_unidades UUID := 'a1100000-0000-0000-0000-00000000000a'::uuid;

  v_grp_a1 UUID := 'a1100000-0000-0000-0000-000000000010'::uuid;
  v_grp_a2 UUID := 'a1100000-0000-0000-0000-000000000011'::uuid;
  v_grp_b1 UUID := 'b1100000-0000-0000-0000-000000000010'::uuid;

  v_inv_cuenta UUID := 'a1100000-0000-0000-0000-000000000082'::uuid;
  v_inv_grupo UUID := 'a1100000-0000-0000-0000-000000000083'::uuid;
  v_inv_ver UUID := 'a1100000-0000-0000-0000-000000000084'::uuid;
  v_inv_rev UUID := 'a1100000-0000-0000-0000-000000000085'::uuid;
  v_inv_hist_rev UUID := 'a1100000-0000-0000-0000-000000000086'::uuid;
  v_inv_pending UUID := 'a1100000-0000-0000-0000-000000000087'::uuid;
  v_inv_unidades UUID := 'a1100000-0000-0000-0000-000000000088'::uuid;
BEGIN
  -- Insert auth.users
  INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at) VALUES
    (v_gestor_a, 'gestor_a_011@local.test', '{"role": "gestor", "full_name": "Gestor A 011"}'::jsonb, NOW()),
    (v_gestor_b, 'gestor_b_011@local.test', '{"role": "gestor", "full_name": "Gestor B 011"}'::jsonb, NOW()),
    (v_del_cuenta, 'del_cuenta_011@local.test', '{"role": "gestor", "full_name": "Del Cuenta 011"}'::jsonb, NOW()),
    (v_del_grupo, 'del_grupo_011@local.test', '{"role": "gestor", "full_name": "Del Grupo 011"}'::jsonb, NOW()),
    (v_del_ver, 'del_ver_011@local.test', '{"role": "gestor", "full_name": "Del Ver 011"}'::jsonb, NOW()),
    (v_del_revocado, 'del_rev_011@local.test', '{"role": "gestor", "full_name": "Del Rev 011"}'::jsonb, NOW()),
    (v_actor_deleted, 'deleted_011@local.test', '{"role": "gestor", "full_name": "Deleted 011"}'::jsonb, NOW()),
    (v_actor_buscador, 'buscador_011@local.test', '{"role": "buscador", "full_name": "Buscador 011"}'::jsonb, NOW()),
    (v_del_noworkspace, 'noworkspace_011@local.test', '{"role": "gestor", "full_name": "NoWorkspace 011"}'::jsonb, NOW()),
    (v_del_pending, 'pending_011@local.test', '{"role": "gestor", "full_name": "Pending 011"}'::jsonb, NOW()),
    (v_del_unidades, 'unidades_011@local.test', '{"role": "gestor", "full_name": "Unidades 011"}'::jsonb, NOW());

  -- Update profiles for delegados and negative actors
  PERFORM set_config('rendo.allow_user_mutation', 'true', true);
  UPDATE public.users SET rol = 'delegado', workspace_id = v_gestor_a WHERE id IN (v_del_cuenta, v_del_grupo, v_del_ver, v_del_revocado, v_del_pending, v_del_unidades);
  UPDATE public.users SET rol = 'delegado', workspace_id = NULL WHERE id = v_del_noworkspace;
  UPDATE public.users SET rol = 'buscador', workspace_id = NULL WHERE id = v_actor_buscador;
  UPDATE public.users SET deleted_at = NOW() WHERE id = v_actor_deleted;
  PERFORM set_config('rendo.allow_user_mutation', 'false', true);

  -- Groups
  INSERT INTO public.grupos (id, gestor_id, nombre) VALUES
    (v_grp_a1, v_gestor_a, 'Grupo A1 011'),
    (v_grp_a2, v_gestor_a, 'Grupo A2 011'),
    (v_grp_b1, v_gestor_b, 'Grupo B1 011');

  -- Invitations & Delegations
  INSERT INTO public.invitaciones_delegados (id, gestor_id, delegado_id, email, email_snapshot, estado) VALUES
    (v_inv_cuenta, v_gestor_a, v_del_cuenta, 'del_cuenta_011@local.test', 'del_cuenta_011@local.test', 'aceptada'),
    (v_inv_grupo, v_gestor_a, v_del_grupo, 'del_grupo_011@local.test', 'del_grupo_011@local.test', 'aceptada'),
    (v_inv_ver, v_gestor_a, v_del_ver, 'del_ver_011@local.test', 'del_ver_011@local.test', 'aceptada'),
    (v_inv_rev, v_gestor_a, v_del_revocado, 'del_rev_011@local.test', 'del_rev_011@local.test', 'aceptada'),
    (v_inv_hist_rev, v_gestor_a, v_del_cuenta, 'del_cuenta_011@local.test', 'del_cuenta_011@local.test', 'aceptada'),
    (v_inv_pending, v_gestor_a, v_del_pending, 'pending_011@local.test', 'pending_011@local.test', 'aceptada'),
    (v_inv_unidades, v_gestor_a, v_del_unidades, 'unidades_011@local.test', 'unidades_011@local.test', 'aceptada');

  INSERT INTO public.delegaciones (id, invitacion_id, gestor_id, delegado_id, estado, permiso, alcance_tipo, grupo_id) VALUES
    -- Historical revoked row for v_del_cuenta (must be ignored by active filter)
    ('a1100000-0000-0000-0000-000000000091'::uuid, v_inv_hist_rev, v_gestor_a, v_del_cuenta, 'revocada', 'ver', 'cuenta', NULL),
    -- Active delegation for v_del_cuenta
    ('a1100000-0000-0000-0000-000000000092'::uuid, v_inv_cuenta, v_gestor_a, v_del_cuenta, 'activa', 'gestionar', 'cuenta', NULL),
    ('a1100000-0000-0000-0000-000000000093'::uuid, v_inv_grupo, v_gestor_a, v_del_grupo, 'activa', 'gestionar', 'grupo', v_grp_a1),
    ('a1100000-0000-0000-0000-000000000094'::uuid, v_inv_ver, v_gestor_a, v_del_ver, 'activa', 'ver', 'cuenta', NULL),
    ('a1100000-0000-0000-0000-000000000095'::uuid, v_inv_rev, v_gestor_a, v_del_revocado, 'revocada', 'gestionar', 'cuenta', NULL),
    ('a1100000-0000-0000-0000-000000000096'::uuid, v_inv_pending, v_gestor_a, v_del_pending, 'aceptada_sin_configurar', NULL, NULL, NULL),
    ('a1100000-0000-0000-0000-000000000097'::uuid, v_inv_unidades, v_gestor_a, v_del_unidades, 'activa', 'gestionar', 'unidades', NULL);
END $$;

-- ------------------------------------------------------------------------------
-- 4. Unauthenticated invocation is denied
-- ------------------------------------------------------------------------------
SELECT set_test_claims(NULL, 'anon');
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  NULL,
  NULL,
  'Unauthenticated/anon call to archive_grupo is denied'
);

-- ------------------------------------------------------------------------------
-- 5. Negative: Actor with deleted_at IS NOT NULL is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000006'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Usuario no encontrado o inactivo',
  'Actor with deleted_at IS NOT NULL is rejected'
);

-- ------------------------------------------------------------------------------
-- 6. Negative: Actor with role 'buscador' is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000007'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Actor with rol buscador cannot archive group'
);

-- ------------------------------------------------------------------------------
-- 7. Negative: Delegado with NULL workspace is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000008'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Delegado with NULL workspace is rejected'
);

-- ------------------------------------------------------------------------------
-- 8. Negative: Delegado with pending delegation is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000009'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Delegado with pending delegation is rejected'
);

-- ------------------------------------------------------------------------------
-- 9. Negative: Delegado with scope 'unidades' is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-00000000000a'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Delegado with scope unidades cannot archive group'
);

-- ------------------------------------------------------------------------------
-- 10. Negative: Delegado with scope 'grupo' is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000003'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Delegado with scope grupo cannot archive group'
);

-- ------------------------------------------------------------------------------
-- 11. Negative: Delegado with permiso 'ver' is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000004'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Delegado with permiso ver cannot archive group'
);

-- ------------------------------------------------------------------------------
-- 12. Negative: Revoked Delegado is rejected
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000005'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Revoked Delegado cannot archive group'
);

-- ------------------------------------------------------------------------------
-- 13. Negative: Cross-workspace isolation (Gestor B cannot archive Gestor A group)
-- ------------------------------------------------------------------------------
SELECT set_test_claims('b1100000-0000-0000-0000-000000000001'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Gestor B cannot archive Gestor A group'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT deleted_at FROM public.grupos WHERE id = 'a1100000-0000-0000-0000-000000000010'::uuid),
  NULL,
  'Grupo A1 deleted_at remains NULL after all rejected attempts'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones WHERE recurso_id = 'a1100000-0000-0000-0000-000000000010'::uuid),
  0,
  'No audit log generated for any rejected attempt on Grupo A1'
);

-- ------------------------------------------------------------------------------
-- 14. Positive: Delegado with active delegation (historical revoked ignored) archives Grupo A1
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000002'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Delegado with active delegation (ignoring revoked history) archives Grupo A1'
);

SET LOCAL ROLE postgres;

SELECT isnt(
  (SELECT deleted_at FROM public.grupos WHERE id = 'a1100000-0000-0000-0000-000000000010'::uuid),
  NULL,
  'Grupo A1 deleted_at is set after Delegado archive'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1100000-0000-0000-0000-000000000010'::uuid
     AND accion = 'eliminar_grupos'
     AND actor_rol = 'delegado'
     AND actor_id = 'a1100000-0000-0000-0000-000000000002'::uuid
     AND gestor_id = 'a1100000-0000-0000-0000-000000000001'::uuid
     AND metadata->>'op' = 'SOFT_DELETE'),
  1,
  'Audit log recorded eliminar_grupos with actor_rol delegado and op SOFT_DELETE'
);

-- ------------------------------------------------------------------------------
-- 15. Idempotency / Double-archive rejection
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000002'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Archiving already-archived group is rejected (idempotent rejection)'
);

-- ------------------------------------------------------------------------------
-- 16. Positive: Owner Gestor A archives Grupo A2
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000001'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT public.archive_grupo('a1100000-0000-0000-0000-000000000011'::uuid) $$,
  'Owner Gestor A successfully archives Grupo A2'
);

SET LOCAL ROLE postgres;

SELECT isnt(
  (SELECT deleted_at FROM public.grupos WHERE id = 'a1100000-0000-0000-0000-000000000011'::uuid),
  NULL,
  'Grupo A2 deleted_at is set after Gestor archive'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones
   WHERE recurso_id = 'a1100000-0000-0000-0000-000000000011'::uuid
     AND accion = 'eliminar_grupos'
     AND actor_rol = 'gestor'
     AND actor_id = 'a1100000-0000-0000-0000-000000000001'::uuid
     AND gestor_id = 'a1100000-0000-0000-0000-000000000001'::uuid
     AND metadata->>'op' = 'SOFT_DELETE'),
  1,
  'Audit log recorded eliminar_grupos with actor_rol gestor and op SOFT_DELETE'
);

-- ------------------------------------------------------------------------------
-- 17. Gestor A cannot archive foreign group B1
-- ------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.archive_grupo('b1100000-0000-0000-0000-000000000010'::uuid) $$,
  'Grupo no encontrado',
  'Gestor A cannot archive foreign group B1'
);

SET LOCAL ROLE postgres;

SELECT is(
  (SELECT deleted_at FROM public.grupos WHERE id = 'b1100000-0000-0000-0000-000000000010'::uuid),
  NULL,
  'Grupo B1 deleted_at remains NULL'
);

SELECT is(
  (SELECT count(*)::int FROM public.log_acciones WHERE recurso_id = 'b1100000-0000-0000-0000-000000000010'::uuid),
  0,
  'No audit log generated for foreign group archive attempt'
);

-- ------------------------------------------------------------------------------
-- 18. Authenticated client SELECT concealment: Archived groups invisible under RLS
-- ------------------------------------------------------------------------------
SELECT set_test_claims('a1100000-0000-0000-0000-000000000001'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$ SELECT count(*)::int FROM public.grupos WHERE id = 'a1100000-0000-0000-0000-000000000010'::uuid $$,
  $$ VALUES (0::int) $$,
  'Archived group A1 is concealed and returns 0 rows on client SELECT under RLS'
);

SET LOCAL ROLE postgres;

SELECT * FROM finish();
ROLLBACK;
