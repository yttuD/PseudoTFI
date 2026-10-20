-- ==============================================================================
-- Migration: 20260925120000_delegado_scope_authorization.sql
-- Feature 004: Delegado Scope and Granular Authorization
-- ==============================================================================

-- 1. EVOLVE invitaciones_delegados
ALTER TABLE public.invitaciones_delegados
  ADD COLUMN IF NOT EXISTS delegado_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada', 'expirada')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Migrate legacy data
UPDATE public.invitaciones_delegados
SET email_snapshot = email
WHERE email_snapshot IS NULL;

ALTER TABLE public.invitaciones_delegados
  ALTER COLUMN email_snapshot SET NOT NULL;
ALTER TABLE public.invitaciones_delegados
  ALTER COLUMN email DROP NOT NULL;

-- If legacy entries had usada=true, mark them as 'aceptada' else 'expirada'
UPDATE public.invitaciones_delegados
SET estado = CASE WHEN usada = true THEN 'aceptada' ELSE 'expirada' END
WHERE estado = 'pendiente' AND created_at < NOW() - interval '7 days';

-- Try to resolve delegado_id for existing rows if null
UPDATE public.invitaciones_delegados i
SET delegado_id = u.id
FROM public.users u
WHERE i.delegado_id IS NULL AND LOWER(u.full_name) = LOWER(i.email); -- or if auth.users is mapped

-- Add constraints
ALTER TABLE public.invitaciones_delegados
  DROP CONSTRAINT IF EXISTS invitaciones_delegados_email_key;

CREATE INDEX IF NOT EXISTS idx_invitaciones_gestor ON public.invitaciones_delegados(gestor_id);
CREATE INDEX IF NOT EXISTS idx_invitaciones_delegado ON public.invitaciones_delegados(delegado_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitaciones_single_pending ON public.invitaciones_delegados(gestor_id, delegado_id) WHERE estado = 'pendiente';
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitaciones_global_pending_delegado ON public.invitaciones_delegados(delegado_id) WHERE estado = 'pendiente';

-- 2. CREATE TABLE delegaciones
CREATE TABLE IF NOT EXISTS public.delegaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitacion_id UUID NOT NULL REFERENCES public.invitaciones_delegados(id) ON DELETE CASCADE UNIQUE,
  gestor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delegado_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'aceptada_sin_configurar' CHECK (estado IN ('aceptada_sin_configurar', 'activa', 'revocada')),
  permiso TEXT CHECK (permiso IN ('ver', 'gestionar')),
  alcance_tipo TEXT CHECK (alcance_tipo IN ('cuenta', 'grupo', 'unidades')),
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
  configured_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_delegacion_not_self CHECK (gestor_id <> delegado_id),
  CONSTRAINT check_delegacion_config CHECK (
    (estado = 'aceptada_sin_configurar' AND permiso IS NULL AND alcance_tipo IS NULL AND grupo_id IS NULL) OR
    (estado = 'activa' AND permiso IS NOT NULL AND alcance_tipo IS NOT NULL AND (
      (alcance_tipo = 'grupo' AND grupo_id IS NOT NULL) OR
      (alcance_tipo <> 'grupo' AND grupo_id IS NULL)
    )) OR
    (estado = 'revocada')
  )
);

CREATE INDEX IF NOT EXISTS idx_delegaciones_gestor ON public.delegaciones(gestor_id);
CREATE INDEX IF NOT EXISTS idx_delegaciones_delegado ON public.delegaciones(delegado_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delegaciones_active_delegado ON public.delegaciones(delegado_id) WHERE estado <> 'revocada';
CREATE UNIQUE INDEX IF NOT EXISTS idx_delegaciones_active_pair ON public.delegaciones(gestor_id, delegado_id) WHERE estado <> 'revocada';

-- 3. CREATE TABLE delegacion_unidades
CREATE TABLE IF NOT EXISTS public.delegacion_unidades (
  delegacion_id UUID NOT NULL REFERENCES public.delegaciones(id) ON DELETE CASCADE,
  unidad_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (delegacion_id, unidad_id)
);

CREATE INDEX IF NOT EXISTS idx_delegacion_unidades_unidad ON public.delegacion_unidades(unidad_id);

-- 4. CREATE TABLE notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'invitacion_delegado',
  referencia_id UUID,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON public.notificaciones(usuario_id, leida_at);

-- 5. CREATE TABLE email_delivery_outbox
CREATE TABLE IF NOT EXISTS public.email_delivery_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count INT NOT NULL DEFAULT 0,
  last_error_code TEXT,
  next_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_pending ON public.email_delivery_outbox(status, next_attempt_at);

-- 6. CREATE TABLE log_acciones
CREATE TABLE IF NOT EXISTS public.log_acciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_rol TEXT NOT NULL CHECK (actor_rol IN ('gestor', 'delegado', 'admin')),
  accion TEXT NOT NULL,
  recurso_tipo TEXT NOT NULL,
  recurso_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_acciones_gestor ON public.log_acciones(gestor_id, created_at DESC);

-- 7. REVISE Auth Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Feature 004 invariant: Every new user registers as Gestor owner by default.
  -- Delegado role and workspace membership transition only upon explicit invitation acceptance.
  INSERT INTO public.users (id, full_name, phone, rol, cupo_maximo, workspace_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    'gestor',
    3,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 8. SECURITY DEFINER AUTHORIZATION HELPER FUNCTIONS
-- All functions schema-qualify references and use SET search_path = ''

CREATE OR REPLACE FUNCTION public.is_gestor_owner(target_gestor_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = target_gestor_id
      AND u.id = (SELECT auth.uid())
      AND u.rol = 'gestor'
      AND u.deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_read_unidad(p_unidad_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_unidad RECORD;
  v_delegacion RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, grupo_id, deleted_at INTO v_unidad
  FROM public.unidades
  WHERE id = p_unidad_id;

  IF NOT FOUND OR v_unidad.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Gestor owner of the unit
  IF v_unidad.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- 2. Active Delegado of this Gestor
  SELECT d.id, d.alcance_tipo, d.grupo_id INTO v_delegacion
  FROM public.delegaciones d
  WHERE d.delegado_id = v_uid
    AND d.gestor_id = v_unidad.gestor_id
    AND d.estado = 'activa';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_delegacion.alcance_tipo = 'cuenta' THEN
    RETURN TRUE;
  ELSIF v_delegacion.alcance_tipo = 'grupo' THEN
    RETURN v_unidad.grupo_id IS NOT NULL AND v_unidad.grupo_id = v_delegacion.grupo_id;
  ELSIF v_delegacion.alcance_tipo = 'unidades' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.delegacion_unidades du
      WHERE du.delegacion_id = v_delegacion.id
        AND du.unidad_id = p_unidad_id
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_manage_unidad(p_unidad_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_unidad RECORD;
  v_delegacion RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, grupo_id, deleted_at INTO v_unidad
  FROM public.unidades
  WHERE id = p_unidad_id;

  IF NOT FOUND OR v_unidad.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Gestor owner
  IF v_unidad.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- 2. Delegado with permiso = 'gestionar'
  SELECT d.id, d.alcance_tipo, d.grupo_id INTO v_delegacion
  FROM public.delegaciones d
  WHERE d.delegado_id = v_uid
    AND d.gestor_id = v_unidad.gestor_id
    AND d.estado = 'activa'
    AND d.permiso = 'gestionar';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_delegacion.alcance_tipo = 'cuenta' THEN
    RETURN TRUE;
  ELSIF v_delegacion.alcance_tipo = 'grupo' THEN
    RETURN v_unidad.grupo_id IS NOT NULL AND v_unidad.grupo_id = v_delegacion.grupo_id;
  ELSIF v_delegacion.alcance_tipo = 'unidades' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.delegacion_unidades du
      WHERE du.delegacion_id = v_delegacion.id
        AND du.unidad_id = p_unidad_id
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_create_unidad(p_gestor_id UUID, p_grupo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_delegacion RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_uid = p_gestor_id THEN
    RETURN TRUE;
  END IF;

  SELECT d.id, d.alcance_tipo, d.grupo_id INTO v_delegacion
  FROM public.delegaciones d
  WHERE d.delegado_id = v_uid
    AND d.gestor_id = p_gestor_id
    AND d.estado = 'activa'
    AND d.permiso = 'gestionar';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_delegacion.alcance_tipo = 'cuenta' THEN
    RETURN TRUE;
  ELSIF v_delegacion.alcance_tipo = 'grupo' THEN
    -- Grupo scope can only create directly inside the assigned group
    RETURN p_grupo_id IS NOT NULL AND p_grupo_id = v_delegacion.grupo_id;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_read_grupo(p_grupo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_grupo RECORD;
  v_delegacion RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, deleted_at INTO v_grupo
  FROM public.grupos
  WHERE id = p_grupo_id;

  IF NOT FOUND OR v_grupo.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF v_grupo.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  SELECT d.id, d.alcance_tipo, d.grupo_id INTO v_delegacion
  FROM public.delegaciones d
  WHERE d.delegado_id = v_uid
    AND d.gestor_id = v_grupo.gestor_id
    AND d.estado = 'activa';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_delegacion.alcance_tipo = 'cuenta' THEN
    RETURN TRUE;
  ELSIF v_delegacion.alcance_tipo = 'grupo' THEN
    RETURN v_delegacion.grupo_id = p_grupo_id;
  ELSIF v_delegacion.alcance_tipo = 'unidades' THEN
    -- Visible only as container if it contains an authorized unit
    RETURN EXISTS (
      SELECT 1 FROM public.unidades u
      JOIN public.delegacion_unidades du ON du.unidad_id = u.id
      WHERE u.grupo_id = p_grupo_id
        AND du.delegacion_id = v_delegacion.id
        AND u.deleted_at IS NULL
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_manage_grupo(p_grupo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_grupo RECORD;
  v_delegacion RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, deleted_at INTO v_grupo
  FROM public.grupos
  WHERE id = p_grupo_id;

  IF NOT FOUND OR v_grupo.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF v_grupo.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  SELECT d.id, d.alcance_tipo, d.grupo_id INTO v_delegacion
  FROM public.delegaciones d
  WHERE d.delegado_id = v_uid
    AND d.gestor_id = v_grupo.gestor_id
    AND d.estado = 'activa'
    AND d.permiso = 'gestionar';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_delegacion.alcance_tipo = 'cuenta' THEN
    RETURN TRUE;
  ELSIF v_delegacion.alcance_tipo = 'grupo' THEN
    RETURN v_delegacion.grupo_id = p_grupo_id;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_manage_grupo_membership(p_grupo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_grupo RECORD;
  v_delegacion RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, deleted_at INTO v_grupo
  FROM public.grupos
  WHERE id = p_grupo_id;

  IF NOT FOUND OR v_grupo.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF v_grupo.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- Only account scope Gestionar can manage membership or delete group!
  SELECT d.id, d.alcance_tipo INTO v_delegacion
  FROM public.delegaciones d
  WHERE d.delegado_id = v_uid
    AND d.gestor_id = v_grupo.gestor_id
    AND d.estado = 'activa'
    AND d.permiso = 'gestionar'
    AND d.alcance_tipo = 'cuenta';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_read_alquiler(p_alquiler_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_unidad_id UUID;
BEGIN
  SELECT a.unidad_id INTO v_unidad_id
  FROM public.alquileres a
  WHERE a.id = p_alquiler_id AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN public.can_read_unidad(v_unidad_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_manage_alquiler(p_alquiler_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_unidad_id UUID;
BEGIN
  SELECT a.unidad_id INTO v_unidad_id
  FROM public.alquileres a
  WHERE a.id = p_alquiler_id AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN public.can_manage_unidad(v_unidad_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_read_inquilino(p_inquilino_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inq RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, deleted_at INTO v_inq
  FROM public.inquilinos
  WHERE id = p_inquilino_id;

  IF NOT FOUND OR v_inq.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF v_inq.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- Delegado can read ONLY if linked via active Alquiler to a readable Unidad
  RETURN EXISTS (
    SELECT 1 FROM public.alquileres a
    WHERE a.inquilino_id = p_inquilino_id
      AND a.deleted_at IS NULL
      AND public.can_read_unidad(a.unidad_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.can_manage_inquilino(p_inquilino_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inq RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id, gestor_id, deleted_at INTO v_inq
  FROM public.inquilinos
  WHERE id = p_inquilino_id;

  IF NOT FOUND OR v_inq.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF v_inq.gestor_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- Delegado can manage only if linked to a manageable Unidad
  RETURN EXISTS (
    SELECT 1 FROM public.alquileres a
    WHERE a.inquilino_id = p_inquilino_id
      AND a.deleted_at IS NULL
      AND public.can_manage_unidad(a.unidad_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- 9. REPLACE BROAD POLICIES ACROSS ALL RELEVANT TABLES

-- UNIDADES
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access" ON public.unidades;
DROP POLICY IF EXISTS "Gestor puede ver sus propias unidades" ON public.unidades;
DROP POLICY IF EXISTS "Gestor puede crear sus propias unidades" ON public.unidades;
DROP POLICY IF EXISTS "Gestor puede actualizar sus propias unidades" ON public.unidades;
DROP POLICY IF EXISTS "Unidades publicas visibles por todos" ON public.unidades;
DROP POLICY IF EXISTS "Unidades select policy" ON public.unidades;
DROP POLICY IF EXISTS "Unidades anon select policy" ON public.unidades;
DROP POLICY IF EXISTS "Unidades authenticated select policy" ON public.unidades;
DROP POLICY IF EXISTS "Unidades insert policy" ON public.unidades;
DROP POLICY IF EXISTS "Unidades update policy" ON public.unidades;
DROP POLICY IF EXISTS "Unidades delete policy" ON public.unidades;

CREATE POLICY "Unidades anon select policy" ON public.unidades FOR SELECT TO anon
USING (
  estado = 'publicada' AND deleted_at IS NULL
);

CREATE POLICY "Unidades authenticated select policy" ON public.unidades FOR SELECT TO authenticated
USING (
  public.can_read_unidad(id)
  OR (estado = 'publicada' AND deleted_at IS NULL)
);

CREATE POLICY "Unidades insert policy" ON public.unidades FOR INSERT TO authenticated
WITH CHECK (
  public.can_create_unidad(gestor_id, grupo_id)
);

CREATE POLICY "Unidades update policy" ON public.unidades FOR UPDATE TO authenticated
USING (
  public.can_read_unidad(id)
  OR (estado = 'publicada' AND deleted_at IS NULL)
)
WITH CHECK (
  public.can_manage_unidad(id)
);

CREATE POLICY "Unidades delete policy" ON public.unidades FOR DELETE TO authenticated
USING (
  auth.uid() = gestor_id
);

-- MODALIDADES DE PRECIO
ALTER TABLE public.modalidades_precio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Modalidades select policy" ON public.modalidades_precio;
DROP POLICY IF EXISTS "Modalidades anon select policy" ON public.modalidades_precio;
DROP POLICY IF EXISTS "Modalidades authenticated select policy" ON public.modalidades_precio;
DROP POLICY IF EXISTS "Modalidades mutate policy" ON public.modalidades_precio;
DROP POLICY IF EXISTS "Modalidades insert policy" ON public.modalidades_precio;
DROP POLICY IF EXISTS "Modalidades update policy" ON public.modalidades_precio;
DROP POLICY IF EXISTS "Modalidades delete policy" ON public.modalidades_precio;

CREATE POLICY "Modalidades anon select policy" ON public.modalidades_precio FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.unidades u
    WHERE u.id = unidad_id AND u.estado = 'publicada' AND u.deleted_at IS NULL
  )
);

CREATE POLICY "Modalidades authenticated select policy" ON public.modalidades_precio FOR SELECT TO authenticated
USING (
  public.can_read_unidad(unidad_id)
  OR EXISTS (
    SELECT 1 FROM public.unidades u
    WHERE u.id = unidad_id AND u.estado = 'publicada' AND u.deleted_at IS NULL
  )
);

CREATE POLICY "Modalidades insert policy" ON public.modalidades_precio FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_unidad(unidad_id)
);

CREATE POLICY "Modalidades update policy" ON public.modalidades_precio FOR UPDATE TO authenticated
USING (
  public.can_manage_unidad(unidad_id)
)
WITH CHECK (
  public.can_manage_unidad(unidad_id)
);

CREATE POLICY "Modalidades delete policy" ON public.modalidades_precio FOR DELETE TO authenticated
USING (
  public.can_manage_unidad(unidad_id)
);

-- GRUPOS
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access" ON public.grupos;
DROP POLICY IF EXISTS "Grupos select policy" ON public.grupos;
DROP POLICY IF EXISTS "Grupos insert policy" ON public.grupos;
DROP POLICY IF EXISTS "Grupos update policy" ON public.grupos;
DROP POLICY IF EXISTS "Grupos delete policy" ON public.grupos;

CREATE POLICY "Grupos select policy" ON public.grupos FOR SELECT
TO authenticated
USING (
  public.can_read_grupo(id)
);

CREATE POLICY "Grupos insert policy" ON public.grupos FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = gestor_id OR EXISTS (
    SELECT 1 FROM public.delegaciones d
    WHERE d.delegado_id = auth.uid()
      AND d.gestor_id = gestor_id
      AND d.estado = 'activa'
      AND d.permiso = 'gestionar'
      AND d.alcance_tipo = 'cuenta'
  )
);

CREATE POLICY "Grupos update policy" ON public.grupos FOR UPDATE
TO authenticated
USING (
  public.can_manage_grupo(id)
)
WITH CHECK (
  public.can_manage_grupo(id)
);

CREATE POLICY "Grupos delete policy" ON public.grupos FOR DELETE
TO authenticated
USING (
  public.can_manage_grupo_membership(id)
);

-- ALQUILERES
ALTER TABLE public.alquileres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access" ON public.alquileres;
DROP POLICY IF EXISTS "Gestor maneja sus alquileres" ON public.alquileres;
DROP POLICY IF EXISTS "Alquileres select policy" ON public.alquileres;
DROP POLICY IF EXISTS "Alquileres insert policy" ON public.alquileres;
DROP POLICY IF EXISTS "Alquileres update policy" ON public.alquileres;
DROP POLICY IF EXISTS "Alquileres delete policy" ON public.alquileres;

CREATE POLICY "Alquileres select policy" ON public.alquileres FOR SELECT
TO authenticated
USING (
  public.can_read_unidad(unidad_id)
);

CREATE POLICY "Alquileres insert policy" ON public.alquileres FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_unidad(unidad_id)
);

CREATE POLICY "Alquileres update policy" ON public.alquileres FOR UPDATE
TO authenticated
USING (
  public.can_manage_unidad(unidad_id)
)
WITH CHECK (
  public.can_manage_unidad(unidad_id)
);

CREATE POLICY "Alquileres delete policy" ON public.alquileres FOR DELETE
TO authenticated
USING (
  public.can_manage_unidad(unidad_id)
);

-- INQUILINOS
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access" ON public.inquilinos;
DROP POLICY IF EXISTS "Gestor maneja sus inquilinos" ON public.inquilinos;
DROP POLICY IF EXISTS "Inquilinos select policy" ON public.inquilinos;
DROP POLICY IF EXISTS "Inquilinos insert policy" ON public.inquilinos;
DROP POLICY IF EXISTS "Inquilinos update policy" ON public.inquilinos;
DROP POLICY IF EXISTS "Inquilinos delete policy" ON public.inquilinos;

CREATE POLICY "Inquilinos select policy" ON public.inquilinos FOR SELECT
TO authenticated
USING (
  public.can_read_inquilino(id)
);

CREATE POLICY "Inquilinos insert policy" ON public.inquilinos FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = gestor_id OR EXISTS (
    SELECT 1 FROM public.delegaciones d
    WHERE d.delegado_id = auth.uid()
      AND d.gestor_id = gestor_id
      AND d.estado = 'activa'
      AND d.permiso = 'gestionar'
  )
);

CREATE POLICY "Inquilinos update policy" ON public.inquilinos FOR UPDATE
TO authenticated
USING (
  public.can_manage_inquilino(id)
)
WITH CHECK (
  public.can_manage_inquilino(id)
);

CREATE POLICY "Inquilinos delete policy" ON public.inquilinos FOR DELETE
TO authenticated
USING (
  auth.uid() = gestor_id
);

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuario ve su perfil y delegados de su workspace" ON public.users;
DROP POLICY IF EXISTS "Usuario actualiza su perfil" ON public.users;
DROP POLICY IF EXISTS "Users select policy" ON public.users;
DROP POLICY IF EXISTS "Users update policy" ON public.users;

CREATE POLICY "Users select policy" ON public.users FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.delegaciones d
    WHERE (d.gestor_id = auth.uid() AND d.delegado_id = users.id AND d.estado <> 'revocada')
       OR (d.delegado_id = auth.uid() AND d.gestor_id = users.id AND d.estado <> 'revocada')
  )
);

CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS trigger AS $$
BEGIN
  -- Allow explicit bypass configured within trusted transactional RPCs
  IF current_setting('rendo.allow_user_mutation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow postgres / superuser during direct migrations/seeds without PostgREST auth claims
  IF current_user = 'postgres' AND (SELECT auth.role()) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Direct authenticated updates cannot modify sensitive fields
  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    RAISE EXCEPTION 'No está permitido modificar el rol directamente';
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'No está permitido modificar el workspace_id directamente';
  END IF;
  IF NEW.cupo_maximo IS DISTINCT FROM OLD.cupo_maximo THEN
    RAISE EXCEPTION 'No está permitido modificar el cupo directamente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trg_protect_user_fields ON public.users;
CREATE TRIGGER trg_protect_user_fields
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields();

CREATE POLICY "Users update policy" ON public.users FOR UPDATE
TO authenticated
USING (
  id = auth.uid() AND deleted_at IS NULL
)
WITH CHECK (
  id = auth.uid() AND deleted_at IS NULL
);

-- INVITACIONES DELEGADOS
ALTER TABLE public.invitaciones_delegados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invitaciones select policy" ON public.invitaciones_delegados;
DROP POLICY IF EXISTS "Invitaciones insert policy" ON public.invitaciones_delegados;
DROP POLICY IF EXISTS "Invitaciones update policy" ON public.invitaciones_delegados;
DROP POLICY IF EXISTS "Invitaciones delete policy" ON public.invitaciones_delegados;

CREATE POLICY "Invitaciones select policy" ON public.invitaciones_delegados FOR SELECT
TO authenticated
USING (
  gestor_id = auth.uid() OR delegado_id = auth.uid()
);

CREATE POLICY "Invitaciones insert policy" ON public.invitaciones_delegados FOR INSERT
TO authenticated
WITH CHECK (
  gestor_id = auth.uid() AND public.is_gestor_owner(auth.uid())
);

-- Direct update and delete on invitaciones_delegados are denied.
-- All acceptance, rejection, and cancellation transitions must execute via transactional security definer RPCs.

-- DELEGACIONES
ALTER TABLE public.delegaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delegaciones select policy" ON public.delegaciones;
DROP POLICY IF EXISTS "Delegaciones insert policy" ON public.delegaciones;
DROP POLICY IF EXISTS "Delegaciones update policy" ON public.delegaciones;
DROP POLICY IF EXISTS "Delegaciones delete policy" ON public.delegaciones;

CREATE POLICY "Delegaciones select policy" ON public.delegaciones FOR SELECT
TO authenticated
USING (
  gestor_id = auth.uid() OR delegado_id = auth.uid()
);

-- Direct mutations on delegaciones are denied for all authenticated clients.
-- Lifecycle creation and configuration execute exclusively via transactional security definer RPCs.

-- DELEGACION UNIDADES
ALTER TABLE public.delegacion_unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delegacion unidades select policy" ON public.delegacion_unidades;
DROP POLICY IF EXISTS "Delegacion unidades mutate policy" ON public.delegacion_unidades;

CREATE POLICY "Delegacion unidades select policy" ON public.delegacion_unidades FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.delegaciones d
    WHERE d.id = delegacion_id
      AND (d.gestor_id = auth.uid() OR d.delegado_id = auth.uid())
  )
);

-- Direct mutations on delegacion_unidades are denied.
-- Scope configuration executes exclusively via configure_delegacion RPC.

-- NOTIFICACIONES
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notificaciones select policy" ON public.notificaciones;
DROP POLICY IF EXISTS "Notificaciones update policy" ON public.notificaciones;
DROP POLICY IF EXISTS "Notificaciones insert policy" ON public.notificaciones;

CREATE POLICY "Notificaciones select policy" ON public.notificaciones FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- Direct inserts by clients are prohibited (notifications are created solely by server/service_role/RPC)
-- Updates are strictly limited to leida_at timestamp
CREATE POLICY "Notificaciones update policy" ON public.notificaciones FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_notificacion_fields()
RETURNS trigger AS $$
BEGIN
  IF current_setting('rendo.allow_notification_mutation', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id OR
     NEW.usuario_id IS DISTINCT FROM OLD.usuario_id OR
     NEW.tipo IS DISTINCT FROM OLD.tipo OR
     NEW.referencia_id IS DISTINCT FROM OLD.referencia_id OR
     NEW.titulo IS DISTINCT FROM OLD.titulo OR
     NEW.mensaje IS DISTINCT FROM OLD.mensaje OR
     NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Solo se permite actualizar el estado de lectura (leida_at) de la notificación';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trg_protect_notificacion_fields ON public.notificaciones;
CREATE TRIGGER trg_protect_notificacion_fields
  BEFORE UPDATE ON public.notificaciones
  FOR EACH ROW EXECUTE FUNCTION public.protect_notificacion_fields();

-- EMAIL DELIVERY OUTBOX
ALTER TABLE public.email_delivery_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Outbox service policy" ON public.email_delivery_outbox;
CREATE POLICY "Outbox owner or recipient view" ON public.email_delivery_outbox FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- LOG ACCIONES (Owner-only read, direct client append prohibited)
ALTER TABLE public.log_acciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Log acciones owner read" ON public.log_acciones;
DROP POLICY IF EXISTS "Log acciones append" ON public.log_acciones;

CREATE POLICY "Log acciones owner read" ON public.log_acciones FOR SELECT
TO authenticated
USING (
  public.is_gestor_owner(gestor_id)
);

-- Client forgery prohibited: direct INSERT, UPDATE, DELETE on log_acciones are completely denied for clients.
-- Audit rows are immutable and appended only via trusted server and security definer RPC execution.

-- PAGOS (Platform subscription / cupo - OWNER ONLY)
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestor puede ver sus pagos" ON public.pagos;
DROP POLICY IF EXISTS "Gestor maneja sus propios pagos" ON public.pagos;
DROP POLICY IF EXISTS "Pagos owner only" ON public.pagos;

CREATE POLICY "Pagos owner only" ON public.pagos FOR ALL TO authenticated
USING (
  public.is_gestor_owner(gestor_id)
)
WITH CHECK (
  public.is_gestor_owner(gestor_id)
);

-- GESTOR AFIP CONFIG & COMPROBANTES (OWNER ONLY)
ALTER TABLE public.gestor_afip_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores config fiscal workspace" ON public.gestor_afip_config;
DROP POLICY IF EXISTS "Gestor maneja su propia config afip" ON public.gestor_afip_config;
DROP POLICY IF EXISTS "Afip config owner only" ON public.gestor_afip_config;

CREATE POLICY "Afip config owner only" ON public.gestor_afip_config FOR ALL TO authenticated
USING (
  public.is_gestor_owner(gestor_id)
)
WITH CHECK (
  public.is_gestor_owner(gestor_id)
);

ALTER TABLE public.afip_comprobantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores acceden a sus comprobantes AFIP" ON public.afip_comprobantes;
DROP POLICY IF EXISTS "Gestor maneja sus propios comprobantes afip" ON public.afip_comprobantes;
DROP POLICY IF EXISTS "Afip comprobantes owner only" ON public.afip_comprobantes;

CREATE POLICY "Afip comprobantes owner only" ON public.afip_comprobantes FOR ALL TO authenticated
USING (
  public.is_gestor_owner(gestor_id)
)
WITH CHECK (
  public.is_gestor_owner(gestor_id)
);

-- ANALYTICS (vistas_unidades, contactos_whatsapp: private read scoped, public write preserved)
ALTER TABLE public.vistas_unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de vistas a autenticados" ON public.vistas_unidades;
DROP POLICY IF EXISTS "Permitir inserción de vistas" ON public.vistas_unidades;
DROP POLICY IF EXISTS "Vistas unidades select scoped" ON public.vistas_unidades;
DROP POLICY IF EXISTS "Vistas unidades public insert" ON public.vistas_unidades;

CREATE POLICY "Vistas unidades public insert" ON public.vistas_unidades FOR INSERT
WITH CHECK (true);

CREATE POLICY "Vistas unidades select scoped" ON public.vistas_unidades FOR SELECT TO authenticated
USING (
  public.can_read_unidad(unidad_id)
);

ALTER TABLE public.contactos_whatsapp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de contactos a autenticados" ON public.contactos_whatsapp;
DROP POLICY IF EXISTS "Permitir inserción de contactos" ON public.contactos_whatsapp;
DROP POLICY IF EXISTS "Contactos whatsapp select scoped" ON public.contactos_whatsapp;
DROP POLICY IF EXISTS "Contactos whatsapp public insert" ON public.contactos_whatsapp;

CREATE POLICY "Contactos whatsapp public insert" ON public.contactos_whatsapp FOR INSERT
WITH CHECK (true);

CREATE POLICY "Contactos whatsapp select scoped" ON public.contactos_whatsapp FOR SELECT TO authenticated
USING (
  public.can_read_unidad(unidad_id)
);

-- STORAGE (contratos and fotos)
-- 1. Contratos bucket: strictly private
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Unidades (fotos) bucket: public reads
INSERT INTO storage.buckets (id, name, public)
VALUES ('unidades', 'unidades', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop legacy storage policies across both buckets
DROP POLICY IF EXISTS "Contratos son accesibles" ON storage.objects;
DROP POLICY IF EXISTS "Gestor puede subir contratos" ON storage.objects;
DROP POLICY IF EXISTS "Gestor puede eliminar contratos" ON storage.objects;
DROP POLICY IF EXISTS "Contratos storage select" ON storage.objects;
DROP POLICY IF EXISTS "Contratos storage insert" ON storage.objects;
DROP POLICY IF EXISTS "Contratos storage delete" ON storage.objects;

DROP POLICY IF EXISTS "Fotos de unidades son publicas" ON storage.objects;
DROP POLICY IF EXISTS "Gestor puede subir fotos" ON storage.objects;
DROP POLICY IF EXISTS "Gestor puede borrar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Fotos storage select" ON storage.objects;
DROP POLICY IF EXISTS "Fotos storage insert" ON storage.objects;
DROP POLICY IF EXISTS "Fotos storage delete" ON storage.objects;

-- Scoped Contratos policies
CREATE POLICY "Contratos storage select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contratos' AND (
    (storage.foldername(name))[1] IS NOT NULL
    AND public.can_read_alquiler(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Contratos storage insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contratos' AND (
    (storage.foldername(name))[1] IS NOT NULL
    AND public.can_manage_alquiler(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Contratos storage delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'contratos' AND (
    (storage.foldername(name))[1] IS NOT NULL
    AND public.can_manage_alquiler(((storage.foldername(name))[1])::uuid)
  )
);

-- Scoped Fotos policies
CREATE POLICY "Fotos storage select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'unidades'
);

CREATE POLICY "Fotos storage insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'unidades' AND (
    (storage.foldername(name))[1] IS NOT NULL
    AND public.can_manage_unidad(((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Fotos storage delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'unidades' AND (
    (storage.foldername(name))[1] IS NOT NULL
    AND public.can_manage_unidad(((storage.foldername(name))[1])::uuid)
  )
);

-- 9.1 ATOMIC OPERATIONAL AUDIT TRIGGER
-- Guarantees that mutations and audit rows are committed in the same database transaction
CREATE OR REPLACE FUNCTION public.audit_operational_mutation()
RETURNS trigger AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_actor_user RECORD;
  v_gestor_id UUID;
  v_actor_rol TEXT;
  v_accion TEXT;
  v_recurso_tipo TEXT;
  v_recurso_id UUID;
  v_metadata JSONB := '{}'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, rol, workspace_id, deleted_at INTO v_actor_user
  FROM public.users
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Actor autenticado no registrado en public.users';
  END IF;

  IF v_actor_user.rol = 'delegado' THEN
    v_gestor_id := v_actor_user.workspace_id;
    v_actor_rol := 'delegado';
  ELSIF v_actor_user.rol = 'admin' THEN
    v_gestor_id := COALESCE(v_actor_user.workspace_id, v_uid);
    v_actor_rol := 'admin';
  ELSE
    v_gestor_id := v_uid;
    v_actor_rol := 'gestor';
  END IF;

  v_recurso_tipo := TG_TABLE_NAME;
  v_recurso_id := COALESCE(NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    v_accion := 'crear_' || TG_TABLE_NAME;
    v_metadata := jsonb_build_object('op', 'INSERT');
  ELSIF TG_OP = 'UPDATE' THEN
    IF (TG_TABLE_NAME IN ('unidades', 'grupos', 'alquileres', 'inquilinos', 'modalidades_precio'))
       AND (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
      v_accion := 'eliminar_' || TG_TABLE_NAME;
      v_metadata := jsonb_build_object('op', 'SOFT_DELETE');
    ELSIF TG_TABLE_NAME = 'unidades' AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
      v_accion := 'cambiar_estado_unidad';
      v_metadata := jsonb_build_object('estado_anterior', OLD.estado, 'nuevo_estado', NEW.estado);
    ELSE
      v_accion := 'actualizar_' || TG_TABLE_NAME;
      v_metadata := jsonb_build_object('op', 'UPDATE');
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_accion := 'eliminar_fisico_' || TG_TABLE_NAME;
    v_metadata := jsonb_build_object('op', 'DELETE');
  END IF;

  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_gestor_id,
    v_uid,
    v_actor_rol,
    v_accion,
    v_recurso_tipo,
    v_recurso_id,
    v_metadata,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_audit_unidades ON public.unidades;
CREATE TRIGGER trg_audit_unidades
  AFTER INSERT OR UPDATE OR DELETE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.audit_operational_mutation();

DROP TRIGGER IF EXISTS trg_audit_modalidades_precio ON public.modalidades_precio;
CREATE TRIGGER trg_audit_modalidades_precio
  AFTER INSERT OR UPDATE OR DELETE ON public.modalidades_precio
  FOR EACH ROW EXECUTE FUNCTION public.audit_operational_mutation();

DROP TRIGGER IF EXISTS trg_audit_grupos ON public.grupos;
CREATE TRIGGER trg_audit_grupos
  AFTER INSERT OR UPDATE OR DELETE ON public.grupos
  FOR EACH ROW EXECUTE FUNCTION public.audit_operational_mutation();

DROP TRIGGER IF EXISTS trg_audit_alquileres ON public.alquileres;
CREATE TRIGGER trg_audit_alquileres
  AFTER INSERT OR UPDATE OR DELETE ON public.alquileres
  FOR EACH ROW EXECUTE FUNCTION public.audit_operational_mutation();

DROP TRIGGER IF EXISTS trg_audit_inquilinos ON public.inquilinos;
CREATE TRIGGER trg_audit_inquilinos
  AFTER INSERT OR UPDATE OR DELETE ON public.inquilinos
  FOR EACH ROW EXECUTE FUNCTION public.audit_operational_mutation();

-- ==============================================================================
-- 10. TRANSACTIONAL SECURITY DEFINER RPCs
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.accept_delegado_invitation(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv RECORD;
  v_delegacion_id UUID;
  v_target_user RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Lock invitation row
  SELECT * INTO v_inv
  FROM public.invitaciones_delegados
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR v_inv.delegado_id <> v_uid THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;

  IF v_inv.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'La invitación no está pendiente (estado: %)', v_inv.estado;
  END IF;

  IF v_inv.expires_at < v_now THEN
    UPDATE public.invitaciones_delegados
    SET estado = 'expirada', updated_at = v_now
    WHERE id = p_invitation_id;
    RAISE EXCEPTION 'La invitación ha expirado';
  END IF;

  -- Verify target user eligibility
  SELECT id, rol, workspace_id, deleted_at INTO v_target_user
  FROM public.users
  WHERE id = v_uid;

  IF NOT FOUND OR v_target_user.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Usuario objetivo no válido o eliminado';
  END IF;

  IF v_target_user.rol = 'delegado' AND v_target_user.workspace_id IS NOT NULL THEN
    RAISE EXCEPTION 'El usuario ya pertenece a un espacio de trabajo como delegado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.unidades
    WHERE gestor_id = v_uid AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'El usuario ya posee unidades propias como gestor';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.delegaciones
    WHERE delegado_id = v_uid AND estado <> 'revocada'
  ) THEN
    RAISE EXCEPTION 'El usuario ya posee una delegación activa o pendiente';
  END IF;

  -- 1. Mark invitation accepted
  UPDATE public.invitaciones_delegados
  SET estado = 'aceptada',
      responded_at = v_now,
      updated_at = v_now
  WHERE id = p_invitation_id;

  -- 2. Update user profile to delegado of gestor workspace
  PERFORM set_config('rendo.allow_user_mutation', 'true', true);
  UPDATE public.users
  SET rol = 'delegado',
      workspace_id = v_inv.gestor_id
  WHERE id = v_uid;

  -- 3. Insert accepted_sin_configurar delegacion
  INSERT INTO public.delegaciones (
    invitacion_id,
    gestor_id,
    delegado_id,
    estado,
    permiso,
    alcance_tipo,
    grupo_id,
    created_at,
    updated_at
  ) VALUES (
    p_invitation_id,
    v_inv.gestor_id,
    v_uid,
    'aceptada_sin_configurar',
    NULL,
    NULL,
    NULL,
    v_now,
    v_now
  ) RETURNING id INTO v_delegacion_id;

  -- 4. Record action log
  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_inv.gestor_id,
    v_uid,
    'delegado',
    'aceptar_invitacion',
    'invitacion',
    p_invitation_id,
    jsonb_build_object('delegacion_id', v_delegacion_id),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'delegacion_id', v_delegacion_id,
    'estado', 'aceptada_sin_configurar'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.reject_delegado_invitation(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_inv
  FROM public.invitaciones_delegados
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR v_inv.delegado_id <> v_uid THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;

  IF v_inv.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'La invitación no está pendiente (estado: %)', v_inv.estado;
  END IF;

  UPDATE public.invitaciones_delegados
  SET estado = 'rechazada',
      responded_at = v_now,
      updated_at = v_now
  WHERE id = p_invitation_id;

  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_inv.gestor_id,
    v_uid,
    'delegado',
    'rechazar_invitacion',
    'invitacion',
    p_invitation_id,
    '{}'::jsonb,
    v_now
  );

  RETURN jsonb_build_object('success', true, 'estado', 'rechazada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.cancel_delegado_invitation(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inv RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_inv
  FROM public.invitaciones_delegados
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR v_inv.gestor_id <> v_uid THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;

  IF v_inv.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Solo se pueden cancelar invitaciones pendientes (estado: %)', v_inv.estado;
  END IF;

  UPDATE public.invitaciones_delegados
  SET estado = 'cancelada',
      cancelled_at = v_now,
      updated_at = v_now
  WHERE id = p_invitation_id;

  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_inv.gestor_id,
    v_uid,
    'gestor',
    'cancelar_invitacion',
    'invitacion',
    p_invitation_id,
    '{}'::jsonb,
    v_now
  );

  RETURN jsonb_build_object('success', true, 'estado', 'cancelada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.configure_delegacion(
  p_delegacion_id UUID,
  p_permiso TEXT,
  p_alcance_tipo TEXT,
  p_grupo_id UUID DEFAULT NULL,
  p_unidad_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_del RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_uid_elem UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_del
  FROM public.delegaciones
  WHERE id = p_delegacion_id
  FOR UPDATE;

  IF NOT FOUND OR v_del.gestor_id <> v_uid THEN
    RAISE EXCEPTION 'Delegación no encontrada';
  END IF;

  IF v_del.estado = 'revocada' THEN
    RAISE EXCEPTION 'No se puede configurar una delegación revocada';
  END IF;

  IF p_permiso NOT IN ('ver', 'gestionar') THEN
    RAISE EXCEPTION 'Permiso inválido: debe ser "ver" o "gestionar"';
  END IF;

  IF p_alcance_tipo NOT IN ('cuenta', 'grupo', 'unidades') THEN
    RAISE EXCEPTION 'Alcance inválido: debe ser "cuenta", "grupo" o "unidades"';
  END IF;

  IF p_alcance_tipo = 'grupo' THEN
    IF p_grupo_id IS NULL THEN
      RAISE EXCEPTION 'El alcance por grupo requiere un grupo_id válido';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.grupos
      WHERE id = p_grupo_id AND gestor_id = v_uid AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'El grupo seleccionado no existe o no pertenece a tu espacio';
    END IF;
  END IF;

  IF p_alcance_tipo = 'unidades' THEN
    IF p_unidad_ids IS NULL OR cardinality(p_unidad_ids) = 0 THEN
      RAISE EXCEPTION 'El alcance por unidades requiere al menos una unidad seleccionada';
    END IF;
    FOREACH v_uid_elem IN ARRAY p_unidad_ids LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.unidades
        WHERE id = v_uid_elem AND gestor_id = v_uid AND deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION 'Una o más unidades seleccionadas no existen en tu espacio';
      END IF;
    END LOOP;
  END IF;

  -- 1. Remove previous unit links
  DELETE FROM public.delegacion_unidades
  WHERE delegacion_id = p_delegacion_id;

  -- 2. Update delegation
  UPDATE public.delegaciones
  SET estado = 'activa',
      permiso = p_permiso,
      alcance_tipo = p_alcance_tipo,
      grupo_id = CASE WHEN p_alcance_tipo = 'grupo' THEN p_grupo_id ELSE NULL END,
      configured_at = v_now,
      updated_at = v_now
  WHERE id = p_delegacion_id;

  -- 3. If unidades, insert new links
  IF p_alcance_tipo = 'unidades' THEN
    FOREACH v_uid_elem IN ARRAY p_unidad_ids LOOP
      INSERT INTO public.delegacion_unidades (delegacion_id, unidad_id, created_at)
      VALUES (p_delegacion_id, v_uid_elem, v_now)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- 4. Record action log
  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_del.gestor_id,
    v_uid,
    'gestor',
    'configurar_delegacion',
    'delegacion',
    p_delegacion_id,
    jsonb_build_object(
      'permiso', p_permiso,
      'alcance_tipo', p_alcance_tipo,
      'grupo_id', p_grupo_id,
      'unidades_count', cardinality(p_unidad_ids)
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', p_delegacion_id,
    'estado', 'activa',
    'permiso', p_permiso,
    'alcance_tipo', p_alcance_tipo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.revoke_delegacion(p_delegacion_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_del RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_del
  FROM public.delegaciones
  WHERE id = p_delegacion_id
  FOR UPDATE;

  IF NOT FOUND OR v_del.gestor_id <> v_uid THEN
    RAISE EXCEPTION 'Delegación no encontrada';
  END IF;

  IF v_del.estado = 'revocada' THEN
    RAISE EXCEPTION 'La delegación ya se encuentra revocada';
  END IF;

  -- 1. Mark delegacion revocada
  UPDATE public.delegaciones
  SET estado = 'revocada',
      revoked_at = v_now,
      updated_at = v_now
  WHERE id = p_delegacion_id;

  -- 2. Revert delegated user to standalone gestor
  PERFORM set_config('rendo.allow_user_mutation', 'true', true);
  UPDATE public.users
  SET rol = 'gestor',
      workspace_id = NULL
  WHERE id = v_del.delegado_id;

  -- 3. Record action log
  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_del.gestor_id,
    v_uid,
    'gestor',
    'revocar_delegacion',
    'delegacion',
    p_delegacion_id,
    jsonb_build_object('delegado_id', v_del.delegado_id),
    v_now
  );

  RETURN jsonb_build_object('success', true, 'estado', 'revocada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.create_delegado_invitation(
  p_delegado_id UUID,
  p_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_gestor RECORD;
  v_target RECORD;
  v_auth_target RECORD;
  v_canonical_email TEXT;
  v_inv_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Verify caller satisfies the Gestor-owner invariant
  SELECT id, rol, workspace_id, deleted_at INTO v_gestor
  FROM public.users
  WHERE id = v_uid;

  IF NOT FOUND OR v_gestor.deleted_at IS NOT NULL OR v_gestor.rol <> 'gestor' THEN
    RAISE EXCEPTION 'No autorizado para invitar delegados: solo el Gestor propietario puede emitir invitaciones';
  END IF;

  -- Reject self-invitation
  IF p_delegado_id = v_uid THEN
    RAISE EXCEPTION 'No puedes invitar a tu propia cuenta';
  END IF;

  -- Lock and verify target account in public.users
  SELECT id, rol, workspace_id, deleted_at INTO v_target
  FROM public.users
  WHERE id = p_delegado_id
  FOR UPDATE;

  IF NOT FOUND OR v_target.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Usuario objetivo no válido o eliminado';
  END IF;

  -- Lock and verify target account in auth.users (registered and email-verified)
  SELECT id, email, email_confirmed_at, confirmed_at, deleted_at INTO v_auth_target
  FROM auth.users
  WHERE id = p_delegado_id
  FOR UPDATE;

  IF NOT FOUND OR v_auth_target.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Usuario objetivo no registrado o eliminado en auth';
  END IF;

  IF v_auth_target.email_confirmed_at IS NULL AND v_auth_target.confirmed_at IS NULL THEN
    RAISE EXCEPTION 'La cuenta del usuario objetivo no está verificada';
  END IF;

  IF v_auth_target.email IS NULL OR TRIM(v_auth_target.email) = '' THEN
    RAISE EXCEPTION 'La cuenta del usuario objetivo no tiene un email válido';
  END IF;

  v_canonical_email := LOWER(TRIM(v_auth_target.email));

  -- If compatibility parameter p_email was provided, validate exact canonical equality
  IF p_email IS NOT NULL AND TRIM(p_email) <> '' THEN
    IF LOWER(TRIM(p_email)) <> v_canonical_email THEN
      RAISE EXCEPTION 'El email proporcionado no coincide con la cuenta objetivo';
    END IF;
  END IF;

  -- Target relationship invariants
  IF v_target.rol = 'delegado' AND v_target.workspace_id IS NOT NULL THEN
    RAISE EXCEPTION 'El usuario ya colabora como delegado en otro espacio de trabajo';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.unidades
    WHERE gestor_id = p_delegado_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'El usuario ya administra sus propias Unidades como Gestor';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.delegaciones
    WHERE delegado_id = p_delegado_id AND estado <> 'revocada'
  ) THEN
    RAISE EXCEPTION 'El usuario ya cuenta con una delegación activa o pendiente en el sistema';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invitaciones_delegados
    WHERE delegado_id = p_delegado_id AND estado = 'pendiente'
  ) THEN
    RAISE EXCEPTION 'Ya existe una invitación pendiente para este usuario';
  END IF;

  -- Insert single-use invitation with 7-day expiry using canonical email
  INSERT INTO public.invitaciones_delegados (
    gestor_id,
    delegado_id,
    email,
    email_snapshot,
    estado,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_uid,
    p_delegado_id,
    v_canonical_email,
    v_canonical_email,
    'pendiente',
    v_now + INTERVAL '7 days',
    v_now,
    v_now
  ) RETURNING id INTO v_inv_id;

  -- Insert durable in-app notification intent
  INSERT INTO public.notificaciones (
    usuario_id,
    tipo,
    referencia_id,
    titulo,
    mensaje,
    created_at
  ) VALUES (
    p_delegado_id,
    'invitacion_delegado',
    v_inv_id,
    'Nueva invitación de Delegado',
    'Has recibido una invitación para colaborar como Delegado en Rendo.',
    v_now
  );

  -- Insert durable email outbox intent using canonical email
  INSERT INTO public.email_delivery_outbox (
    recipient_user_id,
    recipient_email,
    template_key,
    payload,
    reference_type,
    reference_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_delegado_id,
    v_canonical_email,
    'delegado_invitation',
    jsonb_build_object(
      'invitation_id', v_inv_id,
      'gestor_id', v_uid,
      'email', v_canonical_email
    ),
    'invitacion_delegado',
    v_inv_id,
    'pending',
    v_now,
    v_now
  );

  -- Insert action log atomically
  INSERT INTO public.log_acciones (
    gestor_id,
    actor_id,
    actor_rol,
    accion,
    recurso_tipo,
    recurso_id,
    metadata,
    created_at
  ) VALUES (
    v_uid,
    v_uid,
    'gestor',
    'crear_invitacion',
    'invitacion',
    v_inv_id,
    jsonb_build_object(
      'delegado_id', p_delegado_id,
      'email', v_canonical_email
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_inv_id,
    'gestor_id', v_uid,
    'delegado_id', p_delegado_id,
    'email_snapshot', v_canonical_email,
    'estado', 'pendiente',
    'expires_at', v_now + INTERVAL '7 days',
    'created_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Preferred public 1-arg signature
CREATE OR REPLACE FUNCTION public.create_delegado_invitation(
  p_delegado_id UUID
)
RETURNS JSONB AS $$
  SELECT public.create_delegado_invitation(p_delegado_id, NULL::TEXT);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Explicit function privilege inventory: revoke default public/anon execution on sensitive helpers and RPCs
REVOKE EXECUTE ON FUNCTION public.is_gestor_owner(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_unidad(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_unidad(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_create_unidad(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_grupo(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_grupo(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_grupo_membership(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_alquiler(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_alquiler(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_inquilino(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_inquilino(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_delegado_invitation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_delegado_invitation(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_delegado_invitation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_delegado_invitation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_delegado_invitation(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.configure_delegacion(UUID, TEXT, TEXT, UUID, UUID[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_delegacion(UUID) FROM PUBLIC, anon;

-- Explicitly grant only minimum required helper and RPC functions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.is_gestor_owner(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_unidad(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_unidad(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_unidad(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_grupo(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_grupo(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_grupo_membership(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_alquiler(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_alquiler(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_inquilino(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_inquilino(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_delegado_invitation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_delegado_invitation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_delegado_invitation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_delegado_invitation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_delegado_invitation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.configure_delegacion(UUID, TEXT, TEXT, UUID, UUID[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_delegacion(UUID) TO authenticated, service_role;


