-- Auditoría de cambios en calificaciones.
-- Equivalente a la colección `auditoria_calificaciones` de SIDEC Firestore.
-- Se registra cada vez que un maestro modifica una calificación ya guardada.
-- Permite al director y supervisor ver quién cambió qué y cuándo.

CREATE TABLE IF NOT EXISTS public.auditoria_calificaciones (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  editor_id        uuid        REFERENCES public.usuarios(id),
  editor_nombre    text        NOT NULL,
  alumno_nombre    text        NOT NULL,
  campo            text        NOT NULL CHECK (campo IN ('lenguajes','saberes','etica','humanos')),
  valor_anterior   numeric(4,1),
  valor_nuevo      numeric(4,1),
  trimestre        smallint    NOT NULL CHECK (trimestre IN (0,1,2,3)),
  ciclo_escolar    text        NOT NULL DEFAULT '2025-2026',
  escuela_id       uuid        NOT NULL REFERENCES public.escuelas(id),
  zona_id          text        NOT NULL REFERENCES public.zonas(id),
  fecha            timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.auditoria_calificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria: superadmin ve todo"
  ON public.auditoria_calificaciones FOR ALL
  USING (public.get_mi_rol() = 'superadmin');

CREATE POLICY "auditoria: supervisor ve su zona"
  ON public.auditoria_calificaciones FOR SELECT
  USING (
    zona_id = public.get_mi_zona_id()
    AND public.get_mi_rol() = 'supervisor'
  );

CREATE POLICY "auditoria: director ve su escuela"
  ON public.auditoria_calificaciones FOR SELECT
  USING (
    escuela_id = public.get_mi_escuela_id()
    AND public.get_mi_rol() = 'director'
  );

-- Maestro solo puede insertar (no editar ni borrar su auditoría)
CREATE POLICY "auditoria: maestro registra cambios de su escuela"
  ON public.auditoria_calificaciones FOR INSERT
  WITH CHECK (
    escuela_id IN (
      SELECT escuela_id FROM public.usuarios WHERE id = auth.uid()
    )
    AND public.get_mi_rol() = 'maestro'
  );
