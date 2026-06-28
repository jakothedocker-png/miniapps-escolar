import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CalificacionesClient from './CalificacionesClient'

interface Props {
  params: { grupoId: string }
}

export default async function CalificacionesPage({ params }: Props) {
  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('*')
    .eq('id', params.grupoId)
    .single()

  if (!grupo) notFound()

  // Alumnos activos del grupo
  const { data: alumnos } = await admin
    .from('alumnos')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .eq('activo', true)
    .eq('deleted', false)
    .order('apellido_paterno')

  // Todas las evaluaciones del ciclo para este grupo
  const { data: evaluaciones } = await admin
    .from('evaluaciones')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .eq('ciclo_escolar', grupo.ciclo_escolar)

  return (
    <CalificacionesClient
      grupo={grupo}
      alumnos={alumnos ?? []}
      evaluaciones={evaluaciones ?? []}
    />
  )
}
