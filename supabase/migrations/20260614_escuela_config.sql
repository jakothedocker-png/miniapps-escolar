-- Agrega campos de configuración de reporte a la tabla escuelas
ALTER TABLE public.escuelas
  ADD COLUMN IF NOT EXISTS comunidad    text,
  ADD COLUMN IF NOT EXISTS estado       text DEFAULT 'Estado de México',
  ADD COLUMN IF NOT EXISTS fecha_cuadro date;
