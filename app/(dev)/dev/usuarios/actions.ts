'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Los Server Actions son endpoints públicos: el guard del layout /dev no los protege
async function esSuperadmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: usuario } = await createAdminClient()
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()
  return usuario?.rol === 'superadmin'
}

export async function crearUsuario(data: {
  nombre: string
  email: string
  password: string
  zona_id: string
  rol: string
  escuela_id?: string
}) {
  if (!(await esSuperadmin())) return { error: 'Sin permisos' }

  // El director filtra todas sus vistas por usuario.escuela_id: sin escuela vería todo vacío
  if (data.rol === 'director' && !data.escuela_id)
    return { error: 'Un director necesita escuela asignada' }

  const supabase = createAdminClient()

  // Crear en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })

  if (authError) return { error: authError.message }

  // Insertar en tabla usuarios
  const { error: dbError } = await supabase.from('usuarios').insert({
    id: authData.user.id,
    nombre: data.nombre,
    email: data.email,
    zona_id: data.zona_id || null,
    escuela_id: data.escuela_id || null,
    rol: data.rol,
    estatus: 'activo',
  })

  if (dbError) {
    // Revertir: eliminar de Auth si falla la inserción
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/dev/usuarios')
  return { ok: true }
}

export async function toggleEstatusUsuario(id: string, estatus: string) {
  if (!(await esSuperadmin())) return { error: 'Sin permisos' }
  const supabase = createAdminClient()
  const nuevoEstatus = estatus === 'activo' ? 'inactivo' : 'activo'

  const { error } = await supabase.from('usuarios').update({ estatus: nuevoEstatus }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dev/usuarios')
  return { ok: true }
}

const TODOS_LOS_PERIODOS = ['diagnostico', 'trimestre_1', 'trimestre_2', 'trimestre_3']

export async function activarPlan(data: {
  usuarioId: string
  periodos: string[]          // ej: ['trimestre_1'] o todos los 4
  maxAlumnos: number | null   // 30 | 45 | null (ilimitado)
  ciclo: string               // '2025-2026'
  vence: string | null        // fecha ISO de corte absoluta (o null)
}) {
  if (!(await esSuperadmin())) return { error: 'Sin permisos' }
  const supabase = createAdminClient()

  const esTodosLosPeriodos = TODOS_LOS_PERIODOS.every(p => data.periodos.includes(p))
  const plan = data.periodos.length === 0 ? 'trial'
    : esTodosLosPeriodos ? 'anual'
    : 'trimestre'

  const { error } = await supabase
    .from('usuarios')
    .update({
      licencia_plan:        plan,
      licencia_vence:       data.vence,
      licencia_max_alumnos: data.maxAlumnos,
      licencia_ciclo:       data.ciclo,
      licencia_periodos:    data.periodos,
      estatus:              'activo',
    })
    .eq('id', data.usuarioId)

  if (error) return { error: error.message }
  revalidatePath('/dev/usuarios')
  return { ok: true }
}
