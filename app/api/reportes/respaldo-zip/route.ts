import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generarKardexHTML, nombreCompletoAlumno } from '@/lib/reportes/kardex-html'

function sanitizarNombreArchivo(nombre: string): string {
  return nombre
    .replace(/[áàä]/gi, 'A').replace(/[éèë]/gi, 'E')
    .replace(/[íìï]/gi, 'I').replace(/[óòö]/gi, 'O')
    .replace(/[úùü]/gi, 'U').replace(/ñ/gi, 'N')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim().replace(/\s+/g, '_')
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
    admin.from('usuarios').select('rol, escuela_id, zona_id, licencia_plan, licencia_periodos').eq('id', user.id).single(),
    admin.from('grupos').select('*').eq('id', grupoId).single(),
  ])

  if (!grupo || !usuario) return new NextResponse('No encontrado', { status: 404 })

  if (usuario.rol === 'maestro' && grupo.maestro_id !== user.id)
    return new NextResponse('Sin permisos', { status: 403 })
  if (usuario.rol === 'director' && grupo.escuela_id !== usuario.escuela_id)
    return new NextResponse('Sin permisos', { status: 403 })
  if (usuario.rol === 'supervisor' && grupo.zona_id !== usuario.zona_id)
    return new NextResponse('Sin permisos', { status: 403 })

  const PERIODOS_PAGO = ['trimestre_1', 'trimestre_2', 'trimestre_3']
  const sinPlan = usuario.licencia_plan !== 'legacy' &&
    !PERIODOS_PAGO.some(p => (usuario.licencia_periodos ?? []).includes(p))
  if (sinPlan) return new NextResponse('Contrata un plan para descargar reportes', { status: 403 })

  const [
    { data: escuela },
    { data: alumnos },
    { data: evaluaciones },
    { data: maestroData },
    { data: directores },
  ] = await Promise.all([
    admin.from('escuelas').select('*').eq('id', grupo.escuela_id).single(),
    admin.from('alumnos').select('*').eq('grupo_id', grupoId)
      .eq('activo', true).eq('deleted', false).order('apellido_paterno'),
    // Todos los períodos (0=Diag, 1, 2, 3) de todo el grupo en una sola query
    admin.from('evaluaciones').select('*').eq('grupo_id', grupoId).eq('ciclo_escolar', grupo.ciclo_escolar),
    admin.from('usuarios').select('nombre').eq('id', grupo.maestro_id).single(),
    admin.from('usuarios').select('nombre').eq('escuela_id', grupo.escuela_id).eq('rol', 'director'),
  ])

  if (!alumnos || alumnos.length === 0)
    return new NextResponse('El grupo no tiene alumnos activos', { status: 404 })

  const evalsPorAlumno: Record<string, Record<string, unknown>[]> = {}
  ;(evaluaciones ?? []).forEach(e => {
    (evalsPorAlumno[e.alumno_id] ??= []).push(e)
  })

  const maestroNombre = maestroData?.nombre?.toUpperCase() ?? ''
  const directorNombre = directores?.[0]?.nombre?.toUpperCase() ?? ''

  const zip = new JSZip()

  alumnos.forEach((alumno, idx) => {
    const html = generarKardexHTML({
      escuela,
      grupo,
      alumno,
      evaluaciones: evalsPorAlumno[alumno.id] ?? [],
      maestroNombre,
      directorNombre,
      autoPrint: false,
    })
    const np = String(idx + 1).padStart(2, '0')
    zip.file(`${np}_KARDEX_${sanitizarNombreArchivo(nombreCompletoAlumno(alumno))}.html`, html)
  })

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  const nombreZip = `Respaldo_Kardex_${grupo.grado}_${sanitizarNombreArchivo(String(grupo.grupo))}_${grupo.ciclo_escolar}.zip`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nombreZip}"`,
    },
  })
}
