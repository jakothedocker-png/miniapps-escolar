# Arquitectura — Miniapps Escolar

## Identidad del producto
Plataforma SaaS multi-tenant de gestión escolar para docentes de educación primaria en México.
- **Marca:** Miniapps (JakoSoft)
- **URL producción:** https://calificaciones.miniapps.com.mx
- **Hosting:** Vercel
- **Base de datos:** Supabase (PostgreSQL + RLS)
- **Autenticación:** Supabase Auth
- **IA:** Kimi — modelo `moonshot-v1-8k` vía API de Moonshot AI Internacional
- **Desarrollador:** Mtro. Jako (jakousi.montiel@gmail.com)

---

## Modelo de negocio
**Bottom-up data construction:** Los maestros pagan, capturan datos y construyen la base de datos de su escuela. El director paga para consultar esos datos. El supervisor/asesor paga para ver datos de toda la zona.

| Actor | Rol | Construye | Consulta |
|-------|-----|-----------|---------|
| Maestro | `maestro` | Sus alumnos y calificaciones | Solo su grupo |
| Director | `director` | — | Toda su escuela |
| Supervisor/ATP | `supervisor` | — | Toda la zona |
| Superadmin | `superadmin` | Configura el sistema | Todo |

---

## Stack tecnológico
- **Framework:** Next.js 14 (App Router)
- **Estilos:** Tailwind CSS + estilos inline (sistema Deepin light)
- **UI:** Lucide React (iconos), Recharts (gráficas), Framer Motion (animaciones)
- **DB:** Supabase PostgreSQL con RLS
- **Excel:** SheetJS (xlsx v0.18.5) — generado en el servidor (Route Handlers)
- **PDF/Kardex:** HTML + CSS generado en servidor, impresión vía `window.print()`

---

## Sistema de diseño: Deepin Light
Aplicado en 2026-06-27 a todo el sistema.

| Token | Valor |
|-------|-------|
| Fondo página | `#F5F8FF` / `linear-gradient(150deg, #EEF4FC, #F5F8FF, #EAF0FA)` |
| Card | `#FFFFFF` · borde `rgba(6,135,216,0.12)` · sombra `0 4px 24px rgba(30,45,61,0.08)` |
| Primario (Deepin blue) | `#0687D8` |
| Texto primario | `#1E2D3D` |
| Texto secundario | `#64748B` |
| Texto muted | `#94A3B8` |
| Hover item | `rgba(6,135,216,0.05)` |
| Activo nav | fondo `rgba(6,135,216,0.12)` · texto `#0687D8` · borde izq `3px solid #0687D8` |
| Botón primario | `linear-gradient(135deg, #0687D8, #0569B0)` |
| Focus input | `border #0687D8` + ring `rgba(6,135,216,0.12)` |
| Badge éxito | fondo `#EFF9F0` · texto `#15803D` |
| Badge alerta | fondo `#FFFBEB` · texto `#B45309` |
| Badge error | fondo `#FEF2F2` · texto `#DC2626` |

---

## Estructura de carpetas
```
plataforma_MINIAPPS_ESCOLAR/
├── app/
│   ├── (public)/auth/          — login, registro, recuperar, callback
│   ├── (public)/               — privacidad, licencia-vencida, upgrade
│   ├── (maestro)/app/          — dashboard, grupos, alumnos, calificaciones,
│   │                             observaciones, reportes, riesgo, configuracion
│   ├── (director)/director/    — escuela, reportes, riesgo
│   ├── (supervisor)/supervisor/— dashboard, reportes, riesgo
│   ├── (dev)/dev/              — dashboard, usuarios, zonas, logs-ia
│   └── api/
│       ├── ia/observaciones/   — genera observaciones con Kimi
│       ├── escuelas/buscar/    — búsqueda fuzzy por CCT
│       ├── reportes/excel/     — exportación Excel multi-período
│       ├── reportes/kardex/    — kardex individual HTML imprimible
│       └── reportes/cuadro-general/ — cuadro general HTML imprimible
├── components/
│   ├── maestro/MaestroSidebar.tsx
│   ├── director/DirectorSidebar.tsx
│   ├── supervisor/SupervisorSidebar.tsx
│   ├── dev/DevSidebar.tsx
│   ├── charts/GraficaPromedios.tsx
│   └── ui/Modal.tsx
├── lib/
│   ├── supabase/client.ts      — anon key (respeta RLS)
│   ├── supabase/server.ts      — service role (bypass RLS, solo server)
│   └── anthropic/client.ts     — cliente Kimi (nombre engañoso, es Moonshot)
├── app/actions/                — Server Actions (auth, alumnos, grupos, calificaciones)
├── supabase/
│   ├── schema.sql              — schema base completo
│   └── migrations/             — migraciones por fecha
└── memoria/                    — este directorio
```

---

## Schema de base de datos (Supabase)

### Tablas principales
| Tabla | Descripción |
|-------|-------------|
| `zonas` | Tenant principal — zona escolar completa |
| `usuarios` | Espejo de auth.users + rol + licencia |
| `escuelas` | CCT, nombre, municipio, turno, sector, organización, tipo_organización |
| `grupos` | Aula de un maestro: grado + grupo + ciclo |
| `alumnos` | Estudiantes vinculados a un grupo |
| `evaluaciones` | Calificaciones por alumno por trimestre (0=Diag, 1, 2, 3) |
| `movimientos` | Altas, bajas y traslados de alumnos |
| `auditoria_calificaciones` | Cambios de calificaciones con editor y valor anterior/nuevo |
| `logs_ia` | Registro de uso de IA (modelo, tokens, costo) |

### Períodos de evaluación
| Valor | Nombre |
|-------|--------|
| 0 | Diagnóstico |
| 1 | 1er Trimestre |
| 2 | 2do Trimestre |
| 3 | 3er Trimestre |

### Campos formativos (Plan 2022 NEM)
- `lenguajes` — Lenguajes
- `saberes` — Saberes y Pensamiento Científico
- `etica` — Ética, Naturaleza y Sociedades
- `humanos` — De lo Humano y lo Comunitario

### Migraciones aplicadas
| Fecha | Archivo | Qué hace |
|-------|---------|----------|
| 2026-06-14 | `escuela_config.sql` | Campos de config a escuelas |
| 2026-06-14 | `periodos_fecha.sql` | Fechas de períodos a escuelas |
| 2026-06-14 | `director_ciclo.sql` | ciclo_activo a escuelas |
| 2026-06-14 | `licencia_usuario.sql` | Campos de licencia a usuarios |
| 2026-06-14 | `licencia_periodos.sql` | licencia_ciclo y licencia_periodos (array) |
| 2026-06-14 | `licencia_max_alumnos.sql` | licencia_max_alumnos a usuarios |
| 2026-06-19 | `ia_obs_evaluaciones.sql` | ia_obs_* y ia_usos_* a evaluaciones |
| 2026-06-27 | `periodo_diagnostico.sql` | Habilita trimestre=0 (Diagnóstico) |
| 2026-06-27 | `escuela_campos_sidec.sql` | sector, organizacion, tipo_organizacion |
| 2026-06-27 | `movimientos.sql` | Nueva tabla movimientos + RLS |
| 2026-06-27 | `auditoria_calificaciones.sql` | Nueva tabla auditoría + RLS |

---

## Reglas de seguridad (RLS)
- RLS activo en todas las tablas de negocio
- `get_mi_zona_id()`, `get_mi_rol()`, `get_mi_escuela_id()` — funciones helper para políticas
- Patrón: cada tabla tiene políticas por cada rol (superadmin, supervisor, director, maestro)
- `createAdminClient()` (service role) — solo en server-side, bypasea RLS

---

## Modelo de licencias
| Plan | Precio | Alumnos | Períodos IA |
|------|--------|---------|-------------|
| Trial | $0 / 15 días | 10 | 2 obs totales en T1 |
| Trimestral básico | $95 MXN | 30 | T1 |
| Trimestral plus | $120 MXN | 45 | T1+T2 |
| Trimestral premium | $150 MXN | ilimitado | T1+T2+T3 ilimitado |
| Anual básico | $250 MXN | 30 | Todos |
| Anual plus | $320 MXN | 45 | Todos |
| Anual premium | $400 MXN | ilimitado | Todos ilimitado |

---

## Decisiones técnicas
| Decisión | Razón | Fecha |
|----------|-------|-------|
| Supabase sobre Firebase | Multi-tenant con RLS nativo; queries SQL para reportes; costo fijo $25/mes | 2026-06-27 |
| Next.js App Router | Server Components por defecto; Route Handlers para APIs sensibles y IA | inicio |
| Kimi sobre Anthropic | Costo menor para uso masivo de observaciones por docentes | 2026-06 |
| Excel generado en servidor | Evita exponer lógica de negocio en cliente; datos filtrados por RLS | inicio |
| Kardex como HTML imprimible | No requiere librerías PDF pesadas; el navegador imprime nativamente | inicio |
| trimestre=0 para Diagnóstico | Consistencia con SIDEC; los 4 períodos en una sola columna entero | 2026-06-27 |
| Período activo: el maestro decide | Maestros pagan individualmente; sin control externo hasta que lleguen directores | 2026-06-27 |
| Bottom-up construction | Maestros construyen la BD; director/supervisor solo consultan | 2026-06-27 |
