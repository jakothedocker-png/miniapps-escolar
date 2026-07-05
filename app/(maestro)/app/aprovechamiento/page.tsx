import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AprovechamientoClient from './AprovechamientoClient'

export default async function AprovechamientoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, grado, grupo, ciclo_escolar')
    .eq('maestro_id', user.id)
    .order('grado')

  if (!grupos || grupos.length === 0) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: '#64748B' }}>No tienes grupos asignados.</p>
      </div>
    )
  }

  const grupoIds = grupos.map(g => g.id)

  const [{ data: alumnos }, { data: evaluaciones }] = await Promise.all([
    admin
      .from('alumnos')
      .select('id, nombre, apellido_paterno, apellido_materno, grupo_id')
      .in('grupo_id', grupoIds)
      .eq('activo', true)
      .eq('deleted', false)
      .order('apellido_paterno'),
    admin
      .from('evaluaciones')
      .select('alumno_id, grupo_id, trimestre, lenguajes, saberes, etica, humanos')
      .in('grupo_id', grupoIds),
  ])

  const alumnosData = (alumnos ?? []).map(a => ({
    id: a.id,
    grupo_id: a.grupo_id,
    nombre: `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.replace(/\s+/g, ' ').trim(),
  }))

  const evalsData = (evaluaciones ?? []).map(e => ({
    alumno_id: e.alumno_id,
    grupo_id: e.grupo_id,
    trimestre: e.trimestre as number,
    lenguajes: e.lenguajes !== null ? Number(e.lenguajes) : null,
    saberes:   e.saberes   !== null ? Number(e.saberes)   : null,
    etica:     e.etica     !== null ? Number(e.etica)     : null,
    humanos:   e.humanos   !== null ? Number(e.humanos)   : null,
  }))

  return <AprovechamientoClient grupos={grupos} alumnos={alumnosData} evaluaciones={evalsData} />
}
