# Pendientes — Miniapps Escolar

---

## Prioridad alta (maestro solo — primer cliente)

- [ ] **IA en calificaciones** — verificar que el botón "Generar observaciones" funcione con Kimi; el endpoint `/api/ia/observaciones` existe pero no se ha probado integrado con la UI
- [ ] **Alumnos en Riesgo** — verificar que la query a Supabase funcione y los datos se muestren correctamente con el nuevo schema
- [ ] **Reportes Excel** — verificar en navegador que el archivo descargado tiene el formato correcto (Diag + T1+T2+T3 + promedios)
- [ ] **Kardex individual** — verificar que la columna Diagnóstico aparece y los promedios están truncados (no redondeados)
- [ ] **Cuadro General PDF** — verificar formato y que el parámetro `trimestre=0` funciona para Diagnóstico

## Prioridad media (cuando lleguen directores)

- [ ] **Home Director** — resumen de su escuela: total alumnos, grupos activos, captura por grado, alertas de riesgo
- [ ] **Movimientos de alumnos** — frontend completo: tabla con filtros, formulario de alta/baja/traslado. La tabla DB `movimientos` ya existe con RLS.
- [ ] **Auditoría de calificaciones** — frontend: tabla con filtros por período, campo y maestro. La tabla DB `auditoria_calificaciones` ya existe con RLS. Falta también el trigger que inserte registros automáticamente al guardar calificaciones.
- [ ] **Dashboard Supervisor** — estadísticas de zona: matrícula total, escuelas activas, promedio general por escuela, alertas de captura pendiente

## Prioridad baja (mejoras)

- [ ] **Aprovechamiento / gráficas** — equivalente al módulo de SIDEC: tabs Por Período, Promedio Final, Aprendizajes Esperados, Gráficas, Evolución. Recharts ya está instalado.
- [ ] **Respaldos ZIP** — descarga masiva de kardex de todo un grupo o escuela en ZIP
- [ ] **Boleta de grupo completo** — generar todos los kardex de un grupo en una sola acción (hoy es alumno por alumno)
- [ ] **Sistema de pagos** — integración Stripe o equivalente para activar licencias automáticamente (hoy es manual vía superadmin)
- [ ] **Período activo por escuela/zona** — campo `periodo_activo` en escuelas o zonas para que director/supervisor pueda abrir/cerrar capturas. Decisión tomada: NO implementar hasta que lleguen directores.

## Bloqueados

- [ ] **`/api/licencias` route** — devuelve 501 Not Implemented. Sin esto el flujo de pago no se puede automatizar.

## Decisiones pendientes

- ¿El trigger de auditoría de calificaciones se hace en PostgreSQL (trigger nativo) o en el Server Action de `guardarCalificaciones`? **Recomendación:** Server Action es más simple y no requiere función SQL adicional.

## Completados

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
