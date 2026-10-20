-- Closed beta: direct anonymous Supabase reads must not bypass the API projection.
BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL search_path = public, extensions;
SELECT plan(7);

SELECT ok(has_column_privilege('anon', 'public.unidades', 'id', 'SELECT'), 'Anonymous RLS can still inspect unit IDs');
SELECT ok(has_column_privilege('anon', 'public.unidades', 'estado', 'SELECT'), 'Anonymous published-unit policy can inspect state');
SELECT ok(has_column_privilege('anon', 'public.unidades', 'deleted_at', 'SELECT'), 'Anonymous published-unit policy can inspect deletion state');
SELECT ok(NOT has_column_privilege('anon', 'public.unidades', 'whatsapp', 'SELECT'), 'Anonymous users cannot read contact number');
SELECT ok(NOT has_column_privilege('anon', 'public.unidades', 'ubicacion_exacta', 'SELECT'), 'Anonymous users cannot read exact location');
SELECT ok(NOT has_column_privilege('anon', 'public.unidades', 'gestor_id', 'SELECT'), 'Anonymous users cannot read owner identity');
SELECT ok(has_column_privilege('authenticated', 'public.unidades', 'id', 'SELECT'), 'Authenticated RLS remains usable');

SELECT * FROM finish();
ROLLBACK;
