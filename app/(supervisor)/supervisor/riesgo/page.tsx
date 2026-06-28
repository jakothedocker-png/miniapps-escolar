import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RiesgoSupervisorClient from './RiesgoSupervisorClient'

export default async function RiesgoSupervisorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('zona_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.zona_id) redirect('/supervisor/dashboard')

  const { data: escuelas } = await admin
    .from('escuelas')
    .select('id, nombre')
    .eq('zona_id', usuario.zona_id)

  const escuelaMap = new Map((escuelas ?? []).map(e => [e.id, e.nombre]))

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, grado, grupo, maestro_id, escuela_id')
    .eq('zona_id', usuario.zona_id)

  const grupoIds = grupos?.map(g => g.id) ?? []
  const grupoMap = new Map((grupos ?? []).map(g => [g.id, g]))
  const maestroIds = Array.from(new Set((grupos ?? []).map(g => g.maestro_id).filter(Boolean)))

  const { data: maestros } = maestroIds.length > 0
    ? await admin.from('usuarios').select('id, nombre').in('id', maestroIds)
    : { data: [] }

  const maestroMap = new Map((maestros ?? []).map(m => [m.id, m.nombre]))

  if (grupoIds.length === 0) return <RiesgoSupervisorClient alumnos={[]} />

  const { data: evaluaciones } = await admin
    .from('evaluaciones')
    .select('alumno_id, grupo_id, trimestre, promedio_general, inasistencias')
    .in('grupo_id', grupoIds)
    .or('promedio_general.lt.6,inasistencias.gte.10')

  const alumnoIds = Array.from(new Set((evaluaciones ?? []).map(e => e.alumno_id)))
  if (alumnoIds.length === 0) return <RiesgoSupervisorClient alumnos={[]} />

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido_paterno, apellido_materno, escuela_id')
    .in('id', alumnoIds)
    .eq('activo', true)
    .eq('deleted', false)

  const alumnoMap = new Map((alumnos ?? []).map(a => [a.id, a]))

  const mapaAlumno = new Map<string, {
    alumno_id: string; nombre: string; escuela: string; maestro: string
    grado: string; grupo: string
    t1_prom: number | null; t2_prom: number | null; t3_prom: number | null
    total_faltas: number
  }>()

  for (const ev of evaluaciones ?? []) {
    const alumno = alumnoMap.get(ev.alumno_id)
    const grupo = grupoMap.get(ev.grupo_id)
    if (!alumno || !grupo) continue

    if (!mapaAlumno.has(ev.alumno_id)) {
      const nombre = [alumno.apellido_paterno, alumno.apellido_materno, alumno.nombre].filter(Boolean).join(' ')
      mapaAlumno.set(ev.alumno_id, {
        alumno_id: ev.alumno_id,
        nombre,
        escuela: escuelaMap.get(grupo.escuela_id) ?? '—',
        maestro: maestroMap.get(grupo.maestro_id) ?? '—',
        grado: grupo.grado,
        grupo: grupo.grupo,
        t1_prom: null, t2_prom: null, t3_prom: null,
        total_faltas: 0,
      })
    }

    const entry = mapaAlumno.get(ev.alumno_id)!
    if (ev.trimestre === 1) entry.t1_prom = ev.promedio_general
    if (ev.trimestre === 2) entry.t2_prom = ev.promedio_general
    if (ev.trimestre === 3) entry.t3_prom = ev.promedio_general
    entry.total_faltas += ev.inasistencias ?? 0
  }

  const alumnosRiesgo = Array.from(mapaAlumno.values()).sort((a, b) => a.escuela.localeCompare(b.escuela) || a.nombre.localeCompare(b.nombre))
  return <RiesgoSupervisorClient alumnos={alumnosRiesgo} />
}
