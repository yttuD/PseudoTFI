-- favoritos
CREATE TABLE favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, unidad_id)  -- un usuario no puede favoritar la misma unidad dos veces
);

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve sus propios favoritos" ON favoritos FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Usuario crea sus propios favoritos" ON favoritos FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Usuario elimina sus propios favoritos" ON favoritos FOR DELETE USING (auth.uid() = usuario_id);

-- reportes
CREATE TABLE reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, unidad_id)  -- un usuario solo puede reportar una vez la misma unidad
);

ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario crea sus propios reportes" ON reportes FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- counter en unidades para no hacer COUNT(*) en cada request
ALTER TABLE unidades ADD COLUMN reportes_count INTEGER NOT NULL DEFAULT 0;

-- Trigger para auto-pasar a en_revision al llegar a 50 reportes
CREATE OR REPLACE FUNCTION check_reportes_threshold()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE unidades
  SET reportes_count = reportes_count + 1,
      estado = CASE
        WHEN reportes_count + 1 >= 50 AND estado = 'publicada' THEN 'en_revision'::unidad_estado
        ELSE estado
      END
  WHERE id = NEW.unidad_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reporte_created
  AFTER INSERT ON reportes
  FOR EACH ROW EXECUTE FUNCTION check_reportes_threshold();
