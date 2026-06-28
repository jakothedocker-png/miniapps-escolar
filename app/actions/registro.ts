'use server'

import { createAdminClient } from '@/lib/supabase/server'

interface DatosRegistro {
  nombre: string
  email: string
  password: string
  cct: string
  escuela_nombre: string
  municipio: string
  escuela_id: string | null  // null = crear escuela nueva
}

export async function registrarMaestro(data: DatosRegistro) {
  const supabase = createAdminClient()

  // 1. Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const userId = authData.user.id
  let escuelaId = data.escuela_id
  let zonaId: string

  if (!escuelaId) {
    // 2a. Crear zona contenedora para esta escuela (sin plan — las zonas son siempre activas)
    zonaId = `escuela_${data.cct.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

    const { error: zonaError } = await supabase.from('zonas').upsert({
      id:               zonaId,
      nombre:           data.escuela_nombre,
      estado:           'México',
      plan:             'legacy',
      ia_plan:          'prueba',
      ia_habilitada:    true,
      pagos_requeridos: false,
      estatus:          'activo',
    })
    if (zonaError) {
      await supabase.auth.admin.deleteUser(userId)
      return { error: zonaError.message }
    }

    // 2b. Crear escuela bajo esa zona
    const { data: escuelaData, error: escuelaError } = await supabase
      .from('escuelas')
      .insert({ nombre: data.escuela_nombre, cct: data.cct, zona_id: zonaId, municipio: data.municipio })
      .select('id')
      .single()

    if (escuelaError) {
      await supabase.auth.admin.deleteUser(userId)
      return { error: escuelaError.message }
    }
    escuelaId = escuelaData.id
  } else {
    // 2c. Escuela existente — obtener su zona
    const { data: escuela } = await supabase
      .from('escuelas').select('zona_id').eq('id', escuelaId).single()
    zonaId = escuela!.zona_id
  }

  // 3. Crear registro en tabla usuarios
  // Diagnóstico gratuito y sin vencimiento — la IA y los trimestres se pagan
  const { error: userError } = await supabase.from('usuarios').insert({
    id:                   userId,
    nombre:               data.nombre,
    email:                data.email,
    zona_id:              zonaId,
    escuela_id:           escuelaId,
    rol:                  'maestro',
    estatus:              'activo',
    licencia_plan:        'trial',
    licencia_vence:       null,
    licencia_ciclo:       '2025-2026',
    licencia_periodos:    ['diagnostico'],
    licencia_max_alumnos: null,
  })

  if (userError) {
    await supabase.auth.admin.deleteUser(userId)
    return { error: userError.message }
  }

  return { ok: true }
}
