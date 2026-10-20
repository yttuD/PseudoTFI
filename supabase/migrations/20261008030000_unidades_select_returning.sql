-- INSERT ... RETURNING also evaluates the SELECT policy. The read helper
-- (public.can_read_unidad) searches for the new row by id, but that row
-- is not visible to that lookup during the insert transaction yet.
-- Check owner, account-scope, and group-scope delegated access directly
-- on the proposed row while retaining the helper for unit-scoped reads
-- and published units.
DROP POLICY IF EXISTS "Unidades authenticated select policy" ON public.unidades;

CREATE POLICY "Unidades authenticated select policy" ON public.unidades FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL AND (
    public.is_gestor_owner(unidades.gestor_id)
    OR EXISTS (
      SELECT 1
      FROM public.delegaciones d
      WHERE d.delegado_id = auth.uid()
        AND d.gestor_id = unidades.gestor_id
        AND d.estado = 'activa'
        AND d.alcance_tipo = 'cuenta'
    )
    OR (
      unidades.grupo_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.delegaciones d
        WHERE d.delegado_id = auth.uid()
          AND d.gestor_id = unidades.gestor_id
          AND d.estado = 'activa'
          AND d.alcance_tipo = 'grupo'
          AND d.grupo_id = unidades.grupo_id
      )
    )
    OR public.can_read_unidad(id)
  ))
  OR (estado = 'publicada'::unidad_estado AND deleted_at IS NULL)
);
