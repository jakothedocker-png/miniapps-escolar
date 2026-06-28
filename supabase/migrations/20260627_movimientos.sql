-- Módulo de Movimientos de Alumnos: altas, bajas y traslados.
-- Equivalente a la colección `movimientos` de SIDEC Firestore.
-- En el modelo bottom-up: el maestro registra el movimiento de su alumno;
-- el director y supervisor pueden consultarlo.

CREATE TABLE IF NOT EXISTS public.movimientos (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo             text        NOT NULL CHECK (tipo IN ('alta','baja','traslado')),
  alumno_nombre    text        NOT NULL,
  curp             text,
  motivo           text,
  autorizo_nombre  text,                               -- quién autorizó el movimiento
  registrado_por   uuid        REFERENCES public.usuarios(id),
  fecha            timestamptz NOT NULL DEFAULT now(),
  cct              text        NOT NULL,
  escuela_id       uuid        NOT NULL REFERENCES public.escuelas(id),
  zona_id          text        NOT NULL REFERENCES public.zonas(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimientos: superadmin ve todo"
  ON public.movimientos FOR ALL
  USING (public.get_mi_rol() = 'superadmin');

CREATE POLICY "movimientos: supervisor ve su zona"
  ON public.movimientos FOR SELECT
  USING (
    zona_id = public.get_mi_zona_id()
    AND public.get_mi_rol() = 'supervisor'
  );

CREATE POLICY "movimientos: director ve su escuela"
  ON public.movimientos FOR SELECT
  USING (
    escuela_id = public.get_mi_escuela_id()
    AND public.get_mi_rol() = 'director'
  );

-- El maestro puede ver y registrar movimientos de su escuela
CREATE POLICY "movimientos: maestro gestiona los de su escuela"
  ON public.movimientos FOR ALL
  USING (
    escuela_id IN (
      SELECT escuela_id FROM public.usuarios WHERE id = auth.uid()
    )
    AND public.get_mi_rol() = 'maestro'
  );
