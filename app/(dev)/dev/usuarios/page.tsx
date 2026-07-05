import { createAdminClient } from '@/lib/supabase/server'
import UsuariosClient from './UsuariosClient'

export default async function UsuariosPage() {
  const supabase = createAdminClient()
  const [{ data: usuarios }, { data: zonas }, { data: escuelas }] = await Promise.all([
    supabase.from('usuarios').select('*').order('created_at', { ascending: false }),
    supabase.from('zonas').select('*').order('nombre'),
    supabase.from('escuelas').select('id, nombre, cct, zona_id').order('nombre'),
  ])

  return <UsuariosClient usuarios={usuarios ?? []} zonas={zonas ?? []} escuelas={escuelas ?? []} />
}
