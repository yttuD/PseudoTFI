-- A published row is public, but its owner, exact location and contact columns are not.
-- RLS is row-level only. The API uses its server-side service role and projects an
-- explicit public DTO; direct anonymous Supabase reads get the minimum columns
-- needed by existing published-unit/price RLS policies.
REVOKE SELECT ON TABLE public.unidades FROM PUBLIC, anon;
GRANT SELECT (id, estado, deleted_at) ON TABLE public.unidades TO anon;

-- Operational users retain their existing authenticated row-scoped policies.
-- Never grant the service-role key to browsers; do not add private columns to anon.
