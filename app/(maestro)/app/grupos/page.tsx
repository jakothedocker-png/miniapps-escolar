import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GruposClient from './GruposClient'

export default async function GruposPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: grupos } = await admin
    .from('grupos')
    .select('*')
    .eq('maestro_id', user.id)
    .order('grado')

  // Para cada grupo, obtener conteo de alumnos
  const gruposConAlumnos = await Promise.all(
    (grupos ?? []).map(async (grupo) => {
      const { count } = await admin
        .from('alumnos')
        .select('*', { count: 'exact', head: true })
        .eq('grupo_id', grupo.id)
        .eq('activo', true)
        .eq('deleted', false)

      return { ...grupo, totalAlumnos: count ?? 0 }
    })
  )

  return <GruposClient grupos={gruposConAlumnos} />
}
