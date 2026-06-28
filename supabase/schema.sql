-- ============================================================
-- Miniapps Escolar — Schema inicial
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

-- Zonas (tenants)
create table public.zonas (
  id                text primary key,           -- ej: "zona_040"
  nombre            text not null,
  estado            text not null,
  contacto_admin    jsonb,
  plan              text not null default 'trial'
                    check (plan in ('legacy','trial','trimestre','anual')),
  licencia_vence    timestamptz,
  ia_habilitada     boolean not null default false,
  ia_plan           text not null default 'prueba'
                    check (ia_plan in ('legacy','prueba','trimestre','anual')),
  ia_vence          timestamptz,
  ia_usos_prueba    integer not null default 0,
  pagos_requeridos  boolean not null default true,
  estatus           text not null default 'trial'
                    check (estatus in ('activo','suspendido','trial','vencido')),
  mostrar_jakosoft  boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Usuarios (espejo de auth.users)
create table public.usuarios (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre          text not null,
  email           text not null,
  zona_id         text references public.zonas(id),
  escuela_id      uuid,                         -- null para superadmin/supervisor
  rol             text not null
                  check (rol in ('superadmin','supervisor','director','maestro')),
  estatus         text not null default 'activo'
                  check (estatus in ('activo','inactivo','suspendido')),
  licencia_plan        text not null default 'trial'
                       check (licencia_plan in ('legacy','trial','trimestre','anual')),
  licencia_vence       timestamptz,              -- null = sin vencimiento (legacy)
  licencia_max_alumnos integer,                  -- null = ilimitado; 30 | 45 para planes básico/plus
  ia_usos_prueba  integer not null default 0,
  ia_usos_hoy     integer not null default 0,
  ia_usos_hoy_fecha date,
  ultimo_acceso   timestamptz,
  created_at      timestamptz not null default now()
);

-- Escuelas
create table public.escuelas (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  cct         text not null,
  zona_id     text not null references public.zonas(id),
  director_id uuid references public.usuarios(id),
  municipio              text,
  comunidad              text,
  estado                 text default 'Estado de México',
  ciclo_activo           text default '2025-2026',
  fecha_diagnostico      date,
  fecha_trimestre_1      date,
  fecha_trimestre_2      date,
  fecha_trimestre_3      date,
  director_diagnostico   text,
  director_trimestre_1   text,
  director_trimestre_2   text,
  director_trimestre_3   text,
  turno                  text,
  estatus      text not null default 'activo',
  created_at  timestamptz not null default now(),
  unique (cct, zona_id)
);

-- Grupos
create table public.grupos (
  id             uuid primary key default uuid_generate_v4(),
  grado          text not null,                -- "1°" | "2°" | ... | "6°"
  grupo          text not null default 'A',    -- "A" | "B" | "Único"
  maestro_id     uuid references public.usuarios(id),
  escuela_id     uuid not null references public.escuelas(id),
  zona_id        text not null references public.zonas(id),
  ciclo_escolar  text not null default '2025-2026',
  tipo           text not null default 'regular'
                 check (tipo in ('regular','multigrado')),
  created_at     timestamptz not null default now()
);

-- Alumnos
create table public.alumnos (
  id               uuid primary key default uuid_generate_v4(),
  nombre           text not null,
  apellido_paterno text not null,
  apellido_materno text,
  curp             text,
  grupo_id         uuid references public.grupos(id),
  escuela_id       uuid not null references public.escuelas(id),
  zona_id          text not null references public.zonas(id),
  activo           boolean not null default true,
  deleted          boolean not null default false,    -- soft delete siempre
  created_at       timestamptz not null default now()
);

-- Evaluaciones (calificaciones por trimestre)
create table public.evaluaciones (
  id               uuid primary key default uuid_generate_v4(),
  alumno_id        uuid not null references public.alumnos(id),
  grupo_id         uuid not null references public.grupos(id),
  maestro_id       uuid not null references public.usuarios(id),
  trimestre        smallint not null check (trimestre in (1,2,3)),
  ciclo_escolar    text not null default '2025-2026',
  lenguajes        numeric(4,1) check (lenguajes between 0 and 10),
  saberes          numeric(4,1) check (saberes between 0 and 10),
  etica            numeric(4,1) check (etica between 0 and 10),
  humanos          numeric(4,1) check (humanos between 0 and 10),
  promedio_general numeric(4,1),
  inasistencias    smallint default 0,
  obs_lenguajes    text,
  obs_saberes      text,
  obs_etica        text,
  obs_humanos      text,
  escuela_id       uuid not null references public.escuelas(id),
  zona_id          text not null references public.zonas(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (alumno_id, trimestre, ciclo_escolar)
);

-- Observaciones (generadas por IA)
create table public.observaciones (
  id                       uuid primary key default uuid_generate_v4(),
  alumno_id                uuid not null references public.alumnos(id),
  grupo_id                 uuid not null references public.grupos(id),
  maestro_id               uuid not null references public.usuarios(id),
  trimestre                smallint not null check (trimestre in (1,2,3)),
  ciclo_escolar            text not null default '2025-2026',
  descripcion_maestro      text not null,
  observacion_1            text not null,
  observacion_2            text not null,
  observacion_seleccionada smallint check (observacion_seleccionada in (1,2)),
  texto_final              text,                  -- editable por el maestro antes de guardar
  generada_con_ia          boolean not null default true,
  tokens_usados            integer,
  escuela_id               uuid not null references public.escuelas(id),
  zona_id                  text not null references public.zonas(id),
  created_at               timestamptz not null default now(),
  unique (alumno_id, trimestre, ciclo_escolar)
);

-- Logs de IA (monitoreo de costos y uso)
create table public.logs_ia (
  id             uuid primary key default uuid_generate_v4(),
  maestro_id     uuid not null references public.usuarios(id),
  alumno_id      uuid references public.alumnos(id),
  zona_id        text not null references public.zonas(id),
  tokens_input   integer,
  tokens_output  integer,
  modelo         text,
  costo_usd      numeric(10,6),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- TRIGGER: updated_at en evaluaciones
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger evaluaciones_updated_at
  before update on public.evaluaciones
  for each row execute function public.set_updated_at();

-- ============================================================
-- FUNCIONES HELPER para RLS
-- ============================================================

create or replace function public.get_mi_zona_id()
returns text as $$
  select zona_id from public.usuarios where id = auth.uid()
$$ language sql security definer stable;

create or replace function public.get_mi_rol()
returns text as $$
  select rol from public.usuarios where id = auth.uid()
$$ language sql security definer stable;

create or replace function public.get_mi_escuela_id()
returns uuid as $$
  select escuela_id from public.usuarios where id = auth.uid()
$$ language sql security definer stable;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.zonas         enable row level security;
alter table public.usuarios      enable row level security;
alter table public.escuelas      enable row level security;
alter table public.grupos        enable row level security;
alter table public.alumnos       enable row level security;
alter table public.evaluaciones  enable row level security;
alter table public.observaciones enable row level security;
alter table public.logs_ia       enable row level security;

-- ZONAS
create policy "zonas: superadmin ve todo"
  on public.zonas for select
  using (public.get_mi_rol() = 'superadmin');

create policy "zonas: usuario ve su zona"
  on public.zonas for select
  using (id = public.get_mi_zona_id());

-- USUARIOS
create policy "usuarios: superadmin ve todo"
  on public.usuarios for all
  using (public.get_mi_rol() = 'superadmin');

create policy "usuarios: ve los de su zona"
  on public.usuarios for select
  using (zona_id = public.get_mi_zona_id());

create policy "usuarios: ve su propio perfil"
  on public.usuarios for select
  using (id = auth.uid());

create policy "usuarios: actualiza su propio perfil"
  on public.usuarios for update
  using (id = auth.uid());

-- ESCUELAS
create policy "escuelas: superadmin ve todo"
  on public.escuelas for all
  using (public.get_mi_rol() = 'superadmin');

create policy "escuelas: ve las de su zona"
  on public.escuelas for select
  using (zona_id = public.get_mi_zona_id());

create policy "escuelas: supervisor gestiona su zona"
  on public.escuelas for all
  using (
    zona_id = public.get_mi_zona_id()
    and public.get_mi_rol() = 'supervisor'
  );

-- GRUPOS
create policy "grupos: superadmin ve todo"
  on public.grupos for all
  using (public.get_mi_rol() = 'superadmin');

create policy "grupos: supervisor ve su zona"
  on public.grupos for select
  using (
    zona_id = public.get_mi_zona_id()
    and public.get_mi_rol() = 'supervisor'
  );

create policy "grupos: director ve su escuela"
  on public.grupos for select
  using (
    escuela_id = public.get_mi_escuela_id()
    and public.get_mi_rol() = 'director'
  );

create policy "grupos: maestro ve y edita sus grupos"
  on public.grupos for all
  using (
    maestro_id = auth.uid()
    and public.get_mi_rol() = 'maestro'
  );

-- ALUMNOS
create policy "alumnos: superadmin ve todo"
  on public.alumnos for all
  using (public.get_mi_rol() = 'superadmin');

create policy "alumnos: supervisor ve su zona"
  on public.alumnos for select
  using (
    zona_id = public.get_mi_zona_id()
    and public.get_mi_rol() = 'supervisor'
  );

create policy "alumnos: director ve su escuela"
  on public.alumnos for all
  using (
    escuela_id = public.get_mi_escuela_id()
    and public.get_mi_rol() = 'director'
  );

create policy "alumnos: maestro ve y edita sus alumnos"
  on public.alumnos for all
  using (
    grupo_id in (
      select id from public.grupos where maestro_id = auth.uid()
    )
    and public.get_mi_rol() = 'maestro'
  );

-- EVALUACIONES
create policy "evaluaciones: superadmin ve todo"
  on public.evaluaciones for all
  using (public.get_mi_rol() = 'superadmin');

create policy "evaluaciones: supervisor ve su zona"
  on public.evaluaciones for select
  using (
    zona_id = public.get_mi_zona_id()
    and public.get_mi_rol() = 'supervisor'
  );

create policy "evaluaciones: director ve su escuela"
  on public.evaluaciones for select
  using (
    escuela_id = public.get_mi_escuela_id()
    and public.get_mi_rol() = 'director'
  );

create policy "evaluaciones: maestro gestiona las suyas"
  on public.evaluaciones for all
  using (
    maestro_id = auth.uid()
    and public.get_mi_rol() = 'maestro'
  );

-- OBSERVACIONES
create policy "observaciones: superadmin ve todo"
  on public.observaciones for all
  using (public.get_mi_rol() = 'superadmin');

create policy "observaciones: supervisor ve su zona"
  on public.observaciones for select
  using (
    zona_id = public.get_mi_zona_id()
    and public.get_mi_rol() = 'supervisor'
  );

create policy "observaciones: director ve su escuela"
  on public.observaciones for select
  using (
    escuela_id = public.get_mi_escuela_id()
    and public.get_mi_rol() = 'director'
  );

create policy "observaciones: maestro gestiona las suyas"
  on public.observaciones for all
  using (
    maestro_id = auth.uid()
    and public.get_mi_rol() = 'maestro'
  );

-- LOGS IA
create policy "logs_ia: superadmin ve todo"
  on public.logs_ia for all
  using (public.get_mi_rol() = 'superadmin');

create policy "logs_ia: maestro ve los suyos"
  on public.logs_ia for select
  using (maestro_id = auth.uid());

-- ============================================================
-- DATO INICIAL: zona legacy (Zona 040 en el futuro si se integra)
-- Por ahora solo confirma que el schema funciona
-- ============================================================

-- insert into public.zonas (id, nombre, estado, plan, ia_habilitada, pagos_requeridos, estatus)
-- values ('zona_040', 'Sector Educativo No. 8 — SEIEM', 'Estado de México', 'legacy', true, false, 'activo');
