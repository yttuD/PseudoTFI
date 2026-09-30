-- Migración: Adición de seña, depósito en garantía y estado de cobro en alquileres
ALTER TABLE public.alquileres
  ADD COLUMN IF NOT EXISTS monto_sena NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_deposito NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS monto_cobrado NUMERIC(12,2) DEFAULT 0;

-- Constraint de estados válidos de cobro
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_estado_pago'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_estado_pago
      CHECK (estado_pago IN ('cobrado_total', 'seña_cobrada', 'pendiente'));
  END IF;
END $$;
