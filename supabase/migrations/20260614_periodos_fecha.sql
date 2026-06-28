-- Reemplaza fecha_cuadro por fechas individuales por periodo
ALTER TABLE public.escuelas
  DROP COLUMN IF EXISTS fecha_cuadro,
  ADD COLUMN IF NOT EXISTS fecha_diagnostico  date,
  ADD COLUMN IF NOT EXISTS fecha_trimestre_1  date,
  ADD COLUMN IF NOT EXISTS fecha_trimestre_2  date,
  ADD COLUMN IF NOT EXISTS fecha_trimestre_3  date;
