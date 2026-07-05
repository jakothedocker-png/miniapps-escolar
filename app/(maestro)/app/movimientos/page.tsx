import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MovimientosClient from './MovimientosClient'

export default async function MovimientosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  // El maestro ve los movimientos de las escuelas donde tiene grupos
  const { data: grupos } = await admin
    .from('grupos')
    .select('escuela_id')
    .eq('maestro_id', user.id)

  const escuelaIds = Array.from(new Set((grupos ?? []).map(g => g.escuela_id)))

  if (escuelaIds.length === 0) {
    return (
      <div className="p-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1E2D3D' }}>Movimientos</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>No tienes grupos asignados.</p>
      </div>
    )
  }

  const { data: movimientos } = await admin
    .from('movimientos')
    .select('id, tipo, alumno_nombre, curp, motivo, autorizo_nombre, fecha')
    .in('escuela_id', escuelaIds)
    .order('fecha', { ascending: false })
    .limit(500)

  return <MovimientosClient movimientos={movimientos ?? []} />
}
