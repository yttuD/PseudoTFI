-- Assertions run only after hardening a loopback Supabase instance.
DO $rendo_check$
DECLARE
  signature text;
  function_name text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.audit_operational_mutation()',
    'public.check_reportes_threshold()',
    'public.check_unidad_active_for_rental()',
    'public.handle_new_user()'
  ] LOOP
    IF has_function_privilege('anon', signature, 'EXECUTE')
       OR has_function_privilege('authenticated', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Trigger function unexpectedly executable by Data API role: %', signature;
    END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.get_workspace_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous RPC get_workspace_id remains executable';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_workspace_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated RLS lost workspace helper access';
  END IF;

  FOREACH function_name IN ARRAY ARRAY[
    'get_workspace_id', 'check_reportes_threshold', 'set_updated_at'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%')
    ) THEN
      RAISE EXCEPTION 'Function still has a mutable search_path: %', function_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE NOT t.tgisinternal AND p.proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'Auth signup trigger missing after hardening';
  END IF;
END;
$rendo_check$;
