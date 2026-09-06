-- 1. Agregar cupo_maximo a users
ALTER TABLE users ADD COLUMN cupo_maximo INTEGER NOT NULL DEFAULT 0;

-- 2. Seed inicial de la ciudad y zona de prueba
INSERT INTO ciudades (id, nombre, provincia) 
VALUES (1, 'Goya', 'Corrientes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO zonas (ciudad_id, nombre) 
VALUES 
  (1, 'Centro'), 
  (1, 'Norte'), 
  (1, 'Sur')
ON CONFLICT DO NOTHING;

-- Reset sequence if needed for next inserts
SELECT setval('ciudades_id_seq', (SELECT MAX(id) FROM ciudades));
SELECT setval('zonas_id_seq', (SELECT MAX(id) FROM zonas));

-- 3. Actualizar handle_new_user para que asigne cupo de trial
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, phone, cupo_maximo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone,
    3  -- TRIAL_MAX_UNITS: ajustar cuando se implemente Mercado Pago (Fase 4)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
