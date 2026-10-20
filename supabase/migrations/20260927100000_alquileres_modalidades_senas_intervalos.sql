-- Migration: 20260927100000_alquileres_modalidades_senas_intervalos.sql
-- Forward-only migration: explicit rental modalities, timezone-aware half-open intervals,
-- configurable Grupo default seña and explicit per-rental seña choices.
-- Concurrency exclusion constraint and interval integrity fail-fast and mandatory.

-- 1. EXTENSION BTREE_GIST (mandatory for exclusion constraints on ranges and uuids; fails fast)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. TABLA GRUPOS: Configuración opcional y reutilizable de Seña por Defecto
ALTER TABLE public.grupos
  ADD COLUMN IF NOT EXISTS sena_default_activa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sena_default_tipo TEXT DEFAULT 'porcentaje',
  ADD COLUMN IF NOT EXISTS sena_default_valor NUMERIC(12,2) DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_grupos_sena_default_tipo'
  ) THEN
    ALTER TABLE public.grupos
      ADD CONSTRAINT check_grupos_sena_default_tipo
      CHECK (sena_default_tipo IN ('porcentaje', 'monto_fijo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_grupos_sena_default_valor'
  ) THEN
    ALTER TABLE public.grupos
      ADD CONSTRAINT check_grupos_sena_default_valor
      CHECK (
        sena_default_valor >= 0 AND
        (sena_default_tipo != 'porcentaje' OR sena_default_valor <= 100) AND
        (NOT sena_default_activa OR sena_default_valor > 0)
      );
  END IF;
END $$;

-- 3. TABLA ALQUILERES: Modalidad explícita, intervalos timezone-aware y seña estructurada
ALTER TABLE public.alquileres
  ADD COLUMN IF NOT EXISTS modalidad TEXT NOT NULL DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS inicio_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fin_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sena_eleccion TEXT NOT NULL DEFAULT 'sin_sena',
  ADD COLUMN IF NOT EXISTS sena_tipo TEXT,
  ADD COLUMN IF NOT EXISTS sena_valor NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS sena_origen_grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL;

-- 4. BACKFILL: Mantener compatibilidad total con registros históricos existentes
UPDATE public.alquileres
SET 
  inicio_at = (fecha_inicio::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires',
  fin_at = ((fecha_fin + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires'
WHERE inicio_at IS NULL AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL;

UPDATE public.alquileres
SET
  sena_eleccion = CASE 
    WHEN monto_sena IS NOT NULL AND monto_sena > 0 THEN 'personalizada'
    ELSE 'sin_sena'
  END,
  sena_tipo = CASE 
    WHEN monto_sena IS NOT NULL AND monto_sena > 0 THEN 'monto_fijo'
    ELSE NULL
  END,
  sena_valor = CASE 
    WHEN monto_sena IS NOT NULL AND monto_sena > 0 THEN monto_sena
    ELSE NULL
  END,
  monto_sena = CASE
    WHEN monto_sena IS NOT NULL AND monto_sena > 0 THEN monto_sena
    ELSE 0
  END,
  sena_origen_grupo_id = NULL
WHERE sena_eleccion = 'sin_sena' OR sena_eleccion IS NULL;

-- Fail fast if any non-deleted historical rows could not be backfilled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.alquileres
    WHERE deleted_at IS NULL AND (inicio_at IS NULL OR fin_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'Existen filas historicas de alquileres sin fechas validas para backfill de inicio_at/fin_at';
  END IF;
END $$;

ALTER TABLE public.alquileres
  ALTER COLUMN inicio_at SET NOT NULL,
  ALTER COLUMN fin_at SET NOT NULL;

-- 5. CONSTRAINTS DE INTEGRIDAD DE DOMINIO EN ALQUILERES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_modalidad'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_modalidad
      CHECK (modalidad IN ('mensual', 'diaria', 'por_hora'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_sena_eleccion'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_sena_eleccion
      CHECK (sena_eleccion IN ('sin_sena', 'heredar_grupo', 'personalizada'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_sena_tipo'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_sena_tipo
      CHECK (sena_tipo IS NULL OR sena_tipo IN ('porcentaje', 'monto_fijo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_intervalo_positivo'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_intervalo_positivo
      CHECK (fin_at > inicio_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_monto_total_positivo'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_monto_total_positivo
      CHECK (monto_total > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_alquileres_sena_coherencia'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT check_alquileres_sena_coherencia
      CHECK (
        (
          sena_eleccion = 'sin_sena' AND
          (monto_sena IS NULL OR monto_sena = 0) AND
          sena_tipo IS NULL AND
          sena_valor IS NULL AND
          sena_origen_grupo_id IS NULL
        ) OR
        (
          sena_eleccion = 'heredar_grupo' AND
          sena_origen_grupo_id IS NOT NULL AND
          sena_tipo IN ('porcentaje', 'monto_fijo') AND
          sena_valor > 0 AND
          (sena_tipo != 'porcentaje' OR sena_valor <= 100) AND
          monto_sena > 0 AND
          monto_sena <= monto_total
        ) OR
        (
          sena_eleccion = 'personalizada' AND
          sena_origen_grupo_id IS NULL AND
          sena_tipo IN ('porcentaje', 'monto_fijo') AND
          sena_valor > 0 AND
          (sena_tipo != 'porcentaje' OR sena_valor <= 100) AND
          monto_sena > 0 AND
          monto_sena <= monto_total
        )
      );
  END IF;
END $$;

-- 6. ÍNDICES DE DESEMPEÑO E INTERVALOS TEMPORALES
CREATE INDEX IF NOT EXISTS idx_alquileres_unidad_intervalo
  ON public.alquileres (unidad_id, inicio_at, fin_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alquileres_sena_origen_grupo
  ON public.alquileres (sena_origen_grupo_id)
  WHERE sena_origen_grupo_id IS NOT NULL;

-- 7. EXCLUSION CONSTRAINT: Impedir solapamientos estrictos en intervalos semiabiertos [inicio_at, fin_at)
-- Mandatory concurrency guard covering non-deleted, non-cancelled rentals with half-open ranges.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exclude_alquileres_intervalo_overlap'
  ) THEN
    ALTER TABLE public.alquileres
      ADD CONSTRAINT exclude_alquileres_intervalo_overlap
      EXCLUDE USING gist (
        unidad_id WITH =,
        tstzrange(inicio_at, fin_at, '[)') WITH &&
      )
      WHERE (deleted_at IS NULL AND estado != 'cancelado');
  END IF;
END $$;
