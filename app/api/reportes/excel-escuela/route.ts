import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const TRIMESTRE_LABEL: Record<number, string> = {
  1: '1ER TRIMESTRE',
  2: '2DO TRIMESTRE',
  3: '3ER TRIMESTRE',
}

function getDataFromCURP(curp: string | null): { edad: string; sexo: string } {
  if (!curp || curp.length < 18) return { edad: '', sexo: '' }
  const sexoLetra = curp.charAt(10).toUpperCase()
  const sexo = sexoLetra === 'H' ? 'H' : sexoLetra === 'M' ? 'M' : ''
  const yy = parseInt(curp.substring(4, 6))
  const fullYear = yy + (yy < 30 ? 2000 : 1900)
  const birthDate = new Date(fullYear, parseInt(curp.substring(6, 8)) - 1, parseInt(curp.substring(8, 10)))
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return { edad: String(age), sexo }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const escuelaId = searchParams.get('escuelaId')
  const trimestre = parseInt(searchParams.get('trimestre') || '1')

  if (!escuelaId) return new NextResponse('escuelaId requerido', { status: 400 })

  const admin = createAdminClient()

  const [{ data: usuario }, { data: escuela }] = await Promise.all([
    admin.from('usuarios').select('rol, escuela_id, zona_id, licencia_plan, licencia_periodos').eq('id', user.id).single(),
    admin.from('escuelas').select('*').eq('id', escuelaId).single(),
  ])

  if (!usuario || !escuela) return new NextResponse('No encontrado', { status: 404 })

  const esDirector = usuario.rol === 'director' && usuario.escuela_id === escuelaId
  const esSupervisor = usuario.rol === 'supervisor' && escuela.zona_id === usuario.zona_id
  const esSuperadmin = usuario.rol === 'superadmin'

  if (!esDirector && !esSupervisor && !esSuperadmin) {
    return new NextResponse('Sin permisos', { status: 403 })
  }

  const PERIODOS_PAGO = ['trimestre_1', 'trimestre_2', 'trimestre_3']
  const sinPlan = usuario.licencia_plan !== 'legacy' &&
    !PERIODOS_PAGO.some(p => (usuario.licencia_periodos ?? []).includes(p))
  if (sinPlan) return new NextResponse('Contrata un plan para descargar reportes', { status: 403 })

  const { data: grupos } = await admin
    .from('grupos')
    .select('*')
    .eq('escuela_id', escuelaId)
    .order('grado')
    .order('grupo')

  if (!grupos || grupos.length === 0) {
    return new NextResponse('No hay grupos en esta escuela', { status: 404 })
  }

  const wb = XLSX.utils.book_new()

  for (const grupo of grupos) {
    const [{ data: alumnos }, { data: evaluaciones }] = await Promise.all([
      admin
        .from('alumnos')
        .select('*')
        .eq('grupo_id', grupo.id)
        .eq('activo', true)
        .eq('deleted', false)
        .order('apellido_paterno'),
      admin
        .from('evaluaciones')
        .select('*')
        .eq('grupo_id', grupo.id)
        .eq('trimestre', trimestre)
        .eq('ciclo_escolar', grupo.ciclo_escolar),
    ])

    const evMap = new Map((evaluaciones ?? []).map(e => [e.alumno_id, e]))
    const alumnosList = alumnos ?? []

    const metaRows = [
      ['MINIAPPS ESCOLAR — REPORTE DE CALIFICACIONES'],
      [`Escuela: ${escuela.nombre}`, '', `C.C.T.: ${escuela.cct}`, '', `Turno: ${escuela.turno?.toUpperCase() ?? ''}`],
      [`Municipio: ${escuela.municipio ?? ''}`, '', `Grado: ${grupo.grado}`, `Grupo: ${grupo.grupo}`, `Ciclo: ${grupo.ciclo_escolar}`],
      [`Período: ${TRIMESTRE_LABEL[trimestre] ?? ''}`, '', `Fecha: ${new Date().toLocaleDateString('es-MX')}`],
      [],
    ]

    const headerRow = [
      'N.P.',
      'APELLIDOS Y NOMBRE',
      'GÉNERO',
      'EDAD',
      'INASISTENCIAS',
      'LENGUAJES',
      'SABERES Y P.C.',
      'ÉTICA, N. Y S.',
      'DE LO HUMANO',
      'PROMEDIO',
    ]

    const dataRows = alumnosList.map((alumno, idx) => {
      const ev = evMap.get(alumno.id)
      const { edad, sexo } = getDataFromCURP(alumno.curp)
      const nombre = `${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''} ${alumno.nombre}`.toUpperCase().replace(/\s+/g, ' ').trim()

      const campos = ['lenguajes', 'saberes', 'etica', 'humanos'] as const
      const vals = campos.map(c => {
        const v = ev?.[c]
        return v !== null && v !== undefined ? Number(v) : null
      })
      const validos = vals.filter(v => v !== null) as number[]
      const prom = validos.length > 0 ? Math.round((validos.reduce((a, b) => a + b, 0) / validos.length) * 10) / 10 : null

      return [
        idx + 1,
        nombre,
        sexo,
        edad ? Number(edad) : '',
        ev?.inasistencias ?? 0,
        vals[0] !== null ? vals[0] : '',
        vals[1] !== null ? vals[1] : '',
        vals[2] !== null ? vals[2] : '',
        vals[3] !== null ? vals[3] : '',
        prom !== null ? prom : '',
      ]
    })

    const campos = ['lenguajes', 'saberes', 'etica', 'humanos'] as const
    const sumas: Record<string, number> = { lenguajes: 0, saberes: 0, etica: 0, humanos: 0 }
    const conteos: Record<string, number> = { lenguajes: 0, saberes: 0, etica: 0, humanos: 0 }
    let sumProms = 0; let cntProms = 0

    alumnosList.forEach(alumno => {
      const ev = evMap.get(alumno.id)
      campos.forEach(c => {
        const v = ev?.[c]
        if (v !== null && v !== undefined) { sumas[c] += Number(v); conteos[c]++ }
      })
      const vals = campos.map(c => { const v = ev?.[c]; return v !== null && v !== undefined ? Number(v) : null }).filter(v => v !== null) as number[]
      if (vals.length > 0) { sumProms += vals.reduce((a, b) => a + b, 0) / vals.length; cntProms++ }
    })

    const promedioRow = [
      '',
      'PROMEDIOS DEL GRUPO',
      '', '', '',
      conteos.lenguajes > 0 ? parseFloat((sumas.lenguajes / conteos.lenguajes).toFixed(1)) : '',
      conteos.saberes   > 0 ? parseFloat((sumas.saberes   / conteos.saberes  ).toFixed(1)) : '',
      conteos.etica     > 0 ? parseFloat((sumas.etica     / conteos.etica    ).toFixed(1)) : '',
      conteos.humanos   > 0 ? parseFloat((sumas.humanos   / conteos.humanos  ).toFixed(1)) : '',
      cntProms          > 0 ? parseFloat((sumProms         / cntProms         ).toFixed(1)) : '',
    ]

    const allRows = [...metaRows, headerRow, ...dataRows, [], promedioRow]
    const ws = XLSX.utils.aoa_to_sheet(allRows)

    ws['!cols'] = [
      { wch: 5 }, { wch: 40 }, { wch: 7 }, { wch: 6 }, { wch: 12 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
    ]

    const sheetName = `${grupo.grado}° ${grupo.grupo}`.substring(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const filename = `escuela_completa_${escuela.cct}_T${trimestre}_${grupos[0]?.ciclo_escolar ?? ''}.xlsx`
    .replace(/[^\w._-]/g, '_')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
