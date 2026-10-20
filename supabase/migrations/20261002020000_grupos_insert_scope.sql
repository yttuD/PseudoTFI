-- Explicitly qualify the outer group row. An unqualified gestor_id inside
-- the delegation subquery resolved to d.gestor_id, making that comparison tautological.
DROP POLICY IF EXISTS "Grupos insert policy" ON public.grupos;

CREATE POLICY "Grupos insert policy" ON public.grupos FOR INSERT
TO authenticated
WITH CHECK (
  public.is_gestor_owner(grupos.gestor_id)
  OR EXISTS (
    SELECT 1
    FROM public.delegaciones d
    WHERE d.delegado_id = auth.uid()
      AND d.gestor_id = grupos.gestor_id
      AND d.estado = 'activa'
      AND d.permiso = 'gestionar'
      AND d.alcance_tipo = 'cuenta'
  )
);
