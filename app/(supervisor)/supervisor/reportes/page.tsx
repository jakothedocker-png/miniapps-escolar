import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportesSupervisorClient from './ReportesSupervisorClient'

export default async function ReportesSupervisorPage() {
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
    .select('id, nombre, cct')
    .eq('zona_id', usuario.zona_id)
    .order('nombre')

  const escuelasList = escuelas ?? []

  const gruposPorEscuela: Record<string, { id: string; grado: string; grupo: string; ciclo_escolar: string }[]> = {}
  const alumnosPorGrupo: Record<string, { id: string; nombre: string; apellido_paterno: string; apellido_materno: string | null }[]> = {}

  await Promise.all(
    escuelasList.map(async (escuela) => {
      const { data: grupos } = await admin
        .from('grupos')
        .select('id, grado, grupo, ciclo_escolar')
        .eq('escuela_id', escuela.id)
        .order('grado')
        .order('grupo')

      gruposPorEscuela[escuela.id] = grupos ?? []

      await Promise.all(
        (grupos ?? []).map(async (grupo) => {
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
    })
  )

  return (
    <ReportesSupervisorClient
      escuelas={escuelasList}
      gruposPorEscuela={gruposPorEscuela}
      alumnosPorGrupo={alumnosPorGrupo}
    />
  )
}
