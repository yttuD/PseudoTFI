-- Migración de Analytics y Métricas para Marketplace
-- 20260913050000_marketplace_analytics.sql

-- 1. Tabla de Vistas de Unidades (Anonimizada bajo Ley 25.326 de Protección de Datos Personales)
CREATE TABLE IF NOT EXISTS public.vistas_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  ip_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vistas_unidades_unidad_id ON public.vistas_unidades(unidad_id);
CREATE INDEX IF NOT EXISTS idx_vistas_unidades_created_at ON public.vistas_unidades(created_at);
CREATE INDEX IF NOT EXISTS idx_vistas_unidades_lookup ON public.vistas_unidades(unidad_id, created_at);

ALTER TABLE public.vistas_unidades ENABLE ROW LEVEL SECURITY;

-- Permitir registrar vistas públicamente
CREATE POLICY "Permitir inserción de vistas" ON public.vistas_unidades
  FOR INSERT WITH CHECK (true);

-- Permitir lectura de vistas a usuarios autenticados
CREATE POLICY "Permitir lectura de vistas a autenticados" ON public.vistas_unidades
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 2. Tabla de Contactos WhatsApp
CREATE TABLE IF NOT EXISTS public.contactos_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contactos_whatsapp_unidad_id ON public.contactos_whatsapp(unidad_id);
CREATE INDEX IF NOT EXISTS idx_contactos_whatsapp_created_at ON public.contactos_whatsapp(created_at);
CREATE INDEX IF NOT EXISTS idx_contactos_whatsapp_lookup ON public.contactos_whatsapp(unidad_id, created_at);

ALTER TABLE public.contactos_whatsapp ENABLE ROW LEVEL SECURITY;

-- Permitir registrar contactos WhatsApp públicamente
CREATE POLICY "Permitir inserción de contactos" ON public.contactos_whatsapp
  FOR INSERT WITH CHECK (true);

-- Permitir lectura de contactos a usuarios autenticados
CREATE POLICY "Permitir lectura de contactos a autenticados" ON public.contactos_whatsapp
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 3. Contadores en unidades si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'unidades' AND column_name = 'vistas_count'
  ) THEN
    ALTER TABLE public.unidades ADD COLUMN vistas_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'unidades' AND column_name = 'contactos_count'
  ) THEN
    ALTER TABLE public.unidades ADD COLUMN contactos_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
