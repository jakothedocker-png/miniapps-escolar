import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { anthropic, MODELO_IA } from '@/lib/anthropic/client'
import { SYSTEM_PROMPT_OBSERVACIONES, SYSTEM_PROMPT_OBS_CAMPO } from '@/lib/anthropic/prompts'

const CAMPOS_LABEL: Record<string, string> = {
  lenguajes: 'Lenguajes',
  saberes:   'Saberes y Pensamiento Científico',
  etica:     'Ética, Naturaleza y Sociedades',
  humanos:   'De lo Humano y lo Comunitario',
}

interface RequestBody {
  alumno_id: string
  trimestre: 1 | 2 | 3
  ciclo_escolar: string
  descripcion_maestro: string
  campo?: string
}

export async function POST(request: NextRequest) {
  // 1. Verificar sesión
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // 2. Obtener usuario
  const { data: usuario, error: usuarioError } = await adminClient
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (usuarioError || !usuario) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
  }
  if (usuario.rol !== 'maestro') {
    return NextResponse.json({ error: 'Solo maestros' }, { status: 403 })
  }

  // 3. Parsear body primero (necesario para verificar el periodo)
  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const { alumno_id, trimestre, ciclo_escolar, campo } = body
  const descripcion_maestro = body.descripcion_maestro?.trim() ?? ''

  if (!alumno_id || trimestre === undefined || !ciclo_escolar) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }
  if (descripcion_maestro.length > 300) {
    return NextResponse.json({ error: 'descripcion_maestro excede 300 caracteres' }, { status: 400 })
  }

  // 4. Verificar licencia y acceso al periodo
  const esLegacy = usuario.licencia_plan === 'legacy'
  const esTrial  = usuario.licencia_plan === 'trial'
  const licenciaVencida = !esLegacy && !esTrial && usuario.licencia_vence && new Date(usuario.licencia_vence) < new Date()

  if (licenciaVencida) {
    return NextResponse.json({ error: 'Licencia vencida. Renueva tu acceso para continuar.' }, { status: 403 })
  }

  if (!esLegacy) {
    const PERIODO_IA: Record<number, string> = {
      0: 'diagnostico', 1: 'trimestre_1', 2: 'trimestre_2', 3: 'trimestre_3',
    }
    const periodoSolicitado = PERIODO_IA[trimestre]

    // Diagnóstico: nunca genera IA (gratis pero sin costo de tokens)
    if (periodoSolicitado === 'diagnostico') {
      return NextResponse.json(
        { error: 'La IA no está disponible en el Diagnóstico. Disponible a partir del 1er Trimestre.' },
        { status: 403 }
      )
    }

    if (esTrial) {
      // Trial solo tiene acceso gratis a T1 (2 observaciones IA)
      if (periodoSolicitado !== 'trimestre_1') {
        return NextResponse.json(
          { error: 'Tu prueba gratuita solo incluye el 1er Trimestre. Activa tu licencia para acceder a todos los trimestres.' },
          { status: 403 }
        )
      }
      const usosPrueba = usuario.ia_usos_prueba ?? 0
      if (usosPrueba >= 2) {
        return NextResponse.json(
          { error: 'Has utilizado tus 2 observaciones de IA gratuitas. Activa tu licencia para continuar.' },
          { status: 403 }
        )
      }
    } else {
      // Usuario de pago: verificar que el periodo esté en su plan
      const periodos: string[] = usuario.licencia_periodos ?? []
      if (!periodos.includes(periodoSolicitado)) {
        return NextResponse.json(
          { error: 'Tu plan no incluye este trimestre. Contacta a soporte para ampliar tu licencia.' },
          { status: 403 }
        )
      }
    }
  }

  // 5. Límite diario (no aplica a trial — ya tienen límite absoluto de 2)
  const hoy = new Date().toISOString().split('T')[0]
  if (!esTrial && usuario.ia_usos_hoy_fecha === hoy && (usuario.ia_usos_hoy ?? 0) >= 60) {
    return NextResponse.json({ error: 'Límite diario alcanzado (60 generaciones)' }, { status: 429 })
  }

  const es_prueba = esTrial
  const usos_restantes: number | null = esTrial ? Math.max(0, 2 - ((usuario.ia_usos_prueba ?? 0) + 1)) : null

  // 7. Verificar alumno y pertenencia al maestro
  const { data: alumno, error: alumnoError } = await adminClient
    .from('alumnos')
    .select('*, grupos!inner(grado, grupo, maestro_id)')
    .eq('id', alumno_id)
    .single()

  if (alumnoError || !alumno) {
    return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
  }

  const grupo = Array.isArray(alumno.grupos) ? alumno.grupos[0] : alumno.grupos
  if (grupo?.maestro_id !== user.id) {
    return NextResponse.json({ error: 'No tienes acceso a este alumno' }, { status: 403 })
  }

  // 8. Obtener calificaciones del alumno
  const { data: evaluacion } = await adminClient
    .from('evaluaciones')
    .select('id, lenguajes, saberes, etica, humanos, grupo_id, escuela_id, zona_id, ia_usos_lenguajes, ia_usos_saberes, ia_usos_etica, ia_usos_humanos')
    .eq('alumno_id', alumno_id)
    .eq('trimestre', trimestre)
    .maybeSingle()

  // 8b. Verificar límite de usos IA por campo (máx 2)
  const esCampoPorCampo = !!campo
  if (esCampoPorCampo && campo) {
    const iaUsosKey = `ia_usos_${campo}`
    const usosCampo = ((evaluacion as Record<string, unknown>)?.[iaUsosKey] as number) ?? 0
    if (usosCampo >= 2) {
      return NextResponse.json(
        { error: 'Límite de 2 generaciones por campo alcanzado para este alumno.' },
        { status: 403 }
      )
    }
  }

  // 9. Construir prompt
  const nombreCompleto = `${alumno.nombre} ${alumno.apellido_paterno}`
  const grado = grupo?.grado ?? '?'

  let systemPrompt: string
  let userPrompt: string

  if (esCampoPorCampo) {
    const campoLabel = CAMPOS_LABEL[campo] ?? campo
    systemPrompt = SYSTEM_PROMPT_OBS_CAMPO
    userPrompt = `Alumno: ${nombreCompleto}, ${grado} grado
Trimestre: ${trimestre}
Campo formativo a observar: ${campoLabel}
Calificación en este campo: ${evaluacion?.[campo as keyof typeof evaluacion] ?? 'N/A'}
${descripcion_maestro ? `Descripción del maestro: ${descripcion_maestro}` : `Contexto: alumno de ${grado} grado`}`
  } else {
    systemPrompt = SYSTEM_PROMPT_OBSERVACIONES
    userPrompt = `Alumno: ${nombreCompleto}, ${grado} grado
Trimestre: ${trimestre}
Promedios: Lenguajes ${evaluacion?.lenguajes ?? 'N/A'}, Saberes ${evaluacion?.saberes ?? 'N/A'}, Ética ${evaluacion?.etica ?? 'N/A'}, Humano y Comunitario ${evaluacion?.humanos ?? 'N/A'}
Descripción del maestro: ${descripcion_maestro || 'Sin descripción adicional'}`
  }

  // 10. Llamar IA (con reintento si las observaciones salen cortas)
  let observacion_1 = ''
  let observacion_2 = ''
  let tokens_input = 0
  let tokens_output = 0

  const llamarIA = async (mensajes: Array<{ role: string; content: string }>) => {
    const aiResponse = await anthropic.messages.create({
      model: MODELO_IA,
      max_tokens: 900,
      system: systemPrompt,
      messages: mensajes,
    })
    tokens_input  += aiResponse.usage.input_tokens
    tokens_output += aiResponse.usage.output_tokens
    const rawText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed  = JSON.parse(cleaned)
    return {
      obs1: (parsed.observacion_1 ?? '').slice(0, 500),
      obs2: (parsed.observacion_2 ?? '').slice(0, 500),
    }
  }

  try {
    const intento1 = await llamarIA([{ role: 'user', content: userPrompt }])
    observacion_1 = intento1.obs1
    observacion_2 = intento1.obs2

    // Si alguna queda corta, reintenta una vez con instrucción explícita de longitud
    if (observacion_1.length < 350 || observacion_2.length < 350) {
      const refuerzo = `${userPrompt}\n\nIMPORTANTE: Las observaciones DEBEN tener mínimo 350 caracteres cada una. Amplía con estrategias concretas y pasos de acción específicos hasta alcanzar ese mínimo.`
      const intento2 = await llamarIA([{ role: 'user', content: refuerzo }])
      observacion_1 = intento2.obs1
      observacion_2 = intento2.obs2
    }
  } catch (err) {
    console.error('Error IA:', err)
    return NextResponse.json({ error: 'Error al generar observaciones con IA' }, { status: 500 })
  }

  const zona_id = evaluacion?.zona_id ?? alumno.zona_id ?? usuario.zona_id
  const grupo_id = evaluacion?.grupo_id ?? alumno.grupo_id
  const escuela_id = evaluacion?.escuela_id ?? alumno.escuela_id

  // 11a. Si es campo específico y existe evaluación, guardar par generado e incrementar usos
  let usos_campo: number | null = null
  if (esCampoPorCampo && campo && evaluacion?.id) {
    const iaUsosKey = `ia_usos_${campo}`
    const iaObsKey  = `ia_obs_${campo}`
    const usosActuales = ((evaluacion as Record<string, unknown>)[iaUsosKey] as number) ?? 0
    const nuevosUsos = usosActuales + 1
    await adminClient
      .from('evaluaciones')
      .update({
        [iaObsKey]:  { op1: observacion_1, op2: observacion_2 },
        [iaUsosKey]: nuevosUsos,
      })
      .eq('id', evaluacion.id)
    usos_campo = nuevosUsos
  }

  // 11b. Si es observación general (sin campo), guardar en tabla observaciones
  if (!esCampoPorCampo) {
    await adminClient
      .from('observaciones')
      .upsert(
        {
          alumno_id,
          grupo_id,
          maestro_id: user.id,
          trimestre,
          ciclo_escolar,
          descripcion_maestro,
          observacion_1,
          observacion_2,
          generada_con_ia: true,
          tokens_usados: tokens_input + tokens_output,
          escuela_id,
          zona_id,
        },
        { onConflict: 'alumno_id,trimestre,ciclo_escolar' }
      )
  }

  // 12. Log de IA (siempre)
  const costo_usd = (tokens_input * 0.001 + tokens_output * 0.005) / 1000
  await adminClient.from('logs_ia').insert({
    maestro_id: user.id,
    alumno_id,
    zona_id,
    tokens_input,
    tokens_output,
    modelo: MODELO_IA,
    costo_usd,
  })

  // 13. Contadores
  if (esTrial) {
    // Trial: incrementar contador absoluto de prueba
    await adminClient
      .from('usuarios')
      .update({ ia_usos_prueba: (usuario.ia_usos_prueba ?? 0) + 1 })
      .eq('id', user.id)
  } else {
    // Pago: contador diario
    if (usuario.ia_usos_hoy_fecha === hoy) {
      await adminClient
        .from('usuarios')
        .update({ ia_usos_hoy: (usuario.ia_usos_hoy ?? 0) + 1 })
        .eq('id', user.id)
    } else {
      await adminClient
        .from('usuarios')
        .update({ ia_usos_hoy: 1, ia_usos_hoy_fecha: hoy })
        .eq('id', user.id)
    }
  }

  return NextResponse.json({ observacion_1, observacion_2, es_prueba, usos_restantes, usos_campo })
}
