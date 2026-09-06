-- Crear bucket público para fotos de unidades
INSERT INTO storage.buckets (id, name, public) 
VALUES ('unidades', 'unidades', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para storage.objects

-- 1. Público puede ver todas las fotos
CREATE POLICY "Fotos de unidades son publicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'unidades');

-- 2. Gestor autenticado puede subir fotos
CREATE POLICY "Gestor puede subir fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'unidades'
  AND auth.uid() IS NOT NULL
);

-- 3. Gestor puede borrar fotos
CREATE POLICY "Gestor puede borrar fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'unidades'
  AND auth.uid() IS NOT NULL
);
