CREATE TYPE estado_alquiler AS ENUM (
  'activo',
  'finalizado',
  'cancelado'
);

-- Tabla Inquilinos (El Gestor es dueño de su cartera de clientes)
CREATE TABLE inquilinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  nombre_completo TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  documento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_inquilinos
  BEFORE UPDATE ON inquilinos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tabla Alquileres (Historial / Contratos)
CREATE TABLE alquileres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- redundante pero útil para RLS fácil
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
  inquilino_id UUID NOT NULL REFERENCES inquilinos(id) ON DELETE RESTRICT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  monto_total DECIMAL(12, 2) NOT NULL,
  estado estado_alquiler NOT NULL DEFAULT 'activo',
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT check_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE TRIGGER set_updated_at_alquileres
  BEFORE UPDATE ON alquileres
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX idx_inquilinos_gestor ON inquilinos(gestor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_alquileres_gestor ON alquileres(gestor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_alquileres_unidad ON alquileres(unidad_id) WHERE deleted_at IS NULL;

-- RLS Inquilinos
ALTER TABLE inquilinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestor maneja sus inquilinos"
ON inquilinos FOR ALL
USING (auth.uid() = gestor_id)
WITH CHECK (auth.uid() = gestor_id);

-- RLS Alquileres
ALTER TABLE alquileres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestor maneja sus alquileres"
ON alquileres FOR ALL
USING (auth.uid() = gestor_id)
WITH CHECK (auth.uid() = gestor_id);
