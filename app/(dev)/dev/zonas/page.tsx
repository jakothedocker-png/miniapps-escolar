import { createAdminClient } from '@/lib/supabase/server'
import ZonasClient from './ZonasClient'

export default async function ZonasPage() {
  const supabase = createAdminClient()
  const { data: zonas } = await supabase
    .from('zonas')
    .select('*')
    .order('created_at', { ascending: false })

  return <ZonasClient zonas={zonas ?? []} />
}
