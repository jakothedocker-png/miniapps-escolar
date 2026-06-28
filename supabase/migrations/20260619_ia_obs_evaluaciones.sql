-- Almacena el par de observaciones generadas por IA por campo formativo
-- y el contador de usos para bloquear el botón Generar después de 2 usos.
ALTER TABLE public.evaluaciones
  ADD COLUMN IF NOT EXISTS ia_obs_lenguajes  jsonb,
  ADD COLUMN IF NOT EXISTS ia_obs_saberes    jsonb,
  ADD COLUMN IF NOT EXISTS ia_obs_etica      jsonb,
  ADD COLUMN IF NOT EXISTS ia_obs_humanos    jsonb,
  ADD COLUMN IF NOT EXISTS ia_usos_lenguajes smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ia_usos_saberes   smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ia_usos_etica     smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ia_usos_humanos   smallint NOT NULL DEFAULT 0;
