import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguracionClient from './ConfiguracionClient'

export default async function ConfiguracionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: usuario } = await admin
    .from('usuarios')
    .select('nombre, email, escuela_id')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/auth/login')

  // Intentar obtener escuela_id desde el perfil; si no está, buscarlo en los grupos
  let escuelaId: string | null = usuario.escuela_id ?? null

  if (!escuelaId) {
    const { data: grupo } = await admin
      .from('grupos')
      .select('escuela_id')
      .eq('maestro_id', user.id)
      .limit(1)
      .maybeSingle()
    escuelaId = grupo?.escuela_id ?? null
  }

  let escuela = null
  if (escuelaId) {
    // Primero intentamos con todas las columnas (requiere migraciones aplicadas)
    const { data, error } = await admin
      .from('escuelas')
      .select(`id, nombre, cct, municipio, comunidad, estado, turno,
               ciclo_activo,
               fecha_diagnostico, fecha_trimestre_1, fecha_trimestre_2, fecha_trimestre_3,
               director_diagnostico, director_trimestre_1, director_trimestre_2, director_trimestre_3`)
      .eq('id', escuelaId)
      .single()

    if (!error) {
      escuela = data
    } else {
      // Migración aún no aplicada — consulta con columnas base
      const { data: base } = await admin
        .from('escuelas')
        .select('id, nombre, cct, municipio, turno')
        .eq('id', escuelaId)
        .single()

      if (base) {
        escuela = {
          ...base,
          comunidad:            null,
          estado:               'Estado de México',
          ciclo_activo:         '2025-2026',
          fecha_diagnostico:    null,
          fecha_trimestre_1:    null,
          fecha_trimestre_2:    null,
          fecha_trimestre_3:    null,
          director_diagnostico: null,
          director_trimestre_1: null,
          director_trimestre_2: null,
          director_trimestre_3: null,
        }
      }
    }
  }

  return (
    <ConfiguracionClient
      escuela={escuela}
      maestro={{ nombre: usuario.nombre, email: usuario.email }}
    />
  )
}
