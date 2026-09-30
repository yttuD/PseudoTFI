BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(8);

SELECT lives_ok($$
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES ('77777777-7777-7777-7777-777777777771', 'beta-seeker@example.test', now(), '{"role":"buscador","full_name":"Beta Seeker"}'::jsonb)
$$, 'Public registration is accepted');
SELECT is((SELECT rol FROM public.users WHERE id = '77777777-7777-7777-7777-777777777771'), 'buscador', 'Public registration receives canonical buscador role');
SELECT is((SELECT cupo_maximo FROM public.users WHERE id = '77777777-7777-7777-7777-777777777771'), 0, 'Public user has no publishing quota');

SELECT lives_ok($$
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES ('77777777-7777-7777-7777-777777777772', 'beta-manager@example.test', now(), '{"role":"gestor","full_name":"Beta Manager"}'::jsonb)
$$, 'Gestor registration is accepted');
SELECT is((SELECT rol FROM public.users WHERE id = '77777777-7777-7777-7777-777777777772'), 'gestor', 'Explicit independent manager signup receives gestor role');

SELECT lives_ok($$
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  VALUES ('77777777-7777-7777-7777-777777777773', 'beta-delegate@example.test', now(), '{"role":"delegado","full_name":"Beta Delegate"}'::jsonb)
$$, 'A delegate-labelled registration is accepted without granting delegation');
SELECT is((SELECT rol FROM public.users WHERE id = '77777777-7777-7777-7777-777777777773'), 'buscador', 'Signup metadata cannot self-assign delegado');
SELECT is((SELECT count(*)::int FROM public.users WHERE rol = 'delegado' AND id = '77777777-7777-7777-7777-777777777773'), 0, 'No delegation exists for the uninvited account');

SELECT * FROM finish();
ROLLBACK;
