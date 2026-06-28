-- Director configurable por periodo y ciclo escolar activo
ALTER TABLE public.escuelas
  ADD COLUMN IF NOT EXISTS ciclo_activo          text DEFAULT '2025-2026',
  ADD COLUMN IF NOT EXISTS director_diagnostico  text,
  ADD COLUMN IF NOT EXISTS director_trimestre_1  text,
  ADD COLUMN IF NOT EXISTS director_trimestre_2  text,
  ADD COLUMN IF NOT EXISTS director_trimestre_3  text;
