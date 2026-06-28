import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ObservacionesClient from './ObservacionesClient'

interface Props {
  params: { grupoId: string }
}

export default async function ObservacionesPage({ params }: Props) {
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

  // Observaciones del ciclo para este grupo
  const { data: observaciones } = await admin
    .from('observaciones')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .eq('ciclo_escolar', grupo.ciclo_escolar)

  // Evaluaciones del ciclo para mostrar promedios
  const { data: evaluaciones } = await admin
    .from('evaluaciones')
    .select('alumno_id, trimestre, promedio_general, lenguajes, saberes, etica, humanos')
    .eq('grupo_id', params.grupoId)
    .eq('ciclo_escolar', grupo.ciclo_escolar)

  return (
    <ObservacionesClient
      grupo={grupo}
      alumnos={alumnos ?? []}
      observaciones={observaciones ?? []}
      evaluaciones={evaluaciones ?? []}
    />
  )
}
