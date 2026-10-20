-- Rendo web/API release inventory. READ-ONLY; no customer identifiers or prices.
-- Execute in Supabase SQL editor or read-only psql session for the intended project.
-- Every output is an aggregate. Identical tariffs are not automatically errors.
WITH tariff_duplicate_groups AS (
  SELECT COUNT(*)::int AS n
  FROM public.modalidades_precio
  WHERE deleted_at IS NULL
  GROUP BY unidad_id, unidad_tiempo, cantidad_tiempo, precio, precio_usd, precio_brl
  HAVING COUNT(*) > 1
),
published AS (
  SELECT COUNT(*)::int AS n,
    COUNT(*) FILTER (WHERE NULLIF(BTRIM(titulo_en), '') IS NULL)::int AS title_en_missing,
    COUNT(*) FILTER (WHERE NULLIF(BTRIM(titulo_pt), '') IS NULL)::int AS title_pt_missing,
    COUNT(*) FILTER (WHERE NULLIF(BTRIM(descripcion_en), '') IS NULL)::int AS description_en_missing,
    COUNT(*) FILTER (WHERE NULLIF(BTRIM(descripcion_pt), '') IS NULL)::int AS description_pt_missing
  FROM public.unidades
  WHERE estado = 'publicada' AND deleted_at IS NULL
),
unprotected_public_tables AS (
  SELECT COUNT(*)::int AS n
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
),
anonymous_definers AS (
  SELECT COUNT(*)::int AS n
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
)
SELECT
  (SELECT n FROM published) AS published_unit_count,
  (SELECT title_en_missing FROM published) AS title_en_missing,
  (SELECT title_pt_missing FROM published) AS title_pt_missing,
  (SELECT description_en_missing FROM published) AS description_en_missing,
  (SELECT description_pt_missing FROM published) AS description_pt_missing,
  (SELECT COUNT(*)::int FROM tariff_duplicate_groups) AS possible_duplicate_tariff_groups,
  COALESCE((SELECT SUM(n - 1)::int FROM tariff_duplicate_groups), 0) AS excess_tariff_rows_if_deduplicated,
  (SELECT n FROM unprotected_public_tables) AS public_tables_without_rls,
  (SELECT n FROM anonymous_definers) AS anonymous_security_definer_rpcs;
