import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AlumnosClient from './AlumnosClient'

interface Props {
  params: { grupoId: string }
}

export default async function AlumnosPage({ params }: Props) {
  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('*')
    .eq('id', params.grupoId)
    .single()

  if (!grupo) notFound()

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('*')
    .eq('grupo_id', params.grupoId)
    .order('apellido_paterno')

  return <AlumnosClient grupo={grupo} alumnos={alumnos ?? []} />
}
