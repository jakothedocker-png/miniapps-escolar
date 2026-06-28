-- Agrega el período de Diagnóstico (0) a evaluaciones.
-- SIDEC usa 4 períodos: 0=Diagnóstico, 1=1er Trim, 2=2do Trim, 3=3er Trim.
-- El schema original solo permitía 1,2,3 — lo que bloqueaba capturar diagnóstico.

-- 1. Eliminar constraint anterior
ALTER TABLE public.evaluaciones
  DROP CONSTRAINT IF EXISTS evaluaciones_trimestre_check;

-- 2. Agregar constraint corregido con 0 incluido
ALTER TABLE public.evaluaciones
  ADD CONSTRAINT evaluaciones_trimestre_check
  CHECK (trimestre IN (0,1,2,3));

-- Nota: el mapeo con licencia_periodos (text array) es:
-- 'diagnostico' → trimestre = 0
-- 'trimestre_1' → trimestre = 1
-- 'trimestre_2' → trimestre = 2
-- 'trimestre_3' → trimestre = 3
