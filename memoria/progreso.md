# Progreso — Miniapps Escolar

**Producto:** Plataforma SaaS multi-tenant de gestión escolar para docentes de primaria
**Versión actual:** 0.1.0
**Desarrollador:** Mtro. Jako (jakousi.montiel@gmail.com)
**Inicio estimado:** 2026-06-14

---

## Sesiones

### Sesión — 2026-07-04 (tarde)
**Movimientos de alumnos (registro automático + historial)**
- Patrón SIDEC adaptado: el movimiento se registra automáticamente desde los Server Actions de alumnos (no hay formulario dedicado ni trigger SQL); su fallo nunca bloquea la operación (solo console.error)
- `app/actions/alumnos.ts`: helper `registrarMovimientos` — alta al `crearAlumno` (motivo "Inscripción") e `importarAlumnos` (motivo "Importación desde Excel"); baja en `darDeBajaAlumno` con motivo capturado en el modal (textarea nueva en AlumnosClient)
- Tipo `traslado` existe en la tabla pero sin flujo UI todavía (no hay cambio de escuela en miniapps v1)
- Fix seguridad: `darDeBajaAlumno` no verificaba dueño — cualquier usuario autenticado podía dar de baja cualquier alumno vía POST; ahora valida `grupos.maestro_id === user.id`
- Nueva página `/app/movimientos`: cards de totales por tipo, búsqueda por nombre/CURP, filtro por tipo, tabla (fecha, alumno+CURP, badge tipo, motivo, registró), últimos 500
- Entrada "Movimientos" (ArrowRightLeft) en sidebar del maestro
- Build sin errores (36 rutas)

**Selector de escuela al crear usuario (Dev Console)**
- El formulario de `/dev/usuarios` no capturaba `escuela_id`: un director creado ahí quedaba sin escuela y veía todo vacío (sus vistas filtran por `usuario.escuela_id`)
- `crearUsuario` ahora acepta `escuela_id` y rechaza directores sin escuela; el modal muestra selector de escuela (requerido para director, opcional para maestro, oculto para supervisor) filtrado por la zona elegida
- Para probar roles: crear usuarios de prueba director/supervisor desde Dev Console y entrar en incógnito

**Respaldos ZIP (kardex masivo por grupo)**
- Nueva ruta `GET /api/reportes/respaldo-zip?grupoId=` — genera el kardex HTML de cada alumno activo del grupo y los empaqueta con JSZip en servidor (1 query de evaluaciones para todo el grupo)
- Refactor: la generación del kardex se extrajo a `lib/reportes/kardex-html.ts` (`generarKardexHTML` con opción `autoPrint`); la ruta `/api/reportes/kardex` ahora la reutiliza — los kardex del ZIP NO imprimen al abrirse
- Nomenclatura: ZIP `Respaldo_Kardex_{grado}_{grupo}_{ciclo}.zip`; archivos internos `NN_KARDEX_{APELLIDOS_NOMBRE}.html`
- Permisos idénticos al kardex (maestro dueño / director su escuela / supervisor su zona + licencia vigente)
- UI: 4ª tarjeta "Respaldo ZIP" (morada, FolderArchive) en `/app/reportes` con spinner "Generando…" y mensaje de error inline; grid ahora md:2 / lg:4 columnas
- Fix de paso: `'use client'` duplicado en ReportesClient.tsx
- Dependencia nueva: `jszip@3.10.1`
- Nota: solo está en reportes del maestro; la versión director/supervisor (por escuela) queda para el bloque Home Director

**Módulo Aprovechamiento completo (paridad SIDEC, adaptado a maestro)**
- Nueva ruta `/app/aprovechamiento`: `page.tsx` (server: grupos del maestro + alumnos activos + evaluaciones de todos los períodos) + `AprovechamientoClient.tsx`
- 5 tabs: Por Período, Promedio Final, Aprendizajes Esperados, Gráficas (Recharts), Evolución (Diag→T3)
- Adaptación clave: en SIDEC las filas son escuelas (nivel zona); aquí son alumnos del grupo del maestro
- Cálculos fieles a SIDEC: solo calificaciones > 0 cuentan, truncado Math.floor, promedio final = media de promedios trimestrales truncados (Diagnóstico excluido), rangos r10–r5, colores de celda por umbral
- Export Excel 6 hojas (DIAG, 1ER-3ER TRIM, PROM FINAL, APREND-ESP) con SheetJS
- Entrada "Aprovechamiento" (BarChart3) en el sidebar del maestro, después de Reportes
- Build de producción sin errores (35 rutas)

**Auditoría de calificaciones — inserción automática (Server Action, no trigger SQL)**
- `app/actions/calificaciones.ts`: `detectarCambios` (diff antes del upsert) + `registrarAuditoria` (insert tras guardado exitoso)
- Conectado en `guardarCalificaciones`, `guardarAlumnoCalif` y `guardarAntecedentes`
- Solo se audita la modificación de una calificación ya guardada (anterior no null y distinto); primera captura no genera registro
- La auditoría nunca bloquea el guardado (error solo va a console.error)
- Fix de paso: `guardarAntecedentes` usaba `Math.round` → `Math.floor` (regla de truncado)

**Reiniciar observación IA (paridad SIDEC `reiniciarObservacionIA`)**
- Nuevo `app/actions/ia.ts`: `cargarAlumnosEstadoIA` y `reiniciarObservacionIA` (borra `ia_obs_*` y pone `ia_usos_*` en 0; conserva `obs_*` porque puede ser texto manual del maestro)
- Permisos: superadmin y supervisor (supervisor solo su zona)
- Dev Console `/dev/usuarios`: botón ✨ en filas de maestros → panel expandible con selector Diag/T1/T2/T3, badge Generado/Sin generar y botón Reiniciar con modal de confirmación

**Fix seguridad: Server Actions de Dev Console sin verificación de rol**
- `crearUsuario`, `toggleEstatusUsuario`, `activarPlan`, `crearZona`, `actualizarZona`, `toggleEstatusZona` usaban `createAdminClient()` sin verificar al llamante — un usuario cualquiera podía invocarlos como endpoint POST (el guard del layout no protege actions)
- Fix: helper `esSuperadmin()` al inicio de cada action

### Sesión — 2026-07-04
**Verificación del bloque de reportes e IA (QA estático + build)**
- Reportes Excel ✓, Kardex ✓, Alumnos en Riesgo ✓ (promedio_general existe y se calcula al guardar; director/supervisor filtran por escuela/zona)
- Build de producción sin errores (34 rutas)

**Migración de proveedor IA: Kimi → DeepSeek**
- `lib/anthropic/` renombrado a `lib/ia/`; cliente reescrito para DeepSeek (`deepseek-chat`, `api.deepseek.com/v1`, env `DEEPSEEK_API_KEY`)
- Costo en `logs_ia` actualizado a tarifas DeepSeek ($0.28/$0.42 por 1M tokens)
- `CONFIGURACION_API_KIMI.md` reemplazado por `CONFIGURACION_API_DEEPSEEK.md`
- CLAUDE.md, política de privacidad (md + página) y Dev Console actualizados
- **PENDIENTE: falta poner la key real en `DEEPSEEK_API_KEY` (.env.local y Vercel) — sin eso la IA no funciona**

**Fix privacidad: ya no se envía el nombre del alumno a la IA**
- El prompt enviaba `Alumno: {nombre apellido}` violando la promesa de la política de privacidad ("no se envían datos de identificación")
- Ahora solo se envía grado, campo, calificación y descripción del maestro
- Nueva regla absoluta en CLAUDE.md: nunca enviar nombre/CURP al proveedor de IA

**Fix redondeo en Cuadro General**
- `Math.round` → truncado `Math.floor` en promedios (9.75 muestra 9.7, consistente con Excel/Kardex/captura)
- Con `trimestre=0` las calificaciones del Diagnóstico ahora muestran 1 decimal truncado (antes entero redondeado)

**Fix seguridad multi-tenant en rutas de reportes**
- excel, kardex y cuadro-general no validaban al rol `supervisor` — podía descargar reportes de grupos de otras zonas vía API directa
- Fix: `if (rol === 'supervisor' && grupo.zona_id !== usuario.zona_id) → 403` (excel-escuela ya lo tenía)

### Sesión — 2026-06-27
**Contexto y arquitectura**
- Diagnóstico completo del proyecto: se identificó que el agente anterior construyó un producto diferente al SIDEC (SaaS de maestros individuales vs gestión de zona)
- Definición clara del modelo de negocio bottom-up: maestros pagan y construyen la BD; director y supervisor pagan para consultar
- Decisión: funcionalidad idéntica a SIDEC pero con maestro como actor principal y multi-tenant

**Migraciones SQL aplicadas en Supabase**
- `20260627_periodo_diagnostico.sql` — habilita `trimestre=0` (Diagnóstico) en `evaluaciones`
- `20260627_escuela_campos_sidec.sql` — agrega `sector`, `organizacion`, `tipo_organizacion` a `escuelas`
- `20260627_movimientos.sql` — nueva tabla `movimientos` con RLS completo
- `20260627_auditoria_calificaciones.sql` — nueva tabla `auditoria_calificaciones` con RLS completo

**Reportes corregidos**
- `app/api/reportes/excel/route.ts` reescrito para formato SIDEC: todos los períodos en un archivo (Diag + T1 + T2 + T3), con observaciones y promedios por trimestre. Diagnóstico muestra 1 decimal; trimestres muestran enteros; promedios con 1 decimal (Math.floor, no Math.round)
- `app/api/reportes/kardex/route.ts` actualizado: columna Diagnóstico agregada, truncado con Math.floor, observaciones de los 4 períodos

**Sistema de diseño Deepin Light aplicado a todo el sistema**
- Paleta: fondo `#F5F8FF`, primario `#0687D8`, texto `#1E2D3D`
- 39 archivos `.tsx` actualizados: sidebars, login, registro, recuperar, dashboards, grupos, alumnos, calificaciones, observaciones, reportes, riesgo, configuración, dev console, logs IA, privacidad
- Zero clases de tema oscuro (`text-white`, `bg-gray-9*`, etc.) en archivos de la app

---

## Estado funcional actual

### Flujos que funcionan
- Login / autenticación con Supabase Auth
- Registro de maestro (búsqueda fuzzy por CCT)
- Dev Console (gestión de usuarios y zonas)
- Grupos: crear, listar
- Alumnos: crear, editar, importar desde Excel, listar
- Calificaciones: captura por campo formativo, guardar

### Flujos pendientes o incompletos
- IA en calificaciones (endpoint existe, falta verificar integración)
- Reportes Excel: corregidos hoy — pendiente verificar en producción
- Kardex PDF: corregido hoy — pendiente verificar
- Cuadro General PDF: existe, pendiente verificar formato
- Alumnos en Riesgo: página existe, pendiente verificar datos
- Aprovechamiento: implementado 2026-07-04 — pendiente prueba en navegador con datos reales
- Movimientos de alumnos: tabla DB lista, frontend NO existe aún
- Auditoría de calificaciones: tabla DB lista, frontend NO existe aún
- Respaldos ZIP: NO existe aún
- Home del Director: página de escuela existe, pendiente contenido
- Dashboard Supervisor: página existe, pendiente datos reales

---

## Módulos completados
- [x] Login / Autenticación (Supabase Auth)
- [x] Registro de maestro con búsqueda de escuela por CCT
- [x] Dev Console (gestión usuarios, zonas, logs IA)
- [x] Grupos (crear, listar)
- [x] Alumnos (CRUD + importar Excel)
- [x] Calificaciones (captura multi-campo, guardar)
- [x] Reportes Excel multi-período (formato SIDEC)
- [x] Kardex individual HTML imprimible
- [x] Aprovechamiento (5 tabs + gráficas + Excel)
- [x] Respaldos ZIP (kardex masivo por grupo)
- [x] Movimientos de alumnos (registro automático + historial)
- [x] Sistema de diseño Deepin Light en toda la app

## Módulos pendientes (por orden de prioridad)
- [ ] IA en calificaciones — verificar y activar botón Generar
- [ ] Alumnos en Riesgo — verificar query y visualización
- [ ] Auditoría de calificaciones — frontend desde cero (DB lista)
- [ ] Home Director — contenido y estadísticas
- [ ] Dashboard Supervisor — datos reales de zona
