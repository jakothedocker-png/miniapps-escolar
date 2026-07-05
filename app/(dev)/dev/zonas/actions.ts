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

function generarId(nombre: string) {
  return nombre.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export async function crearZona(data: {
  nombre: string
  estado: string
  ia_habilitada: boolean
  contacto_nombre: string
  contacto_email: string
}) {
  if (!(await esSuperadmin())) return { error: 'Sin permisos' }
  const supabase = createAdminClient()
  const id = generarId(data.nombre)

  const { error } = await supabase.from('zonas').insert({
    id,
    nombre:           data.nombre,
    estado:           data.estado,
    plan:             'legacy',
    ia_habilitada:    data.ia_habilitada,
    ia_plan:          'legacy',
    pagos_requeridos: false,
    estatus:          'activo',
    contacto_admin:   data.contacto_nombre || data.contacto_email
      ? { nombre: data.contacto_nombre, email: data.contacto_email }
      : null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dev/zonas')
  return { ok: true, id }
}

export async function actualizarZona(id: string, data: {
  nombre: string
  estado: string
  ia_habilitada: boolean
  contacto_nombre: string
  contacto_email: string
}) {
  if (!(await esSuperadmin())) return { error: 'Sin permisos' }
  const supabase = createAdminClient()

  const { error } = await supabase.from('zonas').update({
    nombre:        data.nombre,
    estado:        data.estado,
    ia_habilitada: data.ia_habilitada,
    contacto_admin: data.contacto_nombre || data.contacto_email
      ? { nombre: data.contacto_nombre, email: data.contacto_email }
      : null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dev/zonas')
  return { ok: true }
}

export async function toggleEstatusZona(id: string, estatus: string) {
  if (!(await esSuperadmin())) return { error: 'Sin permisos' }
  const supabase = createAdminClient()
  const nuevoEstatus = estatus === 'activo' ? 'suspendido' : 'activo'

  const { error } = await supabase.from('zonas').update({ estatus: nuevoEstatus }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dev/zonas')
  return { ok: true }
}
