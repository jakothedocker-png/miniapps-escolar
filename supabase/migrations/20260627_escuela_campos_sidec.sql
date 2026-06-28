-- Agrega campos de escuela que SIDEC original registra y que faltan en el schema.
-- Son necesarios para exportaciones Excel (aprovechamiento) y filtros por organización.

ALTER TABLE public.escuelas
  ADD COLUMN IF NOT EXISTS sector           text,                   -- ej: "Sector 8"
  ADD COLUMN IF NOT EXISTS organizacion     text,                   -- ej: "Zona 040"
  ADD COLUMN IF NOT EXISTS tipo_organizacion text                   -- unitaria | bidocente | tridocente | completa | multigrado
    CHECK (tipo_organizacion IN (
      'unitaria','bidocente','tridocente','completa','multigrado'
    ));
