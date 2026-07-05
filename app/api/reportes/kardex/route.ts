import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generarKardexHTML } from '@/lib/reportes/kardex-html'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const grupoId  = searchParams.get('grupoId')
  const alumnoId = searchParams.get('alumnoId')

  if (!grupoId || !alumnoId) return new NextResponse('grupoId y alumnoId requeridos', { status: 400 })

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
    { data: alumno },
    { data: evaluaciones },
    { data: maestroData },
    { data: directores },
  ] = await Promise.all([
    admin.from('escuelas').select('*').eq('id', grupo.escuela_id).single(),
    admin.from('alumnos').select('*').eq('id', alumnoId).single(),
    // Sin filtro de trimestre: trae todos los períodos (0=Diag, 1, 2, 3)
    admin.from('evaluaciones').select('*').eq('alumno_id', alumnoId).eq('ciclo_escolar', grupo.ciclo_escolar),
    admin.from('usuarios').select('nombre').eq('id', grupo.maestro_id).single(),
    admin.from('usuarios').select('nombre').eq('escuela_id', grupo.escuela_id).eq('rol', 'director'),
  ])

  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })

  const html = generarKardexHTML({
    escuela,
    grupo,
    alumno,
    evaluaciones: evaluaciones ?? [],
    maestroNombre: maestroData?.nombre?.toUpperCase() ?? '',
    directorNombre: directores?.[0]?.nombre?.toUpperCase() ?? '',
    autoPrint: true,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
