BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(5);
CREATE TEMP TABLE beta_profile_tap_result (line TEXT) ON COMMIT DROP;
GRANT SELECT, INSERT ON beta_profile_tap_result TO authenticated;

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('f9000000-0000-0000-0000-000000000001', 'beta-profile-seeker@example.test', now(), '{"role":"buscador","full_name":"Buscador Inicial"}'::jsonb),
  ('f9000000-0000-0000-0000-000000000002', 'beta-profile-manager@example.test', now(), '{"role":"gestor","full_name":"Gestor Inicial"}'::jsonb);

SELECT set_config('request.jwt.claim.sub', 'f9000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"f9000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

INSERT INTO beta_profile_tap_result SELECT lives_ok($$
  UPDATE public.users SET full_name = 'Buscador Editado', phone = '111222'
  WHERE id = 'f9000000-0000-0000-0000-000000000001'
$$, 'Buscador puede editar nombre y telefono propios');

INSERT INTO beta_profile_tap_result SELECT is(
  (SELECT full_name FROM public.users WHERE id = 'f9000000-0000-0000-0000-000000000001'),
  'Buscador Editado', 'El cambio del Buscador persiste en la transaccion'
);

WITH attempted AS (
  UPDATE public.users SET full_name = 'Edicion Ajena'
  WHERE id = 'f9000000-0000-0000-0000-000000000002' RETURNING id
)
INSERT INTO beta_profile_tap_result SELECT is(
  (SELECT count(*)::integer FROM attempted), 0,
  'Buscador no puede editar el perfil del Gestor'
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'f9000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"f9000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

INSERT INTO beta_profile_tap_result SELECT lives_ok($$
  UPDATE public.users SET full_name = 'Gestor Editado', phone = '333444'
  WHERE id = 'f9000000-0000-0000-0000-000000000002'
$$, 'Gestor puede editar nombre y telefono propios');

INSERT INTO beta_profile_tap_result SELECT throws_ok($$
  UPDATE public.users SET cupo_maximo = 999
  WHERE id = 'f9000000-0000-0000-0000-000000000002'
$$, 'P0001', NULL, 'Gestor no puede alterar su cupo desde el perfil');

RESET ROLE;
SELECT * FROM finish();

DO $$
BEGIN
  IF (SELECT count(*) FROM beta_profile_tap_result) <> 5
     OR EXISTS (SELECT 1 FROM beta_profile_tap_result WHERE line LIKE 'not ok%') THEN
    RAISE EXCEPTION 'Beta profile assertions failed: %',
      (SELECT string_agg(line, ' | ' ORDER BY line) FROM beta_profile_tap_result WHERE line LIKE 'not ok%');
  END IF;
END;
$$;

SELECT count(*) AS assertions_passed FROM beta_profile_tap_result;
ROLLBACK;
