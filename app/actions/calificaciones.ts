'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TRIMESTRE_A_PERIODO: Record<number, string> = {
  0: 'diagnostico',
  1: 'trimestre_1',
  2: 'trimestre_2',
  3: 'trimestre_3',
}

async function verificarPeriodo(
  admin: ReturnType<typeof createAdminClient>,
  maestroId: string,
  trimestre: number,
  alumnoId?: string,
): Promise<string | null> {
  const { data: usuario } = await admin
    .from('usuarios')
    .select('licencia_plan, licencia_periodos')
    .eq('id', maestroId)
    .single()

  if (!usuario) return 'Usuario no encontrado'
  if (usuario.licencia_plan === 'legacy') return null

  const periodo = TRIMESTRE_A_PERIODO[trimestre]

  // Trial: diagnóstico libre; T1 gratis con límite de 2 alumnos; T2/T3 bloqueados
  if (usuario.licencia_plan === 'trial') {
    if (periodo === 'diagnostico') return null

    if (periodo === 'trimestre_1') {
      if (alumnoId) {
        // Si ya existe una evaluación de T1 para este alumno → es actualización, siempre permitida
        const { count: yaExiste } = await admin
          .from('evaluaciones')
          .select('*', { count: 'exact', head: true })
          .eq('alumno_id', alumnoId)
          .eq('maestro_id', maestroId)
          .eq('trimestre', 1)
        if ((yaExiste ?? 0) > 0) return null
      }
      // Nuevo alumno en T1: verificar que no se superen los 2 slots gratuitos
      const { data: existentesT1 } = await admin
        .from('evaluaciones')
        .select('alumno_id')
        .eq('maestro_id', maestroId)
        .eq('trimestre', 1)
      const uniqueAlumnos = new Set((existentesT1 ?? []).map(e => e.alumno_id)).size
      if (uniqueAlumnos >= 2) {
        return 'Tu prueba incluye 2 alumnos gratis en el 1er Trimestre. Activa tu licencia para capturar a todos.'
      }
      return null
    }

    return `El ${trimestre}er Trimestre requiere una licencia activa. Activa tu plan para continuar.`
  }

  const periodos: string[] = usuario.licencia_periodos ?? []
  if (!periodos.includes(periodo)) {
    const nombrePeriodo = periodo === 'diagnostico' ? 'Diagnóstico' : `${trimestre}er Trimestre`
    return `Tu plan no incluye el ${nombrePeriodo}. Contacta a soporte para ampliar tu licencia.`
  }
  return null
}

const CAMPOS_FORMATIVOS = ['lenguajes', 'saberes', 'etica', 'humanos'] as const

interface ValoresCampos {
  alumno_id: string
  trimestre: number
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
}

interface CambioCalif {
  alumno_id: string
  campo: string
  valor_anterior: number
  valor_nuevo: number | null
  trimestre: number
}

// Solo se audita la modificación de una calificación ya guardada (paridad con SIDEC).
// Se llama ANTES del upsert; los registros se insertan solo si el guardado tuvo éxito.
async function detectarCambios(
  admin: ReturnType<typeof createAdminClient>,
  items: ValoresCampos[],
  cicloEscolar: string,
): Promise<CambioCalif[]> {
  const alumnoIds = [...new Set(items.map(i => i.alumno_id))]
  const trimestres = [...new Set(items.map(i => i.trimestre))]

  const { data: existentes } = await admin
    .from('evaluaciones')
    .select('alumno_id, trimestre, lenguajes, saberes, etica, humanos')
    .in('alumno_id', alumnoIds)
    .in('trimestre', trimestres)
    .eq('ciclo_escolar', cicloEscolar)

  if (!existentes || existentes.length === 0) return []

  const prevMap = new Map(existentes.map(e => [`${e.alumno_id}|${e.trimestre}`, e]))
  const cambios: CambioCalif[] = []

  items.forEach(item => {
    const prev = prevMap.get(`${item.alumno_id}|${item.trimestre}`)
    if (!prev) return
    CAMPOS_FORMATIVOS.forEach(campo => {
      const anterior = prev[campo] !== null && prev[campo] !== undefined ? Number(prev[campo]) : null
      const nuevo = item[campo]
      if (anterior === null || anterior === nuevo) return
      cambios.push({
        alumno_id: item.alumno_id,
        campo,
        valor_anterior: anterior,
        valor_nuevo: nuevo,
        trimestre: item.trimestre,
      })
    })
  })

  return cambios
}

async function registrarAuditoria(
  admin: ReturnType<typeof createAdminClient>,
  cambios: CambioCalif[],
  ctx: { editorId: string; cicloEscolar: string; escuelaId: string; zonaId: string },
) {
  if (cambios.length === 0) return

  const alumnoIds = [...new Set(cambios.map(c => c.alumno_id))]
  const [{ data: editor }, { data: alumnos }] = await Promise.all([
    admin.from('usuarios').select('nombre').eq('id', ctx.editorId).single(),
    admin.from('alumnos').select('id, nombre, apellido_paterno, apellido_materno').in('id', alumnoIds),
  ])

  const nombreAlumno = new Map(
    (alumnos ?? []).map(a => [
      a.id,
      `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.replace(/\s+/g, ' ').trim(),
    ])
  )

  const rows = cambios.map(c => ({
    editor_id:      ctx.editorId,
    editor_nombre:  editor?.nombre ?? 'Desconocido',
    alumno_nombre:  nombreAlumno.get(c.alumno_id) ?? 'Desconocido',
    campo:          c.campo,
    valor_anterior: c.valor_anterior,
    valor_nuevo:    c.valor_nuevo,
    trimestre:      c.trimestre,
    ciclo_escolar:  ctx.cicloEscolar,
    escuela_id:     ctx.escuelaId,
    zona_id:        ctx.zonaId,
  }))

  // La auditoría nunca debe bloquear el guardado de calificaciones
  const { error } = await admin.from('auditoria_calificaciones').insert(rows)
  if (error) console.error('Error al registrar auditoría de calificaciones:', error.message)
}

interface CalificacionItem {
  alumno_id: string
  grupo_id: string
  trimestre: 0 | 1 | 2 | 3
  ciclo_escolar: string
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
  inasistencias: number
  promedio_general: number | null
}

export async function guardarCalificaciones(
  calificaciones: CalificacionItem[],
  grupoId: string
) {
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

  if (calificaciones.length === 0) return { ok: true }

  const trimestre = calificaciones[0].trimestre
  const periodoError = await verificarPeriodo(admin, user.id, trimestre)
  if (periodoError) return { error: periodoError }

  // Para trial en T1: verificar límite batch antes de crear filas nuevas
  if (trimestre === 1) {
    const { data: usrPlan } = await admin
      .from('usuarios')
      .select('licencia_plan')
      .eq('id', user.id)
      .single()

    if (usrPlan?.licencia_plan === 'trial') {
      const { data: existentesT1 } = await admin
        .from('evaluaciones')
        .select('alumno_id')
        .eq('maestro_id', user.id)
        .eq('trimestre', 1)
      const existingIds = new Set((existentesT1 ?? []).map(e => e.alumno_id))

      // Solo cuentan filas con datos reales (no filas vacías)
      const conDatos = calificaciones.filter(
        c => c.lenguajes !== null || c.saberes !== null || c.etica !== null || c.humanos !== null || c.inasistencias > 0
      )
      const nuevosConDatos = conDatos.filter(c => !existingIds.has(c.alumno_id))

      if (existingIds.size + nuevosConDatos.length > 2) {
        return { error: 'Tu prueba incluye 2 alumnos gratis en el 1er Trimestre. Activa tu licencia para capturar a todos.' }
      }
    }
  }

  const cicloEscolar = calificaciones[0].ciclo_escolar
  const cambios = await detectarCambios(admin, calificaciones, cicloEscolar)

  const rows = calificaciones.map(c => ({
    alumno_id:       c.alumno_id,
    grupo_id:        c.grupo_id,
    maestro_id:      user.id,
    trimestre:       c.trimestre,
    ciclo_escolar:   c.ciclo_escolar,
    lenguajes:       c.lenguajes,
    saberes:         c.saberes,
    etica:           c.etica,
    humanos:         c.humanos,
    inasistencias:   c.inasistencias,
    promedio_general: c.promedio_general,
    escuela_id:      usuario.escuela_id,
    zona_id:         usuario.zona_id,
  }))

  const { error } = await admin
    .from('evaluaciones')
    .upsert(rows, { onConflict: 'alumno_id,trimestre,ciclo_escolar' })

  if (error) return { error: error.message }

  await registrarAuditoria(admin, cambios, {
    editorId: user.id,
    cicloEscolar,
    escuelaId: usuario.escuela_id,
    zonaId: usuario.zona_id,
  })

  revalidatePath(`/app/grupos/${grupoId}/calificaciones`)
  revalidatePath('/app/dashboard')
  return { ok: true }
}

export async function guardarAlumnoCalif(row: {
  alumno_id: string
  grupo_id: string
  trimestre: 0 | 1 | 2 | 3
  ciclo_escolar: string
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
  inasistencias: number
  promedio_general: number | null
}) {
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
  if (!usuario.escuela_id) return { error: 'Sin escuela asignada' }

  const periodoError = await verificarPeriodo(admin, user.id, row.trimestre, row.alumno_id)
  if (periodoError) return { error: periodoError }

  const cambios = await detectarCambios(admin, [row], row.ciclo_escolar)

  const { error } = await admin
    .from('evaluaciones')
    .upsert({
      alumno_id:        row.alumno_id,
      grupo_id:         row.grupo_id,
      maestro_id:       user.id,
      trimestre:        row.trimestre,
      ciclo_escolar:    row.ciclo_escolar,
      lenguajes:        row.lenguajes,
      saberes:          row.saberes,
      etica:            row.etica,
      humanos:          row.humanos,
      inasistencias:    row.inasistencias,
      promedio_general: row.promedio_general,
      escuela_id:       usuario.escuela_id,
      zona_id:          usuario.zona_id,
    }, { onConflict: 'alumno_id,trimestre,ciclo_escolar' })

  if (error) return { error: error.message }

  await registrarAuditoria(admin, cambios, {
    editorId: user.id,
    cicloEscolar: row.ciclo_escolar,
    escuelaId: usuario.escuela_id,
    zonaId: usuario.zona_id,
  })

  return { ok: true }
}

export async function guardarObsCampo(data: {
  alumno_id: string
  grupo_id: string
  trimestre: 0 | 1 | 2 | 3
  ciclo_escolar: string
  campo: 'lenguajes' | 'saberes' | 'etica' | 'humanos'
  texto: string
}) {
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
  if (!usuario.escuela_id) return { error: 'Sin escuela asignada' }

  const obsField = `obs_${data.campo}`

  // Intentar UPDATE sobre la fila existente
  const { data: updated } = await admin
    .from('evaluaciones')
    .update({ [obsField]: data.texto || null })
    .eq('alumno_id', data.alumno_id)
    .eq('trimestre', data.trimestre)
    .eq('ciclo_escolar', data.ciclo_escolar)
    .select('id')

  if (!updated || updated.length === 0) {
    // No existe la fila aún — crear una mínima
    const { error } = await admin.from('evaluaciones').insert({
      alumno_id:     data.alumno_id,
      grupo_id:      data.grupo_id,
      maestro_id:    user.id,
      trimestre:     data.trimestre,
      ciclo_escolar: data.ciclo_escolar,
      [obsField]:    data.texto || null,
      escuela_id:    usuario.escuela_id,
      zona_id:       usuario.zona_id,
    })
    if (error) return { error: error.message }
  }

  revalidatePath(`/app/grupos/${data.grupo_id}/calificaciones`)
  return { ok: true }
}

export async function guardarAntecedentes(data: {
  alumno_id: string
  grupo_id: string
  ciclo_escolar: string
  trimestres: Array<{
    trimestre: 0 | 1 | 2 | 3
    lenguajes: number | null
    saberes: number | null
    etica: number | null
    humanos: number | null
    inasistencias: number
  }>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('escuela_id, zona_id, maestro_id')
    .eq('id', data.grupo_id)
    .single()

  if (!grupo) return { error: 'Grupo no encontrado' }
  if (grupo.maestro_id !== user.id) return { error: 'Sin permisos sobre este grupo' }

  const trimestresValidos = data.trimestres.filter(
    t => t.lenguajes !== null || t.saberes !== null || t.etica !== null || t.humanos !== null
  )

  if (trimestresValidos.length === 0) return { ok: true }

  const cambios = await detectarCambios(
    admin,
    trimestresValidos.map(t => ({ ...t, alumno_id: data.alumno_id })),
    data.ciclo_escolar,
  )

  const rows = trimestresValidos.map(t => {
    const vals = [t.lenguajes, t.saberes, t.etica, t.humanos].filter(v => v !== null) as number[]
    // Truncado, no redondeo (regla del proyecto: 9.75 → 9.7)
    const promedio = vals.length > 0 ? Math.floor((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
    return {
      alumno_id: data.alumno_id,
      grupo_id: data.grupo_id,
      maestro_id: user.id,
      trimestre: t.trimestre,
      ciclo_escolar: data.ciclo_escolar,
      lenguajes: t.lenguajes,
      saberes: t.saberes,
      etica: t.etica,
      humanos: t.humanos,
      inasistencias: t.inasistencias,
      promedio_general: promedio,
      escuela_id: grupo.escuela_id,
      zona_id: grupo.zona_id,
    }
  })

  const { error } = await admin
    .from('evaluaciones')
    .upsert(rows, { onConflict: 'alumno_id,trimestre,ciclo_escolar' })

  if (error) return { error: error.message }

  await registrarAuditoria(admin, cambios, {
    editorId: user.id,
    cicloEscolar: data.ciclo_escolar,
    escuelaId: grupo.escuela_id,
    zonaId: grupo.zona_id,
  })

  revalidatePath(`/app/grupos/${data.grupo_id}/alumnos`)
  return { ok: true }
}

export async function guardarObservacion(data: {
  alumno_id: string
  grupo_id: string
  trimestre: 0 | 1 | 2 | 3
  ciclo_escolar: string
  descripcion_maestro: string
  observacion_1: string
  observacion_2: string
  observacion_seleccionada: 1 | 2 | null
  texto_final: string
  generada_con_ia: boolean
}) {
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

  const { error } = await admin
    .from('observaciones')
    .upsert({
      alumno_id:               data.alumno_id,
      grupo_id:                data.grupo_id,
      maestro_id:              user.id,
      trimestre:               data.trimestre,
      ciclo_escolar:           data.ciclo_escolar,
      descripcion_maestro:     data.descripcion_maestro,
      observacion_1:           data.observacion_1,
      observacion_2:           data.observacion_2,
      observacion_seleccionada: data.observacion_seleccionada,
      texto_final:             data.texto_final,
      generada_con_ia:         data.generada_con_ia,
      escuela_id:              usuario.escuela_id,
      zona_id:                 usuario.zona_id,
    }, { onConflict: 'alumno_id,trimestre,ciclo_escolar' })

  if (error) return { error: error.message }

  return { ok: true }
}
