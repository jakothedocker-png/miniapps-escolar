# Pendientes — Miniapps Escolar

---

## Prioridad alta (maestro solo — primer cliente)

- [ ] **DEEPSEEK_API_KEY** — poner la key real en `.env.local` y en las variables de entorno de Vercel (sin esto la IA no funciona). Generar en https://platform.deepseek.com/api_keys
- [ ] **Prueba end-to-end de IA** — generar una observación real desde la UI con DeepSeek (verificación estática hecha 2026-07-04; falta prueba en navegador con key activa)
- [ ] **Prueba en navegador de reportes** — descargar Excel, Kardex y Cuadro General con datos reales (código verificado estáticamente 2026-07-04)

## Prioridad media (cuando lleguen directores)

- [ ] **Home Director** — resumen de su escuela: total alumnos, grupos activos, captura por grado, alertas de riesgo
- [ ] **Movimientos de alumnos** — frontend completo: tabla con filtros, formulario de alta/baja/traslado. La tabla DB `movimientos` ya existe con RLS.
- [ ] **Auditoría de calificaciones** — frontend: tabla con filtros por período, campo y maestro. La tabla DB `auditoria_calificaciones` ya existe con RLS y **ya recibe registros** desde los Server Actions (hecho 2026-07-04).
- [ ] **Dashboard Supervisor** — estadísticas de zona: matrícula total, escuelas activas, promedio general por escuela, alertas de captura pendiente

## Prioridad baja (mejoras)

- [ ] **Respaldo ZIP por escuela** — versión para director/supervisor (todos los grupos de la escuela); la versión por grupo del maestro ya existe. Hacerlo junto con Home Director.
- [ ] **Sistema de pagos** — integración Stripe o equivalente para activar licencias automáticamente (hoy es manual vía superadmin)
- [ ] **Período activo por escuela/zona** — campo `periodo_activo` en escuelas o zonas para que director/supervisor pueda abrir/cerrar capturas. Decisión tomada: NO implementar hasta que lleguen directores.

## Bloqueados

- [ ] **`/api/licencias` route** — devuelve 501 Not Implemented. Sin esto el flujo de pago no se puede automatizar.

## Decisiones pendientes

- (ninguna)

## Completados

- [x] Respaldos ZIP por grupo — /api/reportes/respaldo-zip + tarjeta en /app/reportes; cubre también "boleta de grupo completo" (2026-07-04)
- [x] Aprovechamiento con gráficas — 5 tabs + Excel 6 hojas, ruta /app/aprovechamiento (2026-07-04)
- [x] Auditoría de calificaciones — inserción automática desde Server Actions (decisión: Server Action, no trigger SQL) (2026-07-04)
- [x] Reiniciar observación IA — Server Action + panel en Dev Console /dev/usuarios (2026-07-04)
- [x] Guard superadmin en Server Actions de /dev/usuarios y /dev/zonas (2026-07-04)

- [x] Schema base Supabase (2026-06-14)
- [x] Migraciones: licencias, períodos, IA en evaluaciones (2026-06-14 a 2026-06-19)
- [x] Migración: período diagnóstico (trimestre=0) habilitado (2026-06-27)
- [x] Migración: campos sector/organización/tipo en escuelas (2026-06-27)
- [x] Tabla `movimientos` con RLS (2026-06-27)
- [x] Tabla `auditoria_calificaciones` con RLS (2026-06-27)
- [x] Excel multi-período formato SIDEC (2026-06-27)
- [x] Kardex con columna Diagnóstico y truncado Math.floor (2026-06-27)
- [x] Sistema de diseño Deepin Light en todo el sistema (2026-06-27)
- [x] Login, registro, recuperar contraseña funcionales
- [x] Grupos, alumnos, calificaciones funcionales
- [x] Dev Console funcional (usuarios, zonas, logs IA)
