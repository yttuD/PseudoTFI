-- La descripción opcional ya está en el formulario y DTO, pero no existía en la tabla.
ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS descripcion TEXT;
