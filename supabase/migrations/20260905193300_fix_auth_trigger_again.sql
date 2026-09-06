-- Corregir el error "record is not assigned yet" en PL/pgSQL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_invitacion RECORD;
BEGIN
  IF new.email IS NOT NULL THEN
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
      
      RETURN new;
    END IF;
  END IF;

  -- Si no hay email o no hay invitación, entra como Gestor dueño
  INSERT INTO public.users (id, full_name, phone, rol, cupo_maximo)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    new.phone, 
    'gestor', 
    3
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
