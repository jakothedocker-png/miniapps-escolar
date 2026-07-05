'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface DatosAlumno {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  curp: string
  grupo_id: string
}

// Igual que la auditoría de calificaciones: el movimiento se registra desde el
// Server Action (no trigger SQL) y su fallo nunca bloquea la operación principal
async function registrarMovimientos(
  admin: ReturnType<typeof createAdminClient>,
  tipo: 'alta' | 'baja' | 'traslado',
  alumnosMov: Array<{ nombre: string; curp: string | null }>,
  motivo: string,
  ctx: { registradoPor: string; escuelaId: string; zonaId: string },
) {
  try {
    const [{ data: escuela }, { data: editor }] = await Promise.all([
      admin.from('escuelas').select('cct').eq('id', ctx.escuelaId).single(),
      admin.from('usuarios').select('nombre').eq('id', ctx.registradoPor).single(),
    ])

    const rows = alumnosMov.map(a => ({
      tipo,
      alumno_nombre: a.nombre,
      curp: a.curp,
      motivo,
      autorizo_nombre: editor?.nombre ?? null,
      registrado_por: ctx.registradoPor,
      cct: escuela?.cct ?? '',
      escuela_id: ctx.escuelaId,
      zona_id: ctx.zonaId,
    }))

    const { error } = await admin.from('movimientos').insert(rows)
    if (error) console.error('Error al registrar movimiento:', error.message)
  } catch (e) {
    console.error('Error al registrar movimiento:', e)
  }
}

function nombreCompleto(a: { nombre: string; apellido_paterno: string; apellido_materno?: string | null }): string {
  return `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.replace(/\s+/g, ' ').trim().toUpperCase()
}

async function verificarLimiteAlumnos(
  admin: ReturnType<typeof createAdminClient>,
  maestroId: string,
  nuevos = 1,
): Promise<string | null> {
  const { data: usuario } = await admin
    .from('usuarios')
    .select('licencia_max_alumnos')
    .eq('id', maestroId)
    .single()

  const maxAlumnos = usuario?.licencia_max_alumnos ?? null
  if (maxAlumnos === null) return null // plan ilimitado (legacy / premium)

  // Contar alumnos activos del maestro en todos sus grupos
  const { data: grupos } = await admin
    .from('grupos')
    .select('id')
    .eq('maestro_id', maestroId)

  const grupoIds = (grupos ?? []).map(g => g.id)
  if (grupoIds.length === 0) return null

  const { count } = await admin
    .from('alumnos')
    .select('*', { count: 'exact', head: true })
    .eq('deleted', false)
    .in('grupo_id', grupoIds)

  const actuales = count ?? 0
  if (actuales + nuevos > maxAlumnos) {
    return `Tu plan permite un máximo de ${maxAlumnos} alumnos. Actualmente tienes ${actuales}. Contacta a soporte para cambiar de plan.`
  }
  return null
}

export async function crearAlumno(data: DatosAlumno) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  // Verificar que el grupo pertenece al maestro
  const { data: grupo } = await admin
    .from('grupos')
    .select('escuela_id, zona_id, maestro_id')
    .eq('id', data.grupo_id)
    .single()

  if (!grupo) return { error: 'Grupo no encontrado' }
  if (grupo.maestro_id !== user.id) return { error: 'Sin permisos sobre este grupo' }

  // Verificar límite del plan
  const limiteError = await verificarLimiteAlumnos(admin, user.id, 1)
  if (limiteError) return { error: limiteError }

  const { data: insertado, error } = await admin.from('alumnos').insert({
    nombre: data.nombre,
    apellido_paterno: data.apellido_paterno,
    apellido_materno: data.apellido_materno || null,
    curp: data.curp || null,
    grupo_id: data.grupo_id,
    escuela_id: grupo.escuela_id,
    zona_id: grupo.zona_id,
    activo: true,
    deleted: false,
  }).select('id').single()

  if (error) return { error: error.message }

  await registrarMovimientos(admin, 'alta',
    [{ nombre: nombreCompleto(data), curp: data.curp || null }],
    'Inscripción',
    { registradoPor: user.id, escuelaId: grupo.escuela_id, zonaId: grupo.zona_id })

  revalidatePath(`/app/grupos/${data.grupo_id}/alumnos`)
  return { ok: true, alumno_id: insertado?.id as string }
}

export async function editarAlumno(
  alumno_id: string,
  data: { nombre: string; apellido_paterno: string; apellido_materno: string; curp: string }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: alumno } = await admin
    .from('alumnos')
    .select('grupo_id, grupos(maestro_id)')
    .eq('id', alumno_id)
    .single()

  if (!alumno) return { error: 'Alumno no encontrado' }

  const grupo = alumno.grupos as { maestro_id: string } | null
  if (grupo?.maestro_id !== user.id) return { error: 'Sin permisos sobre este alumno' }

  const { error } = await admin
    .from('alumnos')
    .update({
      nombre: data.nombre,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno || null,
      curp: data.curp || null,
    })
    .eq('id', alumno_id)

  if (error) return { error: error.message }

  revalidatePath(`/app/grupos/${alumno.grupo_id}/alumnos`)
  return { ok: true }
}

export async function importarAlumnos(
  alumnos: Array<{ nombre: string; apellido_paterno: string; apellido_materno?: string; curp?: string }>,
  grupo_id: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('escuela_id, zona_id, maestro_id')
    .eq('id', grupo_id)
    .single()

  if (!grupo) return { error: 'Grupo no encontrado' }
  if (grupo.maestro_id !== user.id) return { error: 'Sin permisos sobre este grupo' }

  // Verificar límite del plan (contando todos los alumnos a importar)
  const limiteError = await verificarLimiteAlumnos(admin, user.id, alumnos.length)
  if (limiteError) return { error: limiteError }

  const rows = alumnos.map(a => ({
    nombre: a.nombre,
    apellido_paterno: a.apellido_paterno,
    apellido_materno: a.apellido_materno || null,
    curp: a.curp || null,
    grupo_id,
    escuela_id: grupo.escuela_id,
    zona_id: grupo.zona_id,
    activo: true,
    deleted: false,
  }))

  const { error } = await admin.from('alumnos').insert(rows)
  if (error) return { error: error.message }

  await registrarMovimientos(admin, 'alta',
    alumnos.map(a => ({ nombre: nombreCompleto(a), curp: a.curp || null })),
    'Importación desde Excel',
    { registradoPor: user.id, escuelaId: grupo.escuela_id, zonaId: grupo.zona_id })

  revalidatePath(`/app/grupos/${grupo_id}/alumnos`)
  return { insertados: rows.length }
}

export async function darDeBajaAlumno(alumno_id: string, motivo?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: alumno } = await admin
    .from('alumnos')
    .select('grupo_id, nombre, apellido_paterno, apellido_materno, curp, escuela_id, zona_id, grupos(maestro_id)')
    .eq('id', alumno_id)
    .single()

  if (!alumno) return { error: 'Alumno no encontrado' }

  const grupo = alumno.grupos as unknown as { maestro_id: string } | null
  if (grupo?.maestro_id !== user.id) return { error: 'Sin permisos sobre este alumno' }

  const { error } = await admin
    .from('alumnos')
    .update({ activo: false, deleted: true })
    .eq('id', alumno_id)

  if (error) return { error: error.message }

  await registrarMovimientos(admin, 'baja',
    [{ nombre: nombreCompleto(alumno), curp: alumno.curp ?? null }],
    motivo?.trim() || 'Sin motivo especificado',
    { registradoPor: user.id, escuelaId: alumno.escuela_id, zonaId: alumno.zona_id })

  revalidatePath(`/app/grupos/${alumno.grupo_id}/alumnos`)
  return { ok: true }
}
