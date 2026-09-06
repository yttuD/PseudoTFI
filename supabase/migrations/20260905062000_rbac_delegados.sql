-- 1. Ampliar usuarios
ALTER TABLE users ADD COLUMN rol TEXT NOT NULL DEFAULT 'gestor' CHECK (rol IN ('gestor', 'delegado'));
ALTER TABLE users ADD COLUMN workspace_id UUID REFERENCES users(id) ON DELETE RESTRICT;

-- 2. Tabla de invitaciones
CREATE TABLE invitaciones_delegados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  usada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Función core para RLS
CREATE OR REPLACE FUNCTION get_workspace_id() RETURNS UUID AS $$
  SELECT COALESCE(workspace_id, id) FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Modificar el trigger de Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_invitacion RECORD;
BEGIN
  SELECT * INTO v_invitacion FROM public.invitaciones_delegados WHERE email = new.email AND usada = false LIMIT 1;

  IF FOUND THEN
    -- Entra como Delegado
    INSERT INTO public.users (id, full_name, phone, rol, workspace_id, cupo_maximo)
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'full_name', ''), 
      new.phone, 
      'delegado', 
      v_invitacion.gestor_id, 
      0
    );
    UPDATE public.invitaciones_delegados SET usada = true WHERE id = v_invitacion.id;
  ELSE
    -- Entra como Gestor dueño
    INSERT INTO public.users (id, full_name, phone, rol, cupo_maximo)
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'full_name', ''), 
      new.phone, 
      'gestor', 
      3
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar RLS

-- Unidades
DROP POLICY IF EXISTS "Gestor puede ver sus propias unidades" ON unidades;
DROP POLICY IF EXISTS "Gestor puede crear sus propias unidades" ON unidades;
DROP POLICY IF EXISTS "Gestor puede actualizar sus propias unidades" ON unidades;

CREATE POLICY "Workspace access" ON unidades FOR ALL 
USING (gestor_id = get_workspace_id()) 
WITH CHECK (gestor_id = get_workspace_id());

-- Inquilinos
DROP POLICY IF EXISTS "Gestor maneja sus inquilinos" ON inquilinos;

CREATE POLICY "Workspace access" ON inquilinos FOR ALL 
USING (gestor_id = get_workspace_id()) 
WITH CHECK (gestor_id = get_workspace_id());

-- Alquileres
DROP POLICY IF EXISTS "Gestor maneja sus alquileres" ON alquileres;

CREATE POLICY "Workspace access" ON alquileres FOR ALL 
USING (gestor_id = get_workspace_id()) 
WITH CHECK (gestor_id = get_workspace_id());

-- Grupos
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access" ON grupos;

CREATE POLICY "Workspace access" ON grupos FOR ALL 
USING (gestor_id = get_workspace_id()) 
WITH CHECK (gestor_id = get_workspace_id());

-- Users
DROP POLICY IF EXISTS "Usuario puede ver su propio perfil" ON users;
DROP POLICY IF EXISTS "Usuario puede actualizar su propio perfil" ON users;

CREATE POLICY "Usuario ve su perfil y delegados de su workspace" ON users FOR SELECT 
USING (id = auth.uid() OR workspace_id = get_workspace_id() OR id = get_workspace_id());

CREATE POLICY "Usuario actualiza su perfil" ON users FOR UPDATE 
USING (id = auth.uid() AND deleted_at IS NULL);
