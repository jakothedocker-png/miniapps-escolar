import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportesDirectorClient from './ReportesDirectorClient'

export default async function ReportesDirectorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('escuela_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.escuela_id) redirect('/director/escuela')

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, grado, grupo, ciclo_escolar')
    .eq('escuela_id', usuario.escuela_id)
    .order('grado')
    .order('grupo')

  const gruposList = grupos ?? []
  const alumnosPorGrupo: Record<string, { id: string; nombre: string; apellido_paterno: string; apellido_materno: string | null }[]> = {}

  await Promise.all(
    gruposList.map(async (grupo) => {
      const { data: alumnos } = await admin
        .from('alumnos')
        .select('id, nombre, apellido_paterno, apellido_materno')
        .eq('grupo_id', grupo.id)
        .eq('activo', true)
        .eq('deleted', false)
        .order('apellido_paterno')
      alumnosPorGrupo[grupo.id] = alumnos ?? []
    })
  )

  return (
    <ReportesDirectorClient
      grupos={gruposList}
      alumnosPorGrupo={alumnosPorGrupo}
      escuelaId={usuario.escuela_id}
    />
  )
}
