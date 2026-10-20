-- Generated filename by pinned Supabase CLI 2.121.0, run #39507661384.
-- Reviewed N01–N08 hardening: local Auth/RLS 51/51 PASS.
-- Versioned migration only; must NOT be pushed to hosted Supabase until
-- Codex + the project owner have approved a release/rollback plan.
BEGIN;

-- Trigger functions cannot be called as ordinary RPCs. Their existing
-- triggers remain installed; revoking public EXECUTE eliminates unwanted
-- Data API exposure without removing the trigger definitions.
REVOKE EXECUTE ON FUNCTION public.audit_operational_mutation()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_reportes_threshold()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_unidad_active_for_rental()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

-- This SECURITY DEFINER helper uses auth.uid() and public.users explicitly.
-- Keep it available for authenticated RLS predicates, not anonymous RPC.
REVOKE EXECUTE ON FUNCTION public.get_workspace_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_id() TO authenticated, service_role;

-- Set immutable function lookup paths; do not alter function bodies, owners,
-- privileges of other RPCs or the existing trigger bindings.
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog;
ALTER FUNCTION public.get_workspace_id() SET search_path = pg_catalog;
-- check_reportes_threshold currently has an unqualified UPDATE unidades
-- and a unidad_estado cast, so public must remain in its fixed path.
-- Hosted metadata confirmed anon/auth cannot CREATE objects in public.
ALTER FUNCTION public.check_reportes_threshold()
  SET search_path = pg_catalog, public;

COMMIT;
