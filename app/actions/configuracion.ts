'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function guardarConfigReporte(data: {
  comunidad: string
  municipio: string
  estado: string
  ciclo_activo: string
  fecha_diagnostico: string
  fecha_trimestre_1: string
  fecha_trimestre_2: string
  fecha_trimestre_3: string
  director_diagnostico: string
  director_trimestre_1: string
  director_trimestre_2: string
  director_trimestre_3: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('escuela_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'maestro') return { error: 'Sin permisos' }

  // Escuela puede venir del perfil o de los grupos
  let escuelaId = usuario.escuela_id
  if (!escuelaId) {
    const { data: grupo } = await admin
      .from('grupos')
      .select('escuela_id')
      .eq('maestro_id', user.id)
      .limit(1)
      .maybeSingle()
    escuelaId = grupo?.escuela_id ?? null
  }

  if (!escuelaId) return { error: 'No se encontró tu escuela' }

  const toNull = (s: string) => s.trim() || null

  const { error } = await admin
    .from('escuelas')
    .update({
      comunidad:             toNull(data.comunidad),
      municipio:             toNull(data.municipio),
      estado:                toNull(data.estado),
      ciclo_activo:          toNull(data.ciclo_activo),
      fecha_diagnostico:     toNull(data.fecha_diagnostico),
      fecha_trimestre_1:     toNull(data.fecha_trimestre_1),
      fecha_trimestre_2:     toNull(data.fecha_trimestre_2),
      fecha_trimestre_3:     toNull(data.fecha_trimestre_3),
      director_diagnostico:  toNull(data.director_diagnostico),
      director_trimestre_1:  toNull(data.director_trimestre_1),
      director_trimestre_2:  toNull(data.director_trimestre_2),
      director_trimestre_3:  toNull(data.director_trimestre_3),
    })
    .eq('id', escuelaId)

  if (error) return { error: error.message }

  revalidatePath('/app/configuracion')
  return { ok: true }
}
