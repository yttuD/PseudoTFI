DROP POLICY IF EXISTS "Unidades authenticated select policy" ON public.unidades;

CREATE POLICY "Unidades authenticated select policy" ON public.unidades FOR SELECT TO authenticated
USING (
  public.can_read_unidad(id)
  OR (estado = 'publicada' AND deleted_at IS NULL)
);
