-- Agregar columna para la expiración de la suscripción (renovación manual de 30 días)
ALTER TABLE public.users
ADD COLUMN suscripcion_expira_en TIMESTAMPTZ;
