-- Licencia basada en periodos específicos (no ventana de tiempo)
-- Un maestro que pagó 'trimestre_1' solo puede capturar T1,
-- sin importar si el calendario escolar se mueve.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS licencia_ciclo    text DEFAULT '2025-2026',
  ADD COLUMN IF NOT EXISTS licencia_periodos text[] DEFAULT '{}';

-- Usuarios legacy: ciclo activo con acceso a todos los periodos
UPDATE public.usuarios
SET licencia_ciclo    = '2025-2026',
    licencia_periodos = ARRAY['diagnostico','trimestre_1','trimestre_2','trimestre_3']
WHERE licencia_plan = 'legacy';

-- Trial: solo diagnóstico para capturar
UPDATE public.usuarios
SET licencia_ciclo    = '2025-2026',
    licencia_periodos = ARRAY['diagnostico']
WHERE licencia_plan = 'trial';
