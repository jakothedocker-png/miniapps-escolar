import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RiesgoClient from './RiesgoClient'

export default async function RiesgoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, grado, grupo, ciclo_escolar')
    .eq('maestro_id', user.id)

  const grupoIds = grupos?.map(g => g.id) ?? []
  const grupoMap = new Map((grupos ?? []).map(g => [g.id, g]))

  if (grupoIds.length === 0) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">No tienes grupos asignados.</p>
      </div>
    )
  }

  const { data: evaluaciones } = await admin
    .from('evaluaciones')
    .select('alumno_id, grupo_id, trimestre, promedio_general, inasistencias')
    .in('grupo_id', grupoIds)
    .or('promedio_general.lt.6,inasistencias.gte.10')

  const alumnoIds = Array.from(new Set((evaluaciones ?? []).map(e => e.alumno_id)))

  if (alumnoIds.length === 0) {
    return <RiesgoClient alumnos={[]} />
  }

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido_paterno, apellido_materno')
    .in('id', alumnoIds)
    .eq('activo', true)
    .eq('deleted', false)

  const alumnoMap = new Map((alumnos ?? []).map(a => [a.id, a]))

  // Consolidar por alumno
  const mapaAlumno = new Map<string, {
    alumno_id: string
    nombre: string
    grado: string
    grupo: string
    t1_prom: number | null
    t1_faltas: number | null
    t2_prom: number | null
    t2_faltas: number | null
    t3_prom: number | null
    t3_faltas: number | null
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
        grado: grupo.grado,
        grupo: grupo.grupo,
        t1_prom: null, t1_faltas: null,
        t2_prom: null, t2_faltas: null,
        t3_prom: null, t3_faltas: null,
        total_faltas: 0,
      })
    }

    const entry = mapaAlumno.get(ev.alumno_id)!
    if (ev.trimestre === 1) { entry.t1_prom = ev.promedio_general; entry.t1_faltas = ev.inasistencias }
    if (ev.trimestre === 2) { entry.t2_prom = ev.promedio_general; entry.t2_faltas = ev.inasistencias }
    if (ev.trimestre === 3) { entry.t3_prom = ev.promedio_general; entry.t3_faltas = ev.inasistencias }
    entry.total_faltas += ev.inasistencias ?? 0
  }

  const alumnosRiesgo = Array.from(mapaAlumno.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))

  return <RiesgoClient alumnos={alumnosRiesgo} />
}
