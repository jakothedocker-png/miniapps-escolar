-- Licencia por usuario (acceso pagado individual)
-- Las zonas y escuelas son siempre completas — el pago es por acceso del usuario.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS licencia_plan  text NOT NULL DEFAULT 'trial'
                            CHECK (licencia_plan IN ('legacy','trial','trimestre','anual')),
  ADD COLUMN IF NOT EXISTS licencia_vence timestamptz;

-- Usuarios existentes de zona legacy quedan en 'legacy' (sin vencimiento)
UPDATE public.usuarios u
SET licencia_plan = 'legacy'
WHERE zona_id IN (SELECT id FROM public.zonas WHERE plan = 'legacy');
