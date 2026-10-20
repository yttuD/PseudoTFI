-- Isolated closed-beta project: ten free non-archived units per Gestor.
-- Revisit this beta-only grant before applying the migration chain to a
-- commercial database. It does not enable billing or alter larger quotas.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := CASE WHEN new.raw_user_meta_data->>'role' = 'gestor'
    THEN 'gestor' ELSE 'buscador' END;

  INSERT INTO public.users (id, full_name, phone, rol, cupo_maximo, workspace_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    v_role,
    CASE WHEN v_role = 'gestor' THEN 10 ELSE 0 END,
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
  UPDATE public.users SET rol = 'gestor', cupo_maximo = 10
    WHERE id = v_user.id;
  PERFORM set_config('rendo.allow_user_mutation', 'false', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.become_gestor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_gestor() TO authenticated;

-- Bring every existing active beta Gestor with a smaller quota to ten.
-- Preserve larger quotas and seeker/delegate accounts.
UPDATE public.users
SET cupo_maximo = 10
WHERE rol = 'gestor'
  AND cupo_maximo < 10
  AND deleted_at IS NULL;
