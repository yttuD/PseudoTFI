-- INSERT ... RETURNING also evaluates the SELECT policy. The read helper
-- searches for the new row by id, but that row is not visible to that lookup
-- yet. Check owner/account-scope access directly on the proposed row while
-- retaining the helper for existing group/unit-scoped delegated reads.
DROP POLICY IF EXISTS "Grupos select policy" ON public.grupos;

CREATE POLICY "Grupos select policy" ON public.grupos FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    public.is_gestor_owner(grupos.gestor_id)
    OR EXISTS (
      SELECT 1
      FROM public.delegaciones d
      WHERE d.delegado_id = auth.uid()
        AND d.gestor_id = grupos.gestor_id
        AND d.estado = 'activa'
        AND d.alcance_tipo = 'cuenta'
    )
    OR public.can_read_grupo(id)
  )
);
