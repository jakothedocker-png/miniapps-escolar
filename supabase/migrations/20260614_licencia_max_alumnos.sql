-- Límite de alumnos por plan contratado
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS licencia_max_alumnos integer;  -- null = ilimitado (legacy / premium)

-- Trial (diagnóstico gratuito): sin límite de alumnos para no frenar la adopción
-- El límite aplica solo cuando contratan un plan de pago
