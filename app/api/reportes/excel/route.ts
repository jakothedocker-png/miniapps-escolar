import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const CAMPOS = ['lenguajes', 'saberes', 'etica', 'humanos'] as const

const LABEL_CAMPO: Record<string, string> = {
  lenguajes: 'LENGUAJES',
  saberes:   'SABERES Y PENS.',
  etica:     'ETICA NAT. Y SOC.',
  humanos:   'DE LO HUMANO',
}

const OBS_LABEL: Record<string, string> = {
  lenguajes: 'OBS LENGUAJES',
  saberes:   'OBS SABERES',
  etica:     'OBS ETICA',
  humanos:   'OBS HUMANOS',
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const grupoId = searchParams.get('grupoId')
  if (!grupoId) return new NextResponse('grupoId requerido', { status: 400 })

  const admin = createAdminClient()

  const [{ data: usuario }, { data: grupo }] = await Promise.all([
    admin.from('usuarios').select('rol, escuela_id, licencia_plan, licencia_periodos').eq('id', user.id).single(),
    admin.from('grupos').select('*').eq('id', grupoId).single(),
  ])

  if (!grupo || !usuario) return new NextResponse('No encontrado', { status: 404 })

  if (usuario.rol === 'maestro' && grupo.maestro_id !== user.id)
    return new NextResponse('Sin permisos', { status: 403 })
  if (usuario.rol === 'director' && grupo.escuela_id !== usuario.escuela_id)
    return new NextResponse('Sin permisos', { status: 403 })

  const PERIODOS_PAGO = ['trimestre_1', 'trimestre_2', 'trimestre_3']
  const sinPlan = usuario.licencia_plan !== 'legacy' &&
    !PERIODOS_PAGO.some(p => (usuario.licencia_periodos ?? []).includes(p))
  if (sinPlan) return new NextResponse('Contrata un plan para descargar reportes', { status: 403 })

  const [
    { data: alumnos },
    { data: evaluaciones },
  ] = await Promise.all([
    admin.from('alumnos').select('*').eq('grupo_id', grupoId).eq('activo', true).eq('deleted', false).order('apellido_paterno'),
    // Sin filtro de trimestre: trae todos los períodos (0=Diag, 1, 2, 3)
    admin.from('evaluaciones').select('*').eq('grupo_id', grupoId).eq('ciclo_escolar', grupo.ciclo_escolar),
  ])

  // Mapa: alumno_id → { 0: ev, 1: ev, 2: ev, 3: ev }
  type EvRow = Record<string, unknown>
  const evMap = new Map<string, Record<number, EvRow>>()
  ;(evaluaciones ?? []).forEach(ev => {
    if (!evMap.has(ev.alumno_id)) {
      evMap.set(ev.alumno_id, { 0: {}, 1: {}, 2: {}, 3: {} })
    }
    evMap.get(ev.alumno_id)![ev.trimestre] = ev
  })

  // Trunca igual que SIDEC (Math.floor, no Math.round)
  const trunc1 = (v: number) => Math.floor(v * 10) / 10

  // Encabezados
  const headers: string[] = ['NOMBRE', 'CURP', 'GRADO', 'GRUPO']
  CAMPOS.forEach(c => headers.push(`DIAG ${LABEL_CAMPO[c]}`))
  headers.push('DIAG INASIST.')
  ;[1, 2, 3].forEach(t => {
    CAMPOS.forEach(c => headers.push(`T${t} ${LABEL_CAMPO[c]}`))
    CAMPOS.forEach(c => headers.push(`T${t} ${OBS_LABEL[c]}`))
    headers.push(`T${t} INASIST.`)
    headers.push(`T${t} PROMEDIO`)
  })
  headers.push('PROM FINAL')

  const aoa: unknown[][] = [headers]

  ;(alumnos ?? []).forEach(al => {
    const nombre = `${al.apellido_paterno} ${al.apellido_materno ?? ''} ${al.nombre}`
      .toUpperCase().replace(/\s+/g, ' ').trim()
    const periodos = evMap.get(al.id) ?? { 0: {}, 1: {}, 2: {}, 3: {} }

    const row: unknown[] = [nombre, al.curp ?? '', grupo.grado, grupo.grupo]

    // Diagnóstico — calificaciones con 1 decimal, sin observaciones
    const d0 = periodos[0]
    CAMPOS.forEach(c => {
      const v = d0[c]
      row.push(v !== null && v !== undefined ? trunc1(Number(v)) : '')
    })
    row.push(d0.inasistencias !== undefined ? Number(d0.inasistencias) : 0)

    // Trimestres 1, 2, 3 — calificaciones enteras + observaciones + inasistencias + promedio
    const promsTrim: number[] = []
    ;[1, 2, 3].forEach(t => {
      const dt = periodos[t]
      const vals: number[] = []
      CAMPOS.forEach(c => {
        const v = dt[c]
        const n = v !== null && v !== undefined ? Number(v) : null
        row.push(n !== null ? Math.floor(n) : '')   // entero
        if (n !== null) vals.push(n)
      })
      CAMPOS.forEach(c => row.push((dt[`obs_${c}`] as string) ?? ''))
      row.push(dt.inasistencias !== undefined ? Number(dt.inasistencias) : 0)
      const prom = vals.length > 0 ? trunc1(vals.reduce((a, b) => a + b, 0) / vals.length) : ''
      row.push(prom)
      if (typeof prom === 'number') promsTrim.push(prom)
    })

    // Promedio final (T1+T2+T3, sin diagnóstico)
    const promFinal = promsTrim.length > 0
      ? trunc1(promsTrim.reduce((a, b) => a + b, 0) / promsTrim.length)
      : ''
    row.push(promFinal)

    aoa.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = headers.map(h =>
    h.includes('OBS') ? { wch: 30 } : h === 'NOMBRE' ? { wch: 40 } : h === 'CURP' ? { wch: 20 } : { wch: 14 }
  )

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `calificaciones_${grupo.grado}_${grupo.grupo}_${grupo.ciclo_escolar}.xlsx`
    .replace(/[^\w._-]/g, '_')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
