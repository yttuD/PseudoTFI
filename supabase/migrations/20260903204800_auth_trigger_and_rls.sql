-- Habilitar RLS en public.users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario puede ver su propio perfil"
ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuario puede actualizar su propio perfil"
ON users FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

-- Trigger para sincronizar auth.users hacia public.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
