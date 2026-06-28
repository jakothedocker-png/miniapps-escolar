import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImportarClient from './ImportarClient'

export default async function ImportarAlumnosPage({
  params,
}: {
  params: { grupoId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('id, grado, grupo, ciclo_escolar, maestro_id')
    .eq('id', params.grupoId)
    .single()

  if (!grupo || grupo.maestro_id !== user.id) redirect('/app/grupos')

  return <ImportarClient grupo={grupo} />
}
