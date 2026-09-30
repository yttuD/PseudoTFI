-- ==============================================================================
-- pgTAP Test: 004_delegado_scope_authorization.sql
-- Feature 004: Delegado Scope and Granular Authorization Policy Verification
-- Actor x Table x Storage Full Matrix pgTAP Suite (Phase 13 / T098-T100)
-- ==============================================================================

BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(121);

-- ------------------------------------------------------------------------------
-- 1. Verify schema tables and extension exist (11 assertions)
-- ------------------------------------------------------------------------------
SELECT has_table('public', 'invitaciones_delegados', 'Table invitaciones_delegados exists');
SELECT has_table('public', 'delegaciones', 'Table delegaciones exists');
SELECT has_table('public', 'delegacion_unidades', 'Table delegacion_unidades exists');
SELECT has_table('public', 'notificaciones', 'Table notificaciones exists');
SELECT has_table('public', 'email_delivery_outbox', 'Table email_delivery_outbox exists');
SELECT has_table('public', 'log_acciones', 'Table log_acciones exists');
SELECT has_table('public', 'unidades', 'Table unidades exists');
SELECT has_table('public', 'grupos', 'Table grupos exists');
SELECT has_table('public', 'alquileres', 'Table alquileres exists');
SELECT has_table('public', 'inquilinos', 'Table inquilinos exists');
SELECT has_table('public', 'pagos', 'Table pagos exists');

-- ------------------------------------------------------------------------------
-- 2. Verify helper functions exist and have search_path set (11 assertions)
-- ------------------------------------------------------------------------------
SELECT has_function('public', 'is_gestor_owner', ARRAY['uuid'], 'is_gestor_owner helper exists');
SELECT has_function('public', 'can_read_unidad', ARRAY['uuid'], 'can_read_unidad helper exists');
SELECT has_function('public', 'can_manage_unidad', ARRAY['uuid'], 'can_manage_unidad helper exists');
SELECT has_function('public', 'can_create_unidad', ARRAY['uuid', 'uuid'], 'can_create_unidad helper exists');
SELECT has_function('public', 'can_read_grupo', ARRAY['uuid'], 'can_read_grupo helper exists');
SELECT has_function('public', 'can_manage_grupo', ARRAY['uuid'], 'can_manage_grupo helper exists');
SELECT has_function('public', 'can_manage_grupo_membership', ARRAY['uuid'], 'can_manage_grupo_membership helper exists');
SELECT has_function('public', 'can_read_alquiler', ARRAY['uuid'], 'can_read_alquiler helper exists');
SELECT has_function('public', 'can_manage_alquiler', ARRAY['uuid'], 'can_manage_alquiler helper exists');
SELECT has_function('public', 'can_read_inquilino', ARRAY['uuid'], 'can_read_inquilino helper exists');
SELECT has_function('public', 'can_manage_inquilino', ARRAY['uuid'], 'can_manage_inquilino helper exists');

-- ------------------------------------------------------------------------------
-- 3. Verify transactional RPCs and triggers exist (7 assertions)
-- ------------------------------------------------------------------------------
SELECT has_function('public', 'create_delegado_invitation', ARRAY['uuid', 'text'], 'create_delegado_invitation RPC exists');
SELECT has_function('public', 'accept_delegado_invitation', ARRAY['uuid'], 'accept_delegado_invitation RPC exists');
SELECT has_function('public', 'reject_delegado_invitation', ARRAY['uuid'], 'reject_delegado_invitation RPC exists');
SELECT has_function('public', 'cancel_delegado_invitation', ARRAY['uuid'], 'cancel_delegado_invitation RPC exists');
SELECT has_function('public', 'configure_delegacion', ARRAY['uuid', 'text', 'text', 'uuid', 'uuid[]'], 'configure_delegacion RPC exists');
SELECT has_function('public', 'revoke_delegacion', ARRAY['uuid'], 'revoke_delegacion RPC exists');
SELECT has_function('public', 'audit_operational_mutation', ARRAY[]::text[], 'audit_operational_mutation trigger function exists');

-- ------------------------------------------------------------------------------
-- 4. Verify absence of legacy permissive policies across migrations (1 assertion)
-- ------------------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE policyname IN (
    'Gestor puede ver sus pagos',
    'Gestores config fiscal workspace',
    'Gestores acceden a sus comprobantes AFIP',
    'Permitir lectura de vistas a autenticados',
    'Permitir lectura de contactos a autenticados',
    'Contratos son accesibles',
    'Gestor puede subir contratos',
    'Gestor puede eliminar contratos',
    'Fotos de unidades son publicas',
    'Gestor puede subir fotos',
    'Gestor puede borrar fotos'
  )),
  0,
  'All legacy permissive policies must be completely absent'
);

-- ------------------------------------------------------------------------------
-- 5. Setup Test Fixture Data in transaction (auth.users, public.users, scopes)
-- ------------------------------------------------------------------------------
CREATE TEMPORARY TABLE test_fixture_ids (
  key TEXT PRIMARY KEY,
  val UUID NOT NULL
);

INSERT INTO test_fixture_ids (key, val) VALUES
  ('gestor_a', '11111111-1111-1111-1111-111111111111'::uuid),
  ('gestor_b', '22222222-2222-2222-2222-222222222222'::uuid),
  ('del_ver', '33333333-3333-3333-3333-333333333333'::uuid),
  ('del_ges', '44444444-4444-4444-4444-444444444444'::uuid),
  ('del_unconf', '55555555-5555-5555-5555-555555555555'::uuid),
  ('del_revoked', '66666666-6666-6666-6666-666666666666'::uuid),
  ('public_user', '77777777-7777-7777-7777-777777777777'::uuid),
  ('unverified_user', '88888888-8888-8888-8888-888888888888'::uuid),
  ('admin_user', '99999999-9999-9999-9999-999999999999'::uuid),
  ('grupo_a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  ('unit_in_group', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
  ('unit_isolated', 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),
  ('unit_gestor_b', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'::uuid),
  ('alq_group', 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid),
  ('alq_isolated', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2'::uuid),
  ('inq_a', 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid),
  ('pago_a', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'::uuid);

DO $$
DECLARE
  v_gestor_a UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  v_gestor_b UUID := '22222222-2222-2222-2222-222222222222'::uuid;
  v_del_ver UUID := '33333333-3333-3333-3333-333333333333'::uuid;
  v_del_ges UUID := '44444444-4444-4444-4444-444444444444'::uuid;
  v_del_unconf UUID := '55555555-5555-5555-5555-555555555555'::uuid;
  v_del_revoked UUID := '66666666-6666-6666-6666-666666666666'::uuid;
  v_public_user UUID := '77777777-7777-7777-7777-777777777777'::uuid;
  v_unverified_user UUID := '88888888-8888-8888-8888-888888888888'::uuid;
  v_admin_user UUID := '99999999-9999-9999-9999-999999999999'::uuid;

  v_grupo_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  v_unit_in_group UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
  v_unit_isolated UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid;
  v_unit_gestor_b UUID := 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'::uuid;
  v_inq_a UUID := 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'::uuid;
  v_alq_group UUID := 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid;
  v_alq_isolated UUID := 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2'::uuid;
  v_pago_a UUID := 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'::uuid;

  v_inv_ver UUID := '10101010-1010-1010-1010-101010101010'::uuid;
  v_inv_ges UUID := '20202020-2020-2020-2020-202020202020'::uuid;
  v_inv_unconf UUID := '30303030-3030-3030-3030-303030303030'::uuid;
  v_deleg_ver UUID := '40404040-4040-4040-4040-404040404040'::uuid;
  v_deleg_ges UUID := '50505050-5050-5050-5050-505050505050'::uuid;
  v_deleg_unconf UUID := '60606060-6060-6060-6060-606060606060'::uuid;
BEGIN
  -- Insert auth.users with confirmed email timestamps
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
      (v_gestor_a, 'gestor_a@test.com', NOW()),
      (v_gestor_b, 'gestor_b@test.com', NOW()),
      (v_del_ver, 'del_ver@test.com', NOW()),
      (v_del_ges, 'del_ges@test.com', NOW()),
      (v_del_unconf, 'del_unconf@test.com', NOW()),
      (v_del_revoked, 'del_revoked@test.com', NOW()),
      (v_public_user, 'public_user@test.com', NOW()),
      (v_unverified_user, 'unverified@test.com', NULL),
      (v_admin_user, 'admin_user@test.com', NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_confirmed_at = EXCLUDED.email_confirmed_at;
  END IF;

  -- Insert public.users with bypass
  PERFORM set_config('rendo.allow_user_mutation', 'true', true);
  INSERT INTO public.users (id, full_name, rol, workspace_id, cupo_maximo) VALUES
    (v_gestor_a, 'Gestor A', 'gestor', NULL, 10),
    (v_gestor_b, 'Gestor B', 'gestor', NULL, 10),
    (v_del_ver, 'Delegado Ver', 'delegado', v_gestor_a, 0),
    (v_del_ges, 'Delegado Gestionar', 'delegado', v_gestor_a, 0),
    (v_del_unconf, 'Delegado Unconfigured', 'delegado', v_gestor_a, 0),
    (v_del_revoked, 'Delegado Revoked', 'gestor', NULL, 3),
    (v_public_user, 'Public User', 'gestor', NULL, 3),
    (v_unverified_user, 'Unverified User', 'gestor', NULL, 3),
    (v_admin_user, 'Admin User', 'gestor', NULL, 3)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    rol = EXCLUDED.rol,
    workspace_id = EXCLUDED.workspace_id;
  PERFORM set_config('rendo.allow_user_mutation', 'false', true);

  -- Insert Grupo
  INSERT INTO public.grupos (id, gestor_id, nombre) VALUES
    (v_grupo_a, v_gestor_a, 'Edificio Central')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Unidades
  INSERT INTO public.unidades (id, gestor_id, grupo_id, titulo_es, estado, categoria) VALUES
    (v_unit_in_group, v_gestor_a, v_grupo_a, 'Depto 101', 'publicada', 'departamento'),
    (v_unit_isolated, v_gestor_a, NULL, 'Cochera 5', 'publicada', 'cochera'),
    (v_unit_gestor_b, v_gestor_b, NULL, 'Local B', 'publicada', 'comercial')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Inquilino
  INSERT INTO public.inquilinos (id, gestor_id, nombre_completo, email, telefono, documento) VALUES
    (v_inq_a, v_gestor_a, 'Juan Inquilino', 'inquilino@test.com', '12345678', '99887766')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Alquileres
  INSERT INTO public.alquileres (id, gestor_id, unidad_id, inquilino_id, fecha_inicio, fecha_fin, inicio_at, fin_at, monto_total) VALUES
    (v_alq_group, v_gestor_a, v_unit_in_group, v_inq_a, CURRENT_DATE, CURRENT_DATE + 365,
      CURRENT_DATE::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires',
      (CURRENT_DATE + 366)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires', 500000),
    (v_alq_isolated, v_gestor_a, v_unit_isolated, v_inq_a, CURRENT_DATE, CURRENT_DATE + 365,
      CURRENT_DATE::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires',
      (CURRENT_DATE + 366)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires', 150000)
  ON CONFLICT (id) DO NOTHING;

  -- Insert Pago
  INSERT INTO public.pagos (id, gestor_id, metodo, monto, cupo_adquirido, estado) VALUES
    (v_pago_a, v_gestor_a, 'mercadopago', 50000, 5, 'aprobado')
  ON CONFLICT (id) DO NOTHING;

  -- Insert AFIP Config
  INSERT INTO public.gestor_afip_config (gestor_id, cuit, razon_social, condicion_iva, punto_venta, domicilio_fiscal, entorno) VALUES
    (v_gestor_a, '20123456789', 'Gestor A SA', 'monotributo', 1, 'Calle Falsa 123', 'homologacion')
  ON CONFLICT (gestor_id) DO NOTHING;

  -- Insert Invitations and Delegations
  INSERT INTO public.invitaciones_delegados (id, gestor_id, delegado_id, email, email_snapshot, estado) VALUES
    (v_inv_ver, v_gestor_a, v_del_ver, 'del_ver@test.com', 'del_ver@test.com', 'aceptada'),
    (v_inv_ges, v_gestor_a, v_del_ges, 'del_ges@test.com', 'del_ges@test.com', 'aceptada'),
    (v_inv_unconf, v_gestor_a, v_del_unconf, 'del_unconf@test.com', 'del_unconf@test.com', 'aceptada')
  ON CONFLICT (id) DO NOTHING;

  -- del_ver: active, permiso = 'ver', scope = 'grupo'
  INSERT INTO public.delegaciones (id, invitacion_id, gestor_id, delegado_id, estado, permiso, alcance_tipo, grupo_id) VALUES
    (v_deleg_ver, v_inv_ver, v_gestor_a, v_del_ver, 'activa', 'ver', 'grupo', v_grupo_a)
  ON CONFLICT (id) DO NOTHING;

  -- del_ges: active, permiso = 'gestionar', scope = 'unidades' (unit_isolated only)
  INSERT INTO public.delegaciones (id, invitacion_id, gestor_id, delegado_id, estado, permiso, alcance_tipo) VALUES
    (v_deleg_ges, v_inv_ges, v_gestor_a, v_del_ges, 'activa', 'gestionar', 'unidades')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.delegacion_unidades (delegacion_id, unidad_id) VALUES
    (v_deleg_ges, v_unit_isolated)
  ON CONFLICT DO NOTHING;

  -- del_unconf: state = 'aceptada_sin_configurar'
  INSERT INTO public.delegaciones (id, invitacion_id, gestor_id, delegado_id, estado, permiso, alcance_tipo) VALUES
    (v_deleg_unconf, v_inv_unconf, v_gestor_a, v_del_unconf, 'aceptada_sin_configurar', NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Fixture Audit Log row for Gestor A
  INSERT INTO public.log_acciones (id, gestor_id, actor_id, actor_rol, accion, recurso_tipo, recurso_id) VALUES
    ('70707070-7070-7070-7070-707070707070'::uuid, v_gestor_a, v_gestor_a, 'gestor', 'fixture_init', 'unidades', v_unit_in_group)
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT set_config('rendo.allow_user_mutation', 'false', true);

-- ------------------------------------------------------------------------------
-- 6. Safe Context Switch Helper (invoker rights, non-security-definer)
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
GRANT EXECUTE ON FUNCTION set_test_claims(UUID, TEXT) TO PUBLIC;

-- ------------------------------------------------------------------------------
-- 7. Anonymous Actor Integrity (16 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims(NULL, 'anon');
SET LOCAL ROLE anon;

-- Anon can read published active marketplace units
SELECT isnt_empty(
  $$ SELECT id FROM public.unidades WHERE estado = 'publicada' AND deleted_at IS NULL $$,
  'Anon can query published active marketplace units'
);

-- Anon cannot see unpublished units or deleted units
SELECT is_empty(
  $$ SELECT id FROM public.unidades WHERE estado <> 'publicada' OR deleted_at IS NOT NULL $$,
  'Anon cannot query non-published or deleted units'
);

-- Anon cannot read private entities
SELECT is_empty($$ SELECT id FROM public.grupos $$, 'Anon cannot read grupos');
SELECT is_empty($$ SELECT id FROM public.alquileres $$, 'Anon cannot read alquileres');
SELECT is_empty($$ SELECT id FROM public.inquilinos $$, 'Anon cannot read inquilinos');
SELECT is_empty($$ SELECT id FROM public.pagos $$, 'Anon cannot read pagos');
SELECT is_empty($$ SELECT id FROM public.gestor_afip_config $$, 'Anon cannot read gestor_afip_config');
SELECT is_empty($$ SELECT id FROM public.log_acciones $$, 'Anon cannot read log_acciones');
SELECT is_empty($$ SELECT id FROM public.delegaciones $$, 'Anon cannot read delegaciones');

-- Anon cannot execute revoked helpers (must fail with permission denied 42501, not return false)
SELECT throws_ok(
  $$ SELECT public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid) $$,
  '42501',
  NULL,
  'Anon cannot execute can_read_unidad (42501 permission denied)'
);
SELECT throws_ok(
  $$ SELECT public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid) $$,
  '42501',
  NULL,
  'Anon cannot execute can_manage_unidad (42501 permission denied)'
);
SELECT throws_ok(
  $$ SELECT public.is_gestor_owner('11111111-1111-1111-1111-111111111111'::uuid) $$,
  '42501',
  NULL,
  'Anon cannot execute is_gestor_owner (42501 permission denied)'
);
SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation('33333333-3333-3333-3333-333333333333'::uuid, 'del_ver@test.com') $$,
  '42501',
  NULL,
  'Anon cannot execute create_delegado_invitation (42501 permission denied)'
);
SELECT throws_ok(
  $$ SELECT public.accept_delegado_invitation('10101010-1010-1010-1010-101010101010'::uuid) $$,
  '42501',
  NULL,
  'Anon cannot execute accept_delegado_invitation (42501 permission denied)'
);

-- Anon cannot read storage contracts bucket
SELECT is_empty(
  $$ SELECT id FROM storage.objects WHERE bucket_id = 'contratos' $$,
  'Anon cannot read from contratos storage bucket'
);

-- Anon mutation attempts on unidades are blocked by RLS
SELECT throws_ok(
  $$ INSERT INTO public.unidades (gestor_id, categoria, titulo_es) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'departamento', 'Anon Hack') $$,
  NULL,
  NULL,
  'Anon cannot insert into unidades (RLS denied)'
);

-- ------------------------------------------------------------------------------
-- 8. Actor: del_ver (Permission: ver, Scope: grupo_a) (12 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('33333333-3333-3333-3333-333333333333'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Can read unit_in_group (in grupo_a)
SELECT is(public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), true, 'del_ver can read unit in assigned grupo');
-- Cannot read unit_isolated (not in grupo_a)
SELECT is(public.can_read_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), false, 'del_ver cannot read unit outside assigned grupo');
-- Cannot read Gestor B unit
SELECT is(public.can_read_unidad('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'::uuid), false, 'del_ver cannot read other workspace unit');
-- Cannot manage any unit
SELECT is(public.can_manage_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), false, 'del_ver cannot manage unit in grupo (permission is ver only)');

-- RLS query checks: can read grupo_a
SELECT results_eq(
  $$ SELECT count(*)::int FROM public.grupos WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $$,
  $$ VALUES (1::int) $$,
  'del_ver can see assigned grupo in grupos table'
);

-- Owner-only tables must remain completely invisible
SELECT is_empty($$ SELECT id FROM public.pagos $$, 'del_ver cannot see pagos');
SELECT is_empty($$ SELECT id FROM public.gestor_afip_config $$, 'del_ver cannot see afip config');
SELECT is_empty($$ SELECT id FROM public.log_acciones $$, 'del_ver cannot see log_acciones');

-- Direct mutations by del_ver are strictly denied
SELECT throws_ok(
  $$ INSERT INTO public.unidades (gestor_id, grupo_id, categoria, titulo_es) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'departamento', 'Ver Nueva') $$,
  NULL,
  NULL,
  'del_ver cannot insert into unidades (permission ver is read-only)'
);

SELECT throws_ok(
  $$ UPDATE public.unidades SET titulo_es = 'Tampered' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid $$,
  NULL,
  NULL,
  'del_ver cannot update unidades (permission ver is read-only)'
);

SELECT throws_ok(
  $$ INSERT INTO public.gestor_afip_config (gestor_id, cuit, razon_social, condicion_iva, punto_venta, domicilio_fiscal) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, '20999999999', 'Fake', 'monotributo', 2, 'Direccion 123') $$,
  NULL,
  NULL,
  'del_ver cannot insert into gestor_afip_config'
);

SELECT throws_ok(
  $$ DELETE FROM storage.objects WHERE bucket_id = 'unidades' AND name = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/foto.jpg' $$,
  NULL,
  NULL,
  'del_ver cannot delete files from storage'
);

-- ------------------------------------------------------------------------------
-- 9. Actor: del_ges (Permission: gestionar, Scope: unidades -> unit_isolated) (11 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('44444444-4444-4444-4444-444444444444'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Can manage unit_isolated
SELECT is(public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), true, 'del_ges can manage assigned unit_isolated');
-- Cannot manage unit_in_group
SELECT is(public.can_manage_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), false, 'del_ges cannot manage unassigned unit_in_group');
-- Cannot manage other workspace unit
SELECT is(public.can_manage_unidad('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'::uuid), false, 'del_ges cannot manage unit of Gestor B');

-- Can manage alquiler for unit_isolated
SELECT is(public.can_manage_alquiler('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2'::uuid), true, 'del_ges can manage alquiler of assigned unit');
-- Cannot manage alquiler for unit_in_group
SELECT is(public.can_manage_alquiler('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid), false, 'del_ges cannot manage alquiler of unassigned unit');

-- Cannot read owner-only tables
SELECT is_empty($$ SELECT id FROM public.pagos $$, 'del_ges cannot see pagos');
SELECT is_empty($$ SELECT id FROM public.gestor_afip_config $$, 'del_ges cannot see afip config');
SELECT is_empty($$ SELECT id FROM public.log_acciones $$, 'del_ges cannot see log_acciones');

-- Direct sensitive writes by del_ges are blocked
SELECT throws_ok(
  $$ INSERT INTO public.pagos (gestor_id, metodo, monto, cupo_adquirido) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'mercadopago', 50000, 5) $$,
  NULL,
  NULL,
  'del_ges cannot insert into pagos'
);

SELECT throws_ok(
  $$ INSERT INTO public.unidades (gestor_id, categoria, titulo_es) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'departamento', 'Unidades Scope Nueva') $$,
  NULL,
  NULL,
  'del_ges with scope unidades cannot create new units'
);

SELECT throws_ok(
  $$ INSERT INTO public.grupos (gestor_id, nombre) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'Nuevo Grupo Hack') $$,
  NULL,
  NULL,
  'del_ges with scope unidades cannot create grupos'
);

-- ------------------------------------------------------------------------------
-- 10. Actor: del_unconf (Accepted invitation but unconfigured) (8 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('55555555-5555-5555-5555-555555555555'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Unconfigured cannot read or manage any unit
SELECT is(public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), false, 'del_unconf cannot read unit');
SELECT is(public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), false, 'del_unconf cannot manage unit');
SELECT is(public.can_read_grupo('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid), false, 'del_unconf cannot read grupo');
SELECT is_empty($$ SELECT id FROM public.grupos $$, 'del_unconf sees 0 grupos');
SELECT is_empty($$ SELECT id FROM public.alquileres $$, 'del_unconf sees 0 alquileres');
SELECT is_empty($$ SELECT id FROM public.inquilinos $$, 'del_unconf sees 0 inquilinos');
SELECT is_empty($$ SELECT id FROM public.pagos $$, 'del_unconf sees 0 pagos');

SELECT throws_ok(
  $$ INSERT INTO public.unidades (gestor_id, categoria, titulo_es) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'departamento', 'Unconf Hack') $$,
  NULL,
  NULL,
  'del_unconf cannot insert into unidades'
);

-- ------------------------------------------------------------------------------
-- 11. Actor: del_revoked (Revoked delegacion) (5 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('66666666-6666-6666-6666-666666666666'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Revoked cannot read or manage Gestor A workspace
SELECT is(public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), false, 'del_revoked cannot read Gestor A unit');
SELECT is(public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), false, 'del_revoked cannot manage Gestor A unit');
SELECT is_empty($$ SELECT id FROM public.grupos $$, 'del_revoked sees 0 grupos of Gestor A');
SELECT is_empty($$ SELECT id FROM public.alquileres $$, 'del_revoked sees 0 alquileres of Gestor A');
SELECT is_empty($$ SELECT id FROM public.inquilinos $$, 'del_revoked sees 0 inquilinos of Gestor A');

-- ------------------------------------------------------------------------------
-- 12. Actor: gestor_b (Workspace isolation & Concealment) (6 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('22222222-2222-2222-2222-222222222222'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Gestor B cannot read or manage Gestor A entities
SELECT is(public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), false, 'Gestor B cannot read Gestor A unit');
SELECT is(public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), false, 'Gestor B cannot manage Gestor A unit');
SELECT is(public.can_manage_alquiler('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid), false, 'Gestor B cannot manage Gestor A alquiler');
SELECT is_empty(
  $$ SELECT id FROM public.grupos WHERE gestor_id = '11111111-1111-1111-1111-111111111111'::uuid $$,
  'Gestor B cannot see Gestor A grupos'
);
SELECT is_empty(
  $$ SELECT id FROM public.pagos WHERE gestor_id = '11111111-1111-1111-1111-111111111111'::uuid $$,
  'Gestor B cannot see Gestor A pagos'
);
SELECT throws_ok(
  $$ UPDATE public.unidades SET titulo_es = 'Cross-Tenant Tamper' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid $$,
  NULL,
  NULL,
  'Gestor B cannot update Gestor A unit (RLS denied)'
);

-- ------------------------------------------------------------------------------
-- 13. Actor: public_user (Authenticated public account) (5 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('77777777-7777-7777-7777-777777777777'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT is(public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), false, 'public_user cannot operational read Gestor A unit');
SELECT is(public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), false, 'public_user cannot manage Gestor A unit');
SELECT is_empty($$ SELECT id FROM public.grupos WHERE gestor_id = '11111111-1111-1111-1111-111111111111'::uuid $$, 'public_user cannot see Gestor A grupos');
SELECT is_empty($$ SELECT id FROM public.alquileres $$, 'public_user cannot see private alquileres');
SELECT is_empty($$ SELECT id FROM public.pagos $$, 'public_user cannot see Gestor A pagos');

-- ------------------------------------------------------------------------------
-- 14. Actor: gestor_a (Full Workspace Owner Access) (6 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT is(public.is_gestor_owner('11111111-1111-1111-1111-111111111111'::uuid), true, 'Gestor A is verified owner of workspace A');
SELECT is(public.can_read_unidad('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid), true, 'Gestor A can read own unit');
SELECT is(public.can_manage_unidad('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid), true, 'Gestor A can manage own unit');
SELECT is(public.can_manage_alquiler('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'::uuid), true, 'Gestor A can manage own alquiler');
SELECT isnt_empty($$ SELECT id FROM public.pagos $$, 'Gestor A can view own pagos');
SELECT isnt_empty($$ SELECT gestor_id FROM public.gestor_afip_config $$, 'Gestor A can view own afip config');

-- ------------------------------------------------------------------------------
-- 15. Invariant Checks: Schema, Domain Constraints & RPC Boundary (10 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Gestor cannot invite self via RPC
SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation('11111111-1111-1111-1111-111111111111'::uuid) $$,
  NULL,
  NULL,
  'Gestor cannot invite self via RPC'
);

-- Unverified target account rejected via RPC
SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation('88888888-8888-8888-8888-888888888888'::uuid) $$,
  NULL,
  NULL,
  'Invitation for unverified target account is rejected'
);

-- Crafted request with mismatched email rejected via RPC
SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation(
       '77777777-7777-7777-7777-777777777777'::uuid,
       'wrong_crafted@test.com'
     ) $$,
  NULL,
  NULL,
  'Crafted request with mismatched email is rejected'
);

-- Cross-workspace conflict: target holding active delegation in another workspace rejected
SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation('33333333-3333-3333-3333-333333333333'::uuid) $$,
  NULL,
  NULL,
  'Target account holding active delegation in another workspace cannot be invited'
);

-- Authenticated non-owner / public user caller denied
SET LOCAL ROLE postgres;
SELECT set_test_claims('77777777-7777-7777-7777-777777777777'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation('88888888-8888-8888-8888-888888888888'::uuid) $$,
  NULL,
  NULL,
  'Authenticated non-owner public user cannot invoke create_delegado_invitation'
);

-- Configuration shape checks: direct mutations denied by RLS, so check constraints are verified after RESET ROLE
SET LOCAL ROLE postgres;

-- 105: Grupo scope requires non-null grupo_id
SELECT throws_ok(
  $$ UPDATE public.delegaciones
     SET grupo_id = NULL
     WHERE id = '40404040-4040-4040-4040-404040404040'::uuid $$,
  '23514',
  NULL,
  'Grupo scope must have non-null grupo_id'
);

-- 106: Accepted but unconfigured must have null scope/permiso
SELECT throws_ok(
  $$ UPDATE public.delegaciones
     SET permiso = 'ver', alcance_tipo = 'cuenta'
     WHERE id = '60606060-6060-6060-6060-606060606060'::uuid $$,
  '23514',
  NULL,
  'Aceptada sin configurar cannot have permission or scope'
);

-- Restore claims and authenticated role before client-boundary checks
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- 107: Immutability of users.rol: actor mutates own row so trigger runs and is rejected
SELECT throws_ok(
  $$ UPDATE public.users SET rol = 'admin' WHERE id = '11111111-1111-1111-1111-111111111111'::uuid $$,
  NULL,
  NULL,
  'Direct unauthorized mutation of users.rol without bypass is rejected'
);

-- Verify protected value remains unchanged from privileged role
SET LOCAL ROLE postgres;
DO $$
BEGIN
  IF (SELECT rol FROM public.users WHERE id = '11111111-1111-1111-1111-111111111111'::uuid) <> 'gestor' THEN
    RAISE EXCEPTION 'users.rol was modified';
  END IF;
END $$;
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- 108: Immutability of log_acciones: cannot insert fake records directly
SELECT throws_ok(
  $$ INSERT INTO public.log_acciones (gestor_id, actor_id, actor_rol, accion, recurso_tipo)
     VALUES ('11111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'gestor', 'fake', 'fake') $$,
  NULL,
  NULL,
  'Direct client insert into log_acciones is rejected'
);

-- 109: Immutability of log_acciones: denied RLS DELETE affects zero rows
SELECT results_eq(
  $$ WITH del AS (DELETE FROM public.log_acciones RETURNING *) SELECT count(*)::int FROM del $$,
  $$ VALUES (0::int) $$,
  'log_acciones entries cannot be deleted (zero rows affected under RLS)'
);

-- Prove audit rows still exist after RESET ROLE
SET LOCAL ROLE postgres;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.log_acciones) THEN
    RAISE EXCEPTION 'Audit log rows must still exist after denied DELETE';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 16. Transactional RPCs, Outbox Intent & Audit Append (12 assertions)
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

-- Gestor A creates delegation invitation for verified target (public_user) via transactional RPC
SELECT lives_ok(
  $$ SELECT public.create_delegado_invitation('77777777-7777-7777-7777-777777777777'::uuid) $$,
  'Gestor A can create delegation invitation for verified target via atomic RPC'
);

-- Verify invitation created in estado pendiente
SELECT results_eq(
  $$ SELECT estado FROM public.invitaciones_delegados
     WHERE gestor_id = '11111111-1111-1111-1111-111111111111'::uuid
       AND delegado_id = '77777777-7777-7777-7777-777777777777'::uuid $$,
  $$ VALUES ('pendiente'::text) $$,
  'Invitation persisted in estado pendiente'
);

-- Verify durable in-app notification created (privileged verification)
SET LOCAL ROLE postgres;
SELECT isnt_empty(
  $$ SELECT id FROM public.notificaciones
     WHERE usuario_id = '77777777-7777-7777-7777-777777777777'::uuid
       AND tipo = 'invitacion_delegado' $$,
  'Durable in-app notification created in notificaciones'
);

-- Verify durable email outbox intent created (privileged verification)
SELECT isnt_empty(
  $$ SELECT id FROM public.email_delivery_outbox
     WHERE recipient_user_id = '77777777-7777-7777-7777-777777777777'::uuid
       AND status = 'pending' $$,
  'Durable email delivery intent created in email_delivery_outbox'
);

-- Verify atomic audit log row created for crear_invitacion
SELECT isnt_empty(
  $$ SELECT id FROM public.log_acciones
     WHERE gestor_id = '11111111-1111-1111-1111-111111111111'::uuid
       AND accion = 'crear_invitacion'
       AND actor_id = '11111111-1111-1111-1111-111111111111'::uuid $$,
  'Atomic audit log created for create_delegado_invitation RPC'
);

-- Replay check: second attempt to invite public_user rolls back with duplicate exception
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public.create_delegado_invitation('77777777-7777-7777-7777-777777777777'::uuid) $$,
  NULL,
  NULL,
  'Replay of create_delegado_invitation for pending user rolls back with exception'
);

-- Gestor A configures unconfigured delegation
SELECT lives_ok(
  $$ SELECT public.configure_delegacion(
       '60606060-6060-6060-6060-606060606060'::uuid,
       'gestionar',
       'cuenta',
       NULL,
       NULL
     ) $$,
  'Gestor A can configure delegacion transactional RPC'
);

-- Verify delegation transitioned to activa with correct values
SELECT results_eq(
  $$ SELECT estado, permiso, alcance_tipo FROM public.delegaciones WHERE id = '60606060-6060-6060-6060-606060606060'::uuid $$,
  $$ VALUES ('activa'::text, 'gestionar'::text, 'cuenta'::text) $$,
  'Delegacion successfully configured and activated'
);

-- Verify audit row generated in log_acciones (privileged check)
SET LOCAL ROLE postgres;
SELECT isnt_empty(
  $$ SELECT id FROM public.log_acciones WHERE accion = 'configurar_delegacion' AND recurso_id = '60606060-6060-6060-6060-606060606060'::uuid $$,
  'Atomic audit log created for configure_delegacion RPC'
);

-- Gestor A revokes delegation
SELECT set_test_claims('11111111-1111-1111-1111-111111111111'::uuid, 'authenticated');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$ SELECT public.revoke_delegacion('60606060-6060-6060-6060-606060606060'::uuid) $$,
  'Gestor A can revoke delegacion transactional RPC'
);

-- Verify delegacion is revocada and user reverted to gestor with workspace_id NULL
SELECT results_eq(
  $$ SELECT estado FROM public.delegaciones WHERE id = '60606060-6060-6060-6060-606060606060'::uuid $$,
  $$ VALUES ('revocada'::text) $$,
  'Delegacion state transitioned to revocada'
);

-- Privileged verification: revoked user reverted to gestor with workspace_id NULL
SET LOCAL ROLE postgres;
SELECT results_eq(
  $$ SELECT rol, workspace_id IS NULL FROM public.users WHERE id = '55555555-5555-5555-5555-555555555555'::uuid $$,
  $$ VALUES ('gestor'::text, true) $$,
  'Revoked user reverted to standalone gestor'
);

-- ------------------------------------------------------------------------------
-- 17. Finish Test Suite
-- ------------------------------------------------------------------------------
SET LOCAL ROLE postgres;
SELECT * FROM finish();
ROLLBACK;
