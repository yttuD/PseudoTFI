-- Migración: Configuración Fiscal del Gestor (Emisor ARCA / AFIP)

CREATE TABLE IF NOT EXISTS public.gestor_afip_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cuit TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  condicion_iva TEXT NOT NULL CHECK (condicion_iva IN ('monotributo', 'responsable_inscripto', 'exento')),
  punto_venta INTEGER NOT NULL DEFAULT 1 CHECK (punto_venta > 0),
  iibb TEXT,
  inicio_actividades DATE,
  domicilio_fiscal TEXT NOT NULL,
  entorno TEXT NOT NULL DEFAULT 'homologacion' CHECK (entorno IN ('homologacion', 'produccion')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gestor_afip_config_gestor_id_key UNIQUE (gestor_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gestor_afip_config_gestor_id ON public.gestor_afip_config(gestor_id);

-- Habilitar RLS
ALTER TABLE public.gestor_afip_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Gestores config fiscal workspace" ON public.gestor_afip_config;
CREATE POLICY "Gestores config fiscal workspace"
ON public.gestor_afip_config
FOR ALL
USING (gestor_id = get_workspace_id())
WITH CHECK (gestor_id = get_workspace_id());
