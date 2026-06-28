# Progreso — Miniapps Escolar

**Producto:** Plataforma SaaS multi-tenant de gestión escolar para docentes de primaria
**Versión actual:** 0.1.0
**Desarrollador:** Mtro. Jako (jakousi.montiel@gmail.com)
**Inicio estimado:** 2026-06-14

---

## Sesiones

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
- Aprovechamiento / gráficas: componente `GraficaPromedios.tsx` existe, módulo incompleto
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
- [x] Sistema de diseño Deepin Light en toda la app

## Módulos pendientes (por orden de prioridad)
- [ ] IA en calificaciones — verificar y activar botón Generar
- [ ] Alumnos en Riesgo — verificar query y visualización
- [ ] Aprovechamiento / gráficas — pendiente implementar
- [ ] Movimientos de alumnos — frontend desde cero (DB lista)
- [ ] Auditoría de calificaciones — frontend desde cero (DB lista)
- [ ] Respaldos ZIP — desde cero
- [ ] Home Director — contenido y estadísticas
- [ ] Dashboard Supervisor — datos reales de zona
