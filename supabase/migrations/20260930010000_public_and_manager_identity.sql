-- Closed beta: public seekers and workspace owners are distinct canonical roles.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_rol_check;
ALTER TABLE public.users ADD CONSTRAINT users_rol_check
  CHECK (rol IN ('buscador', 'gestor', 'delegado'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Metadata only chooses an independent account type. Delegado is assigned
  -- exclusively through the invitation-acceptance RPC, never by signup input.
  v_role := CASE WHEN new.raw_user_meta_data->>'role' = 'gestor'
    THEN 'gestor' ELSE 'buscador' END;
  INSERT INTO public.users (id, full_name, phone, rol, cupo_maximo, workspace_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    v_role,
    CASE WHEN v_role = 'gestor' THEN 3 ELSE 0 END,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.become_gestor()
RETURNS void AS $$
DECLARE
  v_user public.users%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  SELECT * INTO v_user FROM public.users
    WHERE id = (SELECT auth.uid()) AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_user.rol <> 'buscador' OR v_user.workspace_id IS NOT NULL THEN
    RAISE EXCEPTION 'Solo una cuenta Buscador activa puede convertirse en Gestor';
  END IF;
  PERFORM set_config('rendo.allow_user_mutation', 'true', true);
  UPDATE public.users SET rol = 'gestor', cupo_maximo = 3
    WHERE id = v_user.id;
  PERFORM set_config('rendo.allow_user_mutation', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.become_gestor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_gestor() TO authenticated;
