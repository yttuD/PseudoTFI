-- 0. Triggers genéricos para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. ENUMs
CREATE TYPE unidad_estado AS ENUM (
  'borrador',
  'publicada',
  'pausada',
  'no_disponible',
  'en_revision',
  'suspendida',
  'archivada',
  'bloqueada_por_impago'
);

-- 2. Tablas Core

-- Users (Extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Ciudades (Catálogo)
CREATE TABLE ciudades (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  provincia TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_ciudades
  BEFORE UPDATE ON ciudades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Zonas (Catálogo por ciudad)
CREATE TABLE zonas (
  id SERIAL PRIMARY KEY,
  ciudad_id INTEGER NOT NULL REFERENCES ciudades(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_zonas
  BEFORE UPDATE ON zonas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Grupos (Contenedor organizativo opcional del Gestor)
CREATE TABLE grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_grupos
  BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_grupos_gestor_id ON grupos(gestor_id);

-- Unidades (Entidad principal)
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
  zona_id INTEGER REFERENCES zonas(id) ON DELETE RESTRICT,
  categoria TEXT NOT NULL,
  atributos JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado unidad_estado NOT NULL DEFAULT 'borrador',
  archivada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_unidades
  BEFORE UPDATE ON unidades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_unidades_gestor_id ON unidades(gestor_id);
CREATE INDEX idx_unidades_estado ON unidades(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_unidades_zona_id ON unidades(zona_id);

-- Modalidades de Precio
CREATE TABLE modalidades_precio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  unidad_tiempo TEXT NOT NULL,
  cantidad_tiempo INTEGER NOT NULL,
  precio DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at_modalidades_precio
  BEFORE UPDATE ON modalidades_precio
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 3. Row Level Security (RLS)

-- Ciudades (Catálogo público)
ALTER TABLE ciudades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de ciudades" ON ciudades FOR SELECT USING (true);

-- Zonas (Catálogo público)
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública de zonas" ON zonas FOR SELECT USING (true);

-- Unidades
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestor puede ver sus propias unidades"
ON unidades FOR SELECT
USING (auth.uid() = gestor_id AND deleted_at IS NULL);

CREATE POLICY "Gestor puede crear sus propias unidades"
ON unidades FOR INSERT
WITH CHECK (auth.uid() = gestor_id);

CREATE POLICY "Gestor puede actualizar sus propias unidades"
ON unidades FOR UPDATE
USING (auth.uid() = gestor_id AND deleted_at IS NULL);

CREATE POLICY "Público puede ver unidades publicadas"
ON unidades FOR SELECT
USING (estado = 'publicada' AND deleted_at IS NULL);
