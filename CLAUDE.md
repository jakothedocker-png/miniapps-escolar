# CLAUDE.md — Miniapps Escolar
> Este archivo es leído automáticamente por Claude Code al abrir este proyecto.
> NO modificar sin autorización de Jakousi Montiel Gómez.

---

## Qué es este proyecto

**Miniapps Escolar** es una plataforma web multizona de captura de calificaciones con generación de observaciones por IA para maestros de educación primaria en México. Es un producto comercial bajo la marca **Miniapps** (JakoSoft).

- URL producción: `https://calificaciones.miniapps.com.mx`
- Hosting: Vercel
- Base de datos: Supabase (PostgreSQL)
- IA: DeepSeek API (`deepseek-chat`) — cliente propio en `lib/ia/client.ts`
- Referencia completa: `MEMORIA_MINIAPPS_ESCOLAR.md`

---

## Stack obligatorio

```
Next.js 14 (App Router)
Tailwind CSS
Supabase (@supabase/supabase-js)
DeepSeek API (fetch directo, sin SDK — lib/ia/client.ts)
SheetJS (xlsx)
Framer Motion
Lucide React
Recharts
```

---

## Reglas absolutas

### Seguridad
- `DEEPSEEK_API_KEY` **NUNCA** en el cliente. Solo en Route Handlers (`/app/api/`)
- `SUPABASE_SERVICE_ROLE_KEY` **NUNCA** en el cliente. Solo en server-side
- Toda llamada a la API de IA va a través de `/app/api/ia/observaciones/route.ts`
- **NUNCA** enviar datos de identificación del alumno (nombre, CURP) al proveedor de IA — la política de privacidad lo prohíbe
- RLS de Supabase es la capa de seguridad de datos — no filtrar por zona en el cliente

### Base de datos
- **NUNCA** hacer queries sin RLS activo en tablas de negocio
- Usar siempre el cliente Supabase del servidor para operaciones admin
- El campo `zona_id` es obligatorio en toda tabla de negocio — sin excepción
- El CCT es la llave única de agrupación de escuelas (`UNIQUE` en tabla `escuelas`)
- Usar extensión `fuzzystrmatch` para comparar CCTs similares (Levenshtein ≤ 2)

### Arquitectura
- Todo en App Router de Next.js 14 — no usar Pages Router
- Server Components por defecto — Client Components solo cuando hay interactividad
- Route Handlers para toda operación con datos sensibles o llamadas a APIs externas

---

## Estructura de carpetas

```
/app
  /(public)/          → rutas públicas (landing, auth)
  /(maestro)/app/     → dashboard maestro (requiere sesión + licencia)
  /(director)/director/ → dashboard director
  /(supervisor)/supervisor/ → dashboard supervisor
  /(dev)/dev/         → Dev Console (solo superadmin)
  /api/               → Route Handlers (server-side only)
    /ia/observaciones/ → generación IA
    /escuelas/buscar/  → fuzzy matching CCT
    /licencias/        → gestión de licencias
/components/
  /ui/                → componentes base (botones, inputs, cards)
  /tablas/            → DataTable con paginación, filtros, export Excel
  /forms/             → formularios con validación en tiempo real
  /charts/            → gráficas con Recharts
/lib/
  /supabase/          → clientes supabase (server y client)
  /ia/                → cliente DeepSeek y prompts de IA
  /excel/             → utilidades SheetJS
  /utils/             → helpers generales
/types/               → tipos TypeScript de todas las entidades
```

---

## Roles y verificación

```typescript
type Rol = 'superadmin' | 'supervisor' | 'director' | 'maestro'
```

### Auth guard obligatorio en toda ruta protegida

```typescript
// Orden de verificación (no cambiar el orden)
1. ¿Sesión activa?          → si no: redirect('/auth/login')
2. ¿Rol correcto?           → si no: redirect a su nivel
3. ¿Licencia vigente?       → si no: redirect('/licencia-vencida')
4. ¿Zona activa?            → si no: pantalla informativa
```

---

## Flujo de registro de maestro (fuzzy CCT)

```typescript
// Al escribir CCT (debounce 500ms):
// 1. Query a /api/escuelas/buscar con el CCT ingresado
// 2. Backend ejecuta: SELECT ... WHERE levenshtein(cct, $1) <= 2
// 3. Si distancia = 0 → autoselección silenciosa
// 4. Si distancia 1-2 → mostrar sugerencia con confirmación
// 5. Si sin resultado → captura manual, crear nueva escuela
```

---

## Generación de observaciones IA

```typescript
// POST /api/ia/observaciones
// Body: { alumno_id, trimestre, ciclo }
// Proceso:
// 1. Verificar sesión, rol maestro, licencia vigente
// 2. Consultar calificaciones del alumno en Supabase
// 3. Construir prompt con contexto educativo mexicano (Plan 2022 NEM)
// 4. Llamar DeepSeek API — respuesta en JSON con 8 observaciones
//    (2 por cada uno de los 4 campos formativos)
// 5. Guardar en tabla `observaciones` con tokens_usados
// 6. Retornar al cliente

// Campos formativos (Plan 2022 NEM):
// - Lenguajes
// - Saberes y Pensamiento Científico
// - Ética Naturaleza y Sociedades
// - De lo Humano y lo Comunitario
```

---

## Excel import/export

- Usar **SheetJS** para toda operación Excel — sin otras bibliotecas
- Las plantillas se generan dinámicamente desde el schema — no son archivos estáticos
- Vista previa obligatoria antes de importar (verde = válido, rojo = error con descripción)
- Todo módulo con datos tiene botón "Exportar Excel" — sin excepciones
- Metadatos en toda exportación: fecha, usuario, zona, filtros activos

---

## UI/UX obligatorio

- **Mobile-first**: toda vista funciona en celular
- **Modo claro y oscuro**: obligatorio, implementar con CSS variables
- **Skeleton screens**: nunca spinners genéricos en loading states
- **Toast notifications**: esquina superior derecha, auto-dismiss 4s (error: persistente)
- **Acciones destructivas**: siempre modal de confirmación con texto explícito
- **Tablas**: paginadas (25 por defecto), búsqueda global, filtros por columna
- **Formularios**: validación en tiempo real, autosave cuando aplique
- **Animaciones**: Framer Motion con spring physics — nunca `ease-linear`
- **Bordes**: `border-radius` generoso (estética iPadOS)

---

## Modelo de precios (referencia para lógica de licencias)

| Plan | MXN | Duración | Alumnos máx |
|------|-----|----------|-------------|
| Trial | $0 | 15 días | 10 |
| Trimestral básico | $95 | 1 trimestre | 30 |
| Trimestral plus | $120 | 1 trimestre | 45 |
| Trimestral premium | $150 | 1 trimestre | ilimitado |
| Anual básico | $250 | ciclo completo | 30 |
| Anual plus | $320 | ciclo completo | 45 |
| Anual premium | $400 | ciclo completo | ilimitado |

- Período de gracia: 7 días en modo solo-lectura al vencer
- Datos **NUNCA** se eliminan por vencimiento

---

## Branding

- Nombre: **Miniapps Escolar**
- Footer: `"Desarrollado por Miniapps — JakoSoft © 2026"`
- Soporte: `https://wa.me/5272222478493`
- Configurable por zona: `mostrar_jakosoft` (boolean en tabla `zonas`)

---

## Lo que NO se hace en v1

- ❌ App móvil nativa
- ❌ Integración de pagos automática (Stripe)
- ❌ Módulo de asistencias
- ❌ Boletas con firma digital
- ❌ App para padres
- ❌ Integración SISAT/SEP
- ❌ Algolia (usar PostgreSQL full-text hasta 5,000+ escuelas)

---

## Comandos del proyecto

```bash
npm run dev          # desarrollo local
npm run build        # build de producción
npm run lint         # verificar código
npx supabase start   # Supabase local (requiere Docker)
npx supabase db push # aplicar migraciones
```

---

## Referencia completa

Ver `MEMORIA_MINIAPPS_ESCOLAR.md` para:
- Schema completo de Supabase con SQL
- Políticas RLS detalladas
- Flujos de usuario por rol
- Decisiones técnicas y su justificación
- Roadmap post v1
