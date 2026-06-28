# CLAUDE.md — Boleta Inteligente (Miniapps Educación)

> Documento de referencia para el agente de desarrollo.
> Leer completo antes de escribir cualquier línea de código.
> Actualizado: Junio 2026

---

## 1. CONTEXTO DEL PROYECTO

### ¿Qué es esta plataforma?

Sistema de control escolar para educación primaria mexicana (NEM — Nueva Escuela Mexicana),
orientado a maestros, directores y administradores de zona. Resuelve dos dolores principales:

1. **Control de calificaciones** sin Excel roto — captura limpia, promedios automáticos, reportes imprimibles
2. **Generación de observaciones para boletas** con IA — el maestro describe al alumno y la IA genera el texto pedagógico listo para pegar en la boleta oficial

### Estado actual

- ✅ Plataforma funcionando en producción para una zona escolar
- ✅ Stack: React + Firebase (Firestore + Auth)
- ✅ Roles activos: Maestro, Director, Administrador de zona
- ✅ Identificador actual: `escuela_id` en todas las colecciones
- ✅ Login por maestro con credenciales generadas por el administrador
- ❌ No tiene multi-tenant (solo sirve a una zona)
- ❌ No tiene generación de observaciones con IA
- ❌ No tiene modelo de pagos ni licencias
- ❌ No tiene Superadmin (Dev Console)

### Lo que se va a construir en este sprint

En orden estricto de prioridad:

1. Migración a arquitectura multi-tenant (agregar `zona_id` + `tenant_id`)
2. Rol Superadmin + Dev Console básica
3. Generador de observaciones con IA (módulo de pago)
4. Sistema de licencias y planes
5. *(Fase posterior)* Chat de calificaciones en lenguaje natural

---

## 2. ARQUITECTURA MULTI-TENANT

### Jerarquía de datos

```
superadmin (Jako — JakoSoft)
  └── zonas (tenants)
        └── escuelas
              └── grupos
                    └── alumnos / calificaciones / observaciones
```

### Migración del modelo actual

Todas las colecciones que hoy tienen `escuela_id` deben agregar `zona_id`.
**No se elimina ningún dato existente.** La zona actual recibe `zona_id: "zona_040"`.

### Estructura Firestore

#### Colecciones globales (sin tenant_id)

```
/zonas/{zonaId}
  nombre: string                    // "Sector Educativo No. 8"
  estado: string                    // "Estado de México"
  contacto_admin: map               // nombre, email, teléfono
  plan: string                      // "legacy" | "trial" | "trimestre" | "anual"
  licencia_vence: timestamp | null  // null = nunca vence (plan legacy)
  ia_habilitada: boolean
  pagos_requeridos: boolean         // false solo para plan "legacy"
  estatus: string                   // "activo" | "suspendido" | "trial" | "vencido"
  created_at: timestamp

/usuarios/{userId}
  nombre: string
  email: string
  zona_id: string
  escuela_id: string | null         // null si es admin de zona o superadmin
  rol: string                       // "superadmin" | "admin_zona" | "director" | "maestro"
  estatus: string
  ultimo_acceso: timestamp
```

#### Colecciones de negocio (con zona_id obligatorio)

```
/zonas/{zonaId}/escuelas/{escuelaId}
  nombre: string
  cct: string                       // Clave del Centro de Trabajo
  zona_id: string                   // redundante pero necesario para queries
  director_id: string
  estatus: string
  created_at: timestamp

/zonas/{zonaId}/escuelas/{escuelaId}/grupos/{grupoId}
  grado: string                     // "1°" | "2°" | ... | "6°"
  grupo: string                     // "A" | "B" | "Único" (multigrado)
  maestro_id: string
  ciclo_escolar: string             // "2025-2026"
  tipo: string                      // "regular" | "multigrado"
  zona_id: string
  escuela_id: string

/zonas/{zonaId}/escuelas/{escuelaId}/alumnos/{alumnoId}
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  curp: string
  grupo_id: string
  activo: boolean
  deleted: boolean                  // soft delete SIEMPRE
  zona_id: string
  escuela_id: string

/zonas/{zonaId}/escuelas/{escuelaId}/calificaciones/{calId}
  alumno_id: string
  grupo_id: string
  maestro_id: string
  trimestre: number                 // 1 | 2 | 3
  ciclo_escolar: string
  campos_formativos: map            // { lenguajes: 8.5, matematicas: 9.0, ... }
  promedio_general: number
  zona_id: string
  escuela_id: string

/zonas/{zonaId}/escuelas/{escuelaId}/observaciones/{obsId}
  alumno_id: string
  grupo_id: string
  maestro_id: string
  trimestre: number
  ciclo_escolar: string
  descripcion_maestro: string       // texto libre que escribió el maestro
  observacion_1: string             // primera versión generada por IA
  observacion_2: string             // segunda versión generada por IA
  observacion_seleccionada: number  // 1 o 2
  generada_con_ia: boolean
  zona_id: string
  escuela_id: string
  created_at: timestamp
```

### Regla de oro

> **`zona_id` es obligatorio en TODAS las colecciones de negocio. Sin excepciones.**
> Las Firestore Security Rules deben filtrar por `zona_id` para que un tenant jamás acceda a datos de otro.

---

## 3. SISTEMA DE ROLES

| Rol | Alcance | Permisos |
|-----|---------|----------|
| `superadmin` | Global (JakoSoft) | Dev Console completa, todos los tenants, crear/suspender zonas |
| `admin_zona` | Su zona | Gestionar escuelas y usuarios de su zona, ver reportes globales de zona |
| `director` | Su escuela | Ver todos los alumnos y calificaciones de su escuela, alta/baja alumnos |
| `maestro` | Sus grupos | Capturar calificaciones, generar observaciones de sus alumnos únicamente |

### Auth Guards (verificar en este orden)

1. ¿Sesión activa? → Si no → `/auth/login`
2. ¿Rol correcto para la ruta? → Si no → su nivel correspondiente
3. ¿Zona activa (no suspendida)? → Si no → pantalla de zona suspendida
4. ¿Licencia vigente o plan legacy? → Si no → `/licencia-vencida`
5. ¿Módulo IA habilitado para esta zona? → Si no → mostrar CTA de upgrade, no error

---

## 4. PLAN LEGACY (Zona actual — Zona 040)

La zona que ya está en producción recibe trato especial permanente.

```javascript
// Documento en /zonas/zona_040
{
  zona_id: "zona_040",
  nombre: "Sector Educativo No. 8 — SEIEM",
  plan: "legacy",
  licencia_vence: null,       // nunca vence
  ia_habilitada: true,        // acceso completo a IA gratis
  pagos_requeridos: false,    // salta TODA la lógica de pagos
  estatus: "activo"
}
```

### Regla de negocio crítica

> Antes de mostrar cualquier pantalla de pago, límite de uso, o vencimiento,
> verificar `pagos_requeridos === false`. Si es false, saltar completamente
> toda la lógica de licencias. Esta zona es beta permanente y no debe
> ver nunca mensajes de cobro.

---

## 5. MODELO DE NEGOCIO Y PLANES

### Planes disponibles

| Plan | Precio | Duración | IA | Alumnos máx. |
|------|--------|----------|----|--------------|
| `legacy` | $0 | Permanente | ✅ Ilimitada | Ilimitados |
| `prueba` | $0 | 2 observaciones totales | ✅ Solo 2 usos | 1 alumno |
| `trimestre` | $69 MXN | 1 trimestre | ✅ Ilimitada | 50 alumnos |
| `anual` | $250 MXN | Ciclo escolar completo | ✅ Ilimitada | 50 alumnos |

### Flujo del maestro nuevo

```
1. Se registra o lo registra su admin_zona
2. Entra a la plataforma — ve sus alumnos y calificaciones normal
3. Al intentar generar observaciones → modo PRUEBA GRATIS
4. Genera 2 observaciones (1 alumno, 2 versiones) — ve la calidad completa
5. Para continuar → pantalla de upgrade con opciones:
     "Tercer trimestre — $69 MXN"  |  "Ciclo completo — $250 MXN"
6. Paga → acceso inmediato, ilimitado dentro de su plan
```

### Lógica de conteo de usos (plan prueba)

```javascript
// En el documento del usuario o de la zona
{
  ia_usos_prueba: number,     // contador, máximo 2
  ia_plan: string,            // "prueba" | "trimestre" | "anual"
  ia_vence: timestamp | null  // null si es legacy o prueba
}
```

### Campos en /zonas/{zonaId} para control de licencia IA

```javascript
{
  ia_plan: string,
  ia_vence: timestamp | null,
  ia_habilitada: boolean,
  ia_usos_prueba: number,     // solo aplica si ia_plan === "prueba"
  pagos_requeridos: boolean
}
```

---

## 6. MÓDULO DE IA — GENERADOR DE OBSERVACIONES

### Modelo de IA

**Claude Haiku 4.5** (`claude-haiku-4-5-20251001`)

- Costo: $1.00 input / $5.00 output por millón de tokens
- Costo real por observación: ~$0.00083 USD (~$0.014 MXN)
- Costo máximo por maestro/año (50 alumnos × 3 trimestres × 2 versiones): ~$0.25 USD (~$4.25 MXN)
- Margen por maestro con plan anual $250 MXN: **98.3%**

### System Prompt (EXACTO — no modificar sin aprobación)

```
Eres un asistente pedagógico especializado en educación primaria mexicana 
bajo la Nueva Escuela Mexicana (NEM). Tu función es redactar observaciones 
para boletas de calificaciones.

Reglas estrictas:
- Máximo 500 caracteres por observación (límite del sistema oficial SEP)
- Lenguaje formal, empático y orientado al desarrollo integral del alumno
- NUNCA uses lenguaje negativo directo — transforma debilidades en áreas de oportunidad
- NUNCA uses frases genéricas vacías como "es un buen alumno"
- Cada observación debe ser específica a lo que el maestro describió
- Menciona logros concretos y recomendaciones de mejora concretas
- Tono: profesional pero cálido, apropiado para que los padres lo lean

Cuando generes observaciones, genera exactamente 2 versiones diferentes.
Devuelve SOLO un JSON con este formato, sin texto adicional:
{
  "observacion_1": "texto de la primera versión",
  "observacion_2": "texto de la segunda versión"
}
```

### Flujo de implementación

```javascript
// Cloud Function o llamada directa desde el cliente (con API key en backend)

async function generarObservaciones(descripcionMaestro, datosAlumno) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT, // el prompt definido arriba
      messages: [{
        role: "user",
        content: `Alumno: ${datosAlumno.nombre}, ${datosAlumno.grado}°grado
Trimestre: ${datosAlumno.trimestre}
Descripción del maestro: ${descripcionMaestro}`
      }]
    })
  });

  const data = await response.json();
  const texto = data.content[0].text;
  return JSON.parse(texto); // { observacion_1: "...", observacion_2: "..." }
}
```

### UI del módulo de observaciones

**Pantalla del maestro — por alumno:**

1. Card del alumno con nombre, grado, promedio del trimestre
2. Campo de texto: *"Describe brevemente a este alumno"*
   - Placeholder: *"Ej: Es participativo, mejoró en matemáticas, le cuesta trabajo la lectura..."*
   - Máximo 300 caracteres de entrada
3. Botón: **"Generar observación"** (con ícono de IA)
4. Loading state: skeleton de 2 tarjetas mientras genera
5. Resultado: 2 tarjetas lado a lado, cada una con:
   - El texto generado
   - Contador de caracteres (verde si ≤500, rojo si excede)
   - Botón "Seleccionar esta"
6. Al seleccionar una → se guarda en Firestore y marca el alumno como "observación lista" ✅
7. El maestro puede editar el texto antes de guardar (textarea editable)
8. Puede regenerar si no le gusta ninguna (cuenta como 2 usos más del plan prueba)

**Vista de lista de alumnos:**
- Badge de estado por alumno: ✅ Observación lista | ⏳ Pendiente
- Progreso del grupo: "18/30 alumnos con observación"
- Botón de exportar todas las observaciones a Excel/PDF

---

## 7. DEV CONSOLE (Superadmin)

Ruta: `/dev/*` — acceso exclusivo rol `superadmin`

### Módulos mínimos para este sprint

#### Dashboard
- Total de zonas activas
- Total de maestros con plan IA activo
- Ingresos del mes (cuando se implemente pasarela de pagos)
- Zonas próximas a vencer (próximos 30 días)

#### Gestión de Zonas
- Lista de todas las zonas con: nombre, plan, estatus, fecha de vencimiento, # escuelas, # maestros
- Crear nueva zona: nombre, estado, contacto admin, plan inicial
- Editar zona: cambiar plan, extender licencia, suspender/reactivar
- Ver detalle: escuelas, usuarios, uso de IA (# observaciones generadas)

#### Gestión de Usuarios
- Crear usuario asignado a zona
- Cambiar rol, resetear contraseña, desactivar

#### Logs de IA
- Registro de todas las llamadas a la API de Anthropic
- Filtrable por zona, fecha, maestro
- Para monitorear abuso y costos reales

---

## 8. LÍMITES Y PROTECCIONES

### Límite de uso de IA por maestro

```javascript
// Máximo 60 generaciones por día por maestro
// (50 alumnos × 2 versiones = 100 máximo teórico,
//  pero 60/día es más que suficiente para uso legítimo)
// Implementar con contador en Firestore que resetea a medianoche
```

### Validaciones antes de llamar a la API

```javascript
// Verificar en este orden antes de cada llamada:
1. ¿El maestro tiene plan activo (no prueba agotada)?
2. ¿La zona tiene ia_habilitada === true?
3. ¿La zona no está suspendida?
4. ¿El maestro no superó el límite diario (60)?
5. ¿La licencia no está vencida (o es legacy)?
// Si cualquier check falla → no llamar a la API, mostrar mensaje apropiado
```

---

## 9. ESTRUCTURA DE RUTAS

```
/auth/login                          → Login universal
/auth/recuperar                      → Recuperación de contraseña

/dev/dashboard                       → Dev Console — solo superadmin
/dev/zonas                           → Gestión de zonas
/dev/zonas/:zonaId                   → Detalle de zona
/dev/usuarios                        → Gestión global de usuarios
/dev/logs-ia                         → Logs de uso de IA

/admin/dashboard                     → Panel admin_zona
/admin/escuelas                      → Gestión de escuelas de la zona
/admin/usuarios                      → Usuarios de la zona
/admin/reportes                      → Reportes de la zona

/app/dashboard                       → Panel maestro o director
/app/grupos                          → Mis grupos (maestro)
/app/grupos/:grupoId/alumnos         → Lista de alumnos del grupo
/app/grupos/:grupoId/calificaciones  → Captura de calificaciones
/app/grupos/:grupoId/observaciones   → Generador de observaciones IA ⭐
/app/director/escuela                → Vista director — toda la escuela

/licencia-vencida                    → Pantalla de bloqueo
/upgrade                             → Pantalla de planes y precios
```

---

## 10. ORDEN DE CONSTRUCCIÓN (SPRINT ACTUAL)

Seguir este orden. No avanzar al siguiente paso sin terminar el anterior.

### Paso 1 — Migración multi-tenant
- [ ] Agregar campo `zona_id` a todas las colecciones existentes
- [ ] La zona actual recibe `zona_id: "zona_040"` y `plan: "legacy"`
- [ ] Actualizar Firestore Security Rules para filtrar por `zona_id`
- [ ] Crear colección `/zonas` con documento de zona_040
- [ ] Agregar `zona_id` al perfil de todos los usuarios existentes
- [ ] Verificar que la plataforma actual sigue funcionando igual para la zona_040

### Paso 2 — Rol Superadmin y Dev Console básica
- [ ] Crear usuario superadmin (Jako)
- [ ] Ruta `/dev` protegida solo para superadmin
- [ ] Pantalla de lista de zonas con estatus
- [ ] Formulario de crear/editar zona
- [ ] Campos de plan y licencia editables desde dev console

### Paso 3 — Módulo de observaciones con IA
- [ ] Integración API Anthropic (Haiku 4.5) — preferentemente vía Cloud Function
- [ ] UI de generación por alumno (describir → generar → elegir → guardar)
- [ ] Guardado de observaciones en Firestore
- [ ] Badge de progreso en lista de alumnos
- [ ] Exportar observaciones del grupo a Excel

### Paso 4 — Sistema de planes y límites
- [ ] Verificación de plan antes de cada llamada a IA
- [ ] Lógica del plan prueba (máximo 2 observaciones totales)
- [ ] Pantalla `/upgrade` con opciones de plan
- [ ] Pantalla `/licencia-vencida`
- [ ] Límite diario de 60 generaciones por maestro
- [ ] *(Pasarela de pagos: se define en sprint posterior)*

---

## 11. STACK TÉCNICO

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18+ con Vite |
| Estilos | Tailwind CSS |
| Routing | React Router v6+ |
| Auth | Firebase Authentication |
| Base de datos | Cloud Firestore |
| Storage | Firebase Storage |
| Hosting | Firebase Hosting |
| Functions | Cloud Functions (para llamadas a API Anthropic) |
| IA | Anthropic API — Claude Haiku 4.5 |
| Excel | SheetJS (xlsx) |
| Iconos | Lucide React |
| Animaciones | Framer Motion |

---

## 12. REGLAS GENERALES DE DESARROLLO

- **Soft delete siempre:** nunca borrar registros, usar campo `deleted: true`
- **`zona_id` obligatorio** en todas las colecciones de negocio
- **La API key de Anthropic NUNCA va en el frontend** — solo en Cloud Functions o variables de entorno del servidor
- **Comentarios en español** en todo el código
- **Mobile-first:** toda UI debe funcionar bien en celular (los maestros trabajan en campo)
- **Modo claro/oscuro** obligatorio
- **Créditos:** "Desarrollado por JakoSoft" con enlace `https://wa.me/5272222478493`
- Antes de llamar a la API de IA, **siempre verificar** los 5 checks de validación del paso 8

---

## 13. CONTEXTO DE NEGOCIO (para decisiones de arquitectura)

- El mercado objetivo son maestros de educación primaria pública mexicana
- Los maestros trabajan con celular y tablet principalmente
- La conectividad en zonas rurales es irregular — considerar estados de carga tolerantes
- El precio anual es $250 MXN por maestro — cualquier fricción en el pago mata la conversión
- La zona_040 (Sector No. 8, SEIEM) es el tenant beta permanente — nunca debe ver mensajes de cobro
- El crecimiento será orgánico vía recomendación entre maestros — la calidad del output de IA es crítica
- Máximo 50 alumnos por grupo en primaria pública mexicana

---

*Documento generado para Miniapps — Boleta Inteligente*
*Desarrollado por JakoSoft | wa.me/5272222478493*
