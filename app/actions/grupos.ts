'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface DatosGrupo {
  grado: string
  grupo: string
  tipo: 'regular' | 'multigrado'
  ciclo_escolar: string
}

export async function crearGrupo(data: DatosGrupo) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('escuela_id, zona_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'maestro') return { error: 'Sin permisos' }
  if (!usuario.escuela_id) return { error: 'El maestro no tiene escuela asignada' }

  const { error } = await admin.from('grupos').insert({
    grado: data.grado,
    grupo: data.grupo,
    tipo: data.tipo,
    ciclo_escolar: data.ciclo_escolar,
    maestro_id: user.id,
    escuela_id: usuario.escuela_id,
    zona_id: usuario.zona_id,
  })

  if (error) return { error: error.message }

  revalidatePath('/app/grupos')
  revalidatePath('/app/dashboard')
  return { ok: true }
}
