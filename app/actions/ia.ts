'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const CAMPOS = ['lenguajes', 'saberes', 'etica', 'humanos'] as const

async function verificarEditor() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('rol, zona_id')
    .eq('id', user.id)
    .single()

  if (!usuario || !['superadmin', 'supervisor'].includes(usuario.rol)) return null
  return { admin, rol: usuario.rol as string, zonaId: usuario.zona_id as string | null }
}

export interface AlumnoEstadoIA {
  alumno_id: string
  nombre: string
  ciclo_escolar: string
  generado: boolean
}

export async function cargarAlumnosEstadoIA(maestroId: string, trimestre: number) {
  const auth = await verificarEditor()
  if (!auth) return { error: 'Sin permisos' }
  const { admin } = auth

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, ciclo_escolar, zona_id')
    .eq('maestro_id', maestroId)

  if (!grupos || grupos.length === 0) return { alumnos: [] as AlumnoEstadoIA[] }
  if (auth.rol === 'supervisor' && grupos.some(g => g.zona_id !== auth.zonaId))
    return { error: 'Sin permisos sobre esta zona' }

  const grupoIds = grupos.map(g => g.id)
  const ciclo = grupos[0].ciclo_escolar

  const { data: alumnos } = await admin
    .from('alumnos')
    .select('id, nombre, apellido_paterno, apellido_materno')
    .in('grupo_id', grupoIds)
    .eq('activo', true)
    .eq('deleted', false)
    .order('apellido_paterno')

  if (!alumnos || alumnos.length === 0) return { alumnos: [] as AlumnoEstadoIA[] }

  const { data: evaluaciones } = await admin
    .from('evaluaciones')
    .select('alumno_id, ia_obs_lenguajes, ia_obs_saberes, ia_obs_etica, ia_obs_humanos, ia_usos_lenguajes, ia_usos_saberes, ia_usos_etica, ia_usos_humanos')
    .in('alumno_id', alumnos.map(a => a.id))
    .eq('trimestre', trimestre)
    .eq('ciclo_escolar', ciclo)

  const generadoMap = new Map<string, boolean>()
  ;(evaluaciones ?? []).forEach(ev => {
    const tiene = CAMPOS.some(c => ev[`ia_obs_${c}`] !== null || Number(ev[`ia_usos_${c}`]) > 0)
    generadoMap.set(ev.alumno_id, tiene)
  })

  const resultado: AlumnoEstadoIA[] = alumnos.map(a => ({
    alumno_id: a.id,
    nombre: `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.replace(/\s+/g, ' ').trim(),
    ciclo_escolar: ciclo,
    generado: generadoMap.get(a.id) ?? false,
  }))

  return { alumnos: resultado }
}

// Paridad con SIDEC `reiniciarObservacionIA`: borra las opciones generadas y
// reinicia el contador para que el maestro pueda volver a generar.
// La observación escrita (obs_*) se conserva — puede ser texto manual del maestro.
export async function reiniciarObservacionIA(data: {
  alumno_id: string
  trimestre: number
  ciclo_escolar: string
}) {
  const auth = await verificarEditor()
  if (!auth) return { error: 'Sin permisos' }
  const { admin } = auth

  if (auth.rol === 'supervisor') {
    const { data: alumno } = await admin
      .from('alumnos')
      .select('zona_id')
      .eq('id', data.alumno_id)
      .single()
    if (!alumno || alumno.zona_id !== auth.zonaId) return { error: 'Sin permisos sobre esta zona' }
  }

  const { error } = await admin
    .from('evaluaciones')
    .update({
      ia_obs_lenguajes:  null,
      ia_obs_saberes:    null,
      ia_obs_etica:      null,
      ia_obs_humanos:    null,
      ia_usos_lenguajes: 0,
      ia_usos_saberes:   0,
      ia_usos_etica:     0,
      ia_usos_humanos:   0,
    })
    .eq('alumno_id', data.alumno_id)
    .eq('trimestre', data.trimestre)
    .eq('ciclo_escolar', data.ciclo_escolar)

  if (error) return { error: error.message }
  return { ok: true }
}
