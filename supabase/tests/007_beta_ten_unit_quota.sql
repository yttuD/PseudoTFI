BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(7);

SELECT lives_ok($$
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES ('aaaaaaaa-7777-7777-7777-777777777771', 'quota-manager@example.test', now(), '{"role":"gestor","full_name":"Quota Manager"}'::jsonb)
$$, 'Independent Gestor registration succeeds');
SELECT is((SELECT cupo_maximo FROM public.users WHERE id = 'aaaaaaaa-7777-7777-7777-777777777771'), 10,
  'A new Gestor receives ten beta units');

SELECT lives_ok($$
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES ('aaaaaaaa-7777-7777-7777-777777777772', 'quota-seeker@example.test', now(), '{"role":"buscador","full_name":"Quota Seeker"}'::jsonb)
$$, 'Independent Buscador registration succeeds');
SELECT is((SELECT cupo_maximo FROM public.users WHERE id = 'aaaaaaaa-7777-7777-7777-777777777772'), 0,
  'A Buscador receives no publishing quota');

SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-7777-7777-7777-777777777772', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-7777-7777-7777-777777777772","role":"authenticated"}', true);
SELECT lives_ok($$ SELECT public.become_gestor() $$, 'Buscador can convert to Gestor');
SELECT is((SELECT cupo_maximo FROM public.users WHERE id = 'aaaaaaaa-7777-7777-7777-777777777772'), 10,
  'Converted Gestor receives ten beta units');
SELECT is((SELECT count(*)::int FROM public.users WHERE id = 'aaaaaaaa-7777-7777-7777-777777777772' AND rol = 'gestor'), 1,
  'Converted account has the canonical Gestor role');

-- The Management API may show only the last result row. Fail the command,
-- not just the TAP output, if the essential quota invariants are broken.
DO $$
BEGIN
  IF (SELECT cupo_maximo FROM public.users WHERE id = 'aaaaaaaa-7777-7777-7777-777777777771') <> 10
     OR (SELECT cupo_maximo FROM public.users WHERE id = 'aaaaaaaa-7777-7777-7777-777777777772') <> 10
     OR EXISTS (SELECT 1 FROM public.users WHERE rol = 'gestor' AND deleted_at IS NULL AND cupo_maximo < 10) THEN
    RAISE EXCEPTION 'Beta Gestor quota is not ten for new, converted and existing accounts';
  END IF;
END;
$$;

SELECT * FROM finish();
ROLLBACK;
