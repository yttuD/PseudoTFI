-- Campos del marketplace
ALTER TABLE unidades
  ADD COLUMN titulo_es TEXT,
  ADD COLUMN titulo_pt TEXT,
  ADD COLUMN titulo_en TEXT,
  ADD COLUMN descripcion_es TEXT,
  ADD COLUMN descripcion_pt TEXT,
  ADD COLUMN descripcion_en TEXT,
  ADD COLUMN fotos TEXT[] DEFAULT '{}',
  ADD COLUMN ubicacion_aprox JSONB,
  ADD COLUMN ubicacion_exacta JSONB,
  ADD COLUMN whatsapp TEXT,
  ADD COLUMN instagram TEXT;

-- Índice para búsqueda de texto (español)
CREATE INDEX idx_unidades_titulo_es ON unidades USING gin(to_tsvector('spanish', coalesce(titulo_es, '')));

-- Índice geográfico para JSONB (aprox)
CREATE INDEX idx_unidades_ubicacion ON unidades USING gin(ubicacion_aprox);
