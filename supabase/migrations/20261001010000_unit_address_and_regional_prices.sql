-- Keep the exact address private; anonymous Supabase access remains restricted
-- to the column grants in 20260929213000_public_unit_column_privacy.sql.
ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS direccion_texto TEXT;

-- A NULL regional price means automatic conversion from the ARS base price.
-- A positive value is a deliberate manual price for that audience.
ALTER TABLE public.modalidades_precio
  ADD COLUMN IF NOT EXISTS precio_usd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS precio_brl NUMERIC(12, 2);

ALTER TABLE public.modalidades_precio
  ADD CONSTRAINT modalidades_precio_usd_positivo CHECK (precio_usd IS NULL OR precio_usd > 0),
  ADD CONSTRAINT modalidades_precio_brl_positivo CHECK (precio_brl IS NULL OR precio_brl > 0);
