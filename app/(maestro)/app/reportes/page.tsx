import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportesClient from './ReportesClient'

export default async function ReportesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: grupos } = await admin
    .from('grupos')
    .select('*')
    .eq('maestro_id', user.id)
    .order('grado')

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

  return <ReportesClient grupos={gruposList} alumnosPorGrupo={alumnosPorGrupo} />
}
