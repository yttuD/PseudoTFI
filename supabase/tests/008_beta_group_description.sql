BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(7);
CREATE TEMP TABLE beta_group_tap_result (line TEXT) ON COMMIT DROP;
GRANT SELECT, INSERT ON beta_group_tap_result TO authenticated;

INSERT INTO beta_group_tap_result
SELECT has_column('public', 'grupos', 'descripcion', 'La descripcion opcional del grupo existe');

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('f8000000-0000-0000-0000-000000000001', 'beta-grupo-a@example.test', now(), '{"role":"gestor","full_name":"Gestor A"}'::jsonb),
  ('f8000000-0000-0000-0000-000000000002', 'beta-grupo-b@example.test', now(), '{"role":"gestor","full_name":"Gestor B"}'::jsonb),
  ('f8000000-0000-0000-0000-000000000003', 'beta-delegado-a@example.test', now(), '{"role":"gestor","full_name":"Delegado A"}'::jsonb);

SELECT set_config('request.jwt.claim.sub', 'f8000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"f8000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

INSERT INTO beta_group_tap_result SELECT lives_ok($$
  INSERT INTO public.grupos (gestor_id, nombre)
  VALUES ('f8000000-0000-0000-0000-000000000001', 'Sin descripción ni seña')
  RETURNING id
$$, 'El gestor puede crear un grupo sin descripcion ni sena');

INSERT INTO beta_group_tap_result SELECT lives_ok($$
  INSERT INTO public.grupos (gestor_id, nombre, descripcion, sena_default_activa, sena_default_tipo, sena_default_valor)
  VALUES ('f8000000-0000-0000-0000-000000000001', 'Con seña', 'Complejo de prueba', true, 'porcentaje', 25)
  RETURNING id
$$, 'El gestor puede crear un grupo con descripcion y sena');

INSERT INTO beta_group_tap_result SELECT throws_ok($$
  INSERT INTO public.grupos (gestor_id, nombre)
  VALUES ('f8000000-0000-0000-0000-000000000002', 'Grupo ajeno')
$$, '42501', NULL, 'Un gestor no puede crear grupos en otro workspace');

INSERT INTO beta_group_tap_result SELECT is(
  (SELECT count(*)::integer FROM public.grupos WHERE gestor_id = 'f8000000-0000-0000-0000-000000000001'),
  2,
  'Solo existen los dos grupos propios creados por el gestor de prueba'
);

RESET ROLE;

SELECT set_config('rendo.allow_user_mutation', 'true', true);
UPDATE public.users SET rol = 'delegado', workspace_id = 'f8000000-0000-0000-0000-000000000001'
WHERE id = 'f8000000-0000-0000-0000-000000000003';
SELECT set_config('rendo.allow_user_mutation', 'false', true);

INSERT INTO public.invitaciones_delegados (gestor_id, delegado_id, email, email_snapshot, estado)
VALUES ('f8000000-0000-0000-0000-000000000001',
        'f8000000-0000-0000-0000-000000000003',
        'beta-delegado-a@example.test', 'beta-delegado-a@example.test', 'aceptada');

INSERT INTO public.delegaciones (invitacion_id, gestor_id, delegado_id, estado, permiso, alcance_tipo)
SELECT id, 'f8000000-0000-0000-0000-000000000001',
       'f8000000-0000-0000-0000-000000000003', 'activa', 'gestionar', 'cuenta'
FROM public.invitaciones_delegados WHERE email_snapshot = 'beta-delegado-a@example.test';

SELECT set_config('request.jwt.claim.sub', 'f8000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"f8000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

INSERT INTO beta_group_tap_result SELECT lives_ok($$
  INSERT INTO public.grupos (gestor_id, nombre)
  VALUES ('f8000000-0000-0000-0000-000000000001', 'Grupo del delegado autorizado')
  RETURNING id
$$, 'Un delegado de cuenta puede crear grupos en su workspace');

INSERT INTO beta_group_tap_result SELECT throws_ok($$
  INSERT INTO public.grupos (gestor_id, nombre)
  VALUES ('f8000000-0000-0000-0000-000000000002', 'Grupo de workspace ajeno')
$$, '42501', NULL, 'Un delegado no puede crear grupos en otro workspace');

RESET ROLE;
SELECT * FROM finish();

DO $$
BEGIN
  IF (SELECT count(*) FROM beta_group_tap_result) <> 7
     OR EXISTS (SELECT 1 FROM beta_group_tap_result WHERE line LIKE 'not ok%') THEN
    RAISE EXCEPTION 'Beta group RLS assertions failed: %',
      (SELECT string_agg(line, ' | ' ORDER BY line) FROM beta_group_tap_result WHERE line LIKE 'not ok%');
  END IF;
END;
$$;

SELECT count(*) AS assertions_passed FROM beta_group_tap_result;
ROLLBACK;
