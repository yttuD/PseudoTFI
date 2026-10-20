-- Migración: CRM Inquilinos, Garantes, Consentimiento Ley 25.326, Contratos y Facturación AFIP (Fase 4 / M13)

-- 1. Extender tabla inquilinos
ALTER TABLE public.inquilinos
ADD COLUMN IF NOT EXISTS garantes JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS consentimiento_ley25326 BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS consentimiento_fecha TIMESTAMPTZ;

-- 2. Extender tabla alquileres
ALTER TABLE public.alquileres
ADD COLUMN IF NOT EXISTS contrato_url TEXT;

-- 3. Crear tabla afip_comprobantes
CREATE TABLE IF NOT EXISTS public.afip_comprobantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alquiler_id UUID REFERENCES public.alquileres(id) ON DELETE SET NULL,
  tipo_comprobante VARCHAR(30) NOT NULL, -- 'Factura C', 'Recibo de Alquiler C', 'Factura B'
  tipo_comprobante_codigo INT NOT NULL DEFAULT 11, -- 11: Factura C, 15: Recibo C, 6: Factura B
  punto_venta INT NOT NULL DEFAULT 1,
  numero_comprobante INT NOT NULL,
  concepto INT NOT NULL DEFAULT 2, -- 2: Servicios
  cuit_emisor VARCHAR(20) NOT NULL,
  receptor_nombre VARCHAR(150) NOT NULL,
  receptor_doc_tipo VARCHAR(10) NOT NULL DEFAULT 'DNI', -- 'DNI', 'CUIT'
  receptor_doc_nro VARCHAR(20) NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  importe_total NUMERIC(12, 2) NOT NULL,
  cae VARCHAR(14) NOT NULL,
  cae_vencimiento DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'aprobado',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para afip_comprobantes
CREATE INDEX IF NOT EXISTS idx_afip_comprobantes_gestor_id ON public.afip_comprobantes(gestor_id);
CREATE INDEX IF NOT EXISTS idx_afip_comprobantes_alquiler_id ON public.afip_comprobantes(alquiler_id);
CREATE INDEX IF NOT EXISTS idx_afip_comprobantes_fecha_emision ON public.afip_comprobantes(fecha_emision DESC);

-- Habilitar RLS en afip_comprobantes
ALTER TABLE public.afip_comprobantes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para afip_comprobantes
DROP POLICY IF EXISTS "Gestores acceden a sus comprobantes AFIP" ON public.afip_comprobantes;
CREATE POLICY "Gestores acceden a sus comprobantes AFIP"
ON public.afip_comprobantes
FOR ALL
USING (gestor_id = get_workspace_id())
WITH CHECK (gestor_id = get_workspace_id());

-- 4. Crear bucket de storage para contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS de storage para bucket contratos
DROP POLICY IF EXISTS "Contratos son accesibles" ON storage.objects;
CREATE POLICY "Contratos son accesibles"
ON storage.objects FOR SELECT
USING (bucket_id = 'contratos');

DROP POLICY IF EXISTS "Gestor puede subir contratos" ON storage.objects;
CREATE POLICY "Gestor puede subir contratos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Gestor puede eliminar contratos" ON storage.objects;
CREATE POLICY "Gestor puede eliminar contratos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contratos'
  AND auth.uid() IS NOT NULL
);
