import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TRIMESTRE_LABEL: Record<number, string> = {
  0: 'DIAGNÓSTICO',
  1: 'PRIMER TRIMESTRE',
  2: 'SEGUNDO TRIMESTRE',
  3: 'TERCER TRIMESTRE',
}

const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function formatFechaCuadro(fechaISO: string | null): string {
  if (fechaISO) {
    const [year, month, day] = fechaISO.split('-').map(Number)
    const mes = MESES_ES[month - 1]
    return `${day} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${year}`
  }
  const now = new Date()
  const mes = MESES_ES[now.getMonth()]
  return `${now.getDate()} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${now.getFullYear()}`
}

function getDataFromCURP(curp: string | null): { edad: string; sexo: string } {
  if (!curp || curp.length < 18) return { edad: '-', sexo: '-' }
  const sexo = curp.charAt(10).toUpperCase() === 'H' ? 'H' : 'M'
  const yy = parseInt(curp.substring(4, 6))
  const year = yy + (yy < 30 ? 2000 : 1900)
  const birth = new Date(year, parseInt(curp.substring(6, 8)) - 1, parseInt(curp.substring(8, 10)))
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--
  return { edad: String(age), sexo }
}

function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined) return ''
  return String(Math.round(val))
}

function fmtProm(val: number): string {
  return val.toFixed(1)
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { searchParams } = new URL(request.url)
  const grupoId  = searchParams.get('grupoId')
  const trimestre = parseInt(searchParams.get('trimestre') || '1')

  if (!grupoId) return new NextResponse('grupoId requerido', { status: 400 })

  const admin = createAdminClient()

  const [{ data: usuario }, { data: grupo }] = await Promise.all([
    admin.from('usuarios').select('rol, escuela_id, licencia_plan, licencia_periodos').eq('id', user.id).single(),
    admin.from('grupos').select('*').eq('id', grupoId).single(),
  ])

  if (!grupo || !usuario) return new NextResponse('No encontrado', { status: 404 })

  if (usuario.rol === 'maestro' && grupo.maestro_id !== user.id) {
    return new NextResponse('Sin permisos', { status: 403 })
  }
  if (usuario.rol === 'director' && grupo.escuela_id !== usuario.escuela_id) {
    return new NextResponse('Sin permisos', { status: 403 })
  }

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
    admin.from('alumnos').select('*').eq('grupo_id', grupoId).eq('activo', true).eq('deleted', false).order('apellido_paterno'),
    admin.from('evaluaciones').select('*').eq('grupo_id', grupoId).eq('trimestre', trimestre).eq('ciclo_escolar', grupo.ciclo_escolar),
    admin.from('usuarios').select('nombre').eq('id', grupo.maestro_id).single(),
    admin.from('usuarios').select('nombre').eq('escuela_id', grupo.escuela_id).eq('rol', 'director'),
  ])

  const evMap = new Map((evaluaciones ?? []).map(e => [e.alumno_id, e]))
  const alumnosList = alumnos ?? []
  const campos = ['lenguajes', 'saberes', 'etica', 'humanos'] as const

  const promediosGrupo: (number | null)[] = []
  const sumasCampos = { lenguajes: 0, saberes: 0, etica: 0, humanos: 0 }
  const conteoCampos = { lenguajes: 0, saberes: 0, etica: 0, humanos: 0 }

  const filas = alumnosList.map((alumno, idx) => {
    const ev = evMap.get(alumno.id)
    const { edad, sexo } = getDataFromCURP(alumno.curp)

    let sum = 0; let cnt = 0
    campos.forEach(c => {
      const v = ev?.[c] ?? null
      if (v !== null) { sum += Number(v); cnt++; sumasCampos[c] += Number(v); conteoCampos[c]++ }
    })
    const prom = cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : null
    promediosGrupo.push(prom)

    const nombre = `${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''} ${alumno.nombre}`
      .toUpperCase().replace(/\s+/g, ' ').trim()

    return `<tr>
      <td>${idx + 1}</td>
      <td class="col-nombre">${nombre}</td>
      <td>${sexo}</td>
      <td>${edad}</td>
      <td>${ev?.inasistencias ?? 0}</td>
      ${campos.map(c => `<td>${fmt(ev?.[c])}</td>`).join('')}
      <td class="col-prom" style="font-weight:bold;">${prom !== null ? fmtProm(prom) : ''}</td>
    </tr>`
  }).join('')

  // Fila promedios finales
  let sumPromFinal = 0; let cntPromFinal = 0
  promediosGrupo.forEach(p => { if (p !== null) { sumPromFinal += p; cntPromFinal++ } })

  const pL = conteoCampos.lenguajes > 0 ? fmtProm(sumasCampos.lenguajes / conteoCampos.lenguajes) : '-'
  const pS = conteoCampos.saberes   > 0 ? fmtProm(sumasCampos.saberes   / conteoCampos.saberes)   : '-'
  const pE = conteoCampos.etica     > 0 ? fmtProm(sumasCampos.etica     / conteoCampos.etica)     : '-'
  const pH = conteoCampos.humanos   > 0 ? fmtProm(sumasCampos.humanos   / conteoCampos.humanos)   : '-'
  const pG = cntPromFinal > 0 ? fmtProm(sumPromFinal / cntPromFinal) : '-'

  const filaProms = `<tr class="fila-promedios">
    <td colspan="5" class="label-promedio-final">PROMEDIO FINAL</td>
    <td>${pL}</td><td>${pS}</td><td>${pE}</td><td>${pH}</td>
    <td class="dato-promedio-general">${pG}</td>
  </tr>`

  // Estadísticas
  const stats: Record<number, number> = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0 }
  const totalAlumnos = alumnosList.length
  promediosGrupo.forEach(p => {
    if (p === null) return
    const fl = Math.floor(p)
    if (fl >= 10) stats[10]++
    else if (fl === 9) stats[9]++
    else if (fl === 8) stats[8]++
    else if (fl === 7) stats[7]++
    else if (fl === 6) stats[6]++
    else stats[5]++
  })

  const pct = (n: number) => totalAlumnos > 0 ? ((n / totalAlumnos) * 100).toFixed(1) + '%' : '0%'

  const filaStatAlumnos = [10,9,8,7,6,5].map(r => `<td>${stats[r] || 0}</td>`).join('') + `<td>${totalAlumnos}</td>`
  const filaStatPct = [10,9,8,7,6,5].map(r => `<td>${pct(stats[r] || 0)}</td>`).join('') + `<td>100%</td>`

  // Lugar y fecha del pie
  const comunidad  = escuela?.comunidad ?? ''
  const municipio  = escuela?.municipio ?? ''
  const estado     = escuela?.estado    ?? 'Estado de México'
  const fechaMap: Record<number, string | null> = {
    0: (escuela as any)?.fecha_diagnostico  ?? null,
    1: (escuela as any)?.fecha_trimestre_1  ?? null,
    2: (escuela as any)?.fecha_trimestre_2  ?? null,
    3: (escuela as any)?.fecha_trimestre_3  ?? null,
  }
  const directorMap: Record<number, string | null> = {
    0: (escuela as any)?.director_diagnostico ?? null,
    1: (escuela as any)?.director_trimestre_1 ?? null,
    2: (escuela as any)?.director_trimestre_2 ?? null,
    3: (escuela as any)?.director_trimestre_3 ?? null,
  }
  const fechaPie   = formatFechaCuadro(fechaMap[trimestre] ?? null)
  const lugarFecha = [comunidad, municipio, estado]
    .map(s => s.trim()).filter(Boolean).join(', ') + ` a ${fechaPie}.`

  const directorNombre = (
    directorMap[trimestre]?.trim() || directores?.[0]?.nombre || '__________________________'
  ).toUpperCase()
  const maestroNombre  = maestroData?.nombre?.toUpperCase() ?? '__________________________'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cuadro General — ${grupo.grado} "${grupo.grupo}" — ${TRIMESTRE_LABEL[trimestre] ?? ''}</title>
<link rel="stylesheet" href="/reportes/reporte.css">
</head>
<body>

<div class="hoja-oficial">

  <!-- ENCABEZADO -->
  <header class="encabezado-superior">
    <img src="/reportes/banner.png" alt="Logos Oficiales" class="img-banner" onerror="this.style.display='none'">
    <div class="titulo-ciclo">SECRETARÍA DE EDUCACIÓN · CICLO ESCOLAR ${grupo.ciclo_escolar}</div>
  </header>

  <!-- DATOS ESCUELA -->
  <section class="datos-escuela">
    <div class="fila-datos">
      <div class="campo-dato dato-nombre-escuela"><strong>NOMBRE DE LA ESCUELA:</strong> ${escuela?.nombre?.toUpperCase() ?? ''}</div>
      <div class="campo-dato dato-cct"><strong>C.C.T.:</strong> ${escuela?.cct ?? ''}</div>
      <div class="campo-dato dato-turno"><strong>TURNO:</strong> ${(escuela?.turno ?? 'MATUTINO').toUpperCase()}</div>
    </div>
    <div class="fila-datos">
      <div class="campo-dato dato-domicilio"><strong>MUNICIPIO:</strong> ${municipio.toUpperCase()}</div>
      <div class="campo-dato dato-cct"><strong>ZONA ESCOLAR:</strong></div>
    </div>
    <div class="fila-datos">
      <div class="campo-dato dato-grado"><strong>GRADO:</strong> ${grupo.grado}</div>
      <div class="campo-dato dato-grupo"><strong>GRUPO:</strong> ${grupo.grupo}</div>
      <div class="campo-dato grow"></div>
    </div>
  </section>

  <!-- TÍTULO TRIMESTRE -->
  <div class="titulo-trimestre-tabla">${TRIMESTRE_LABEL[trimestre] ?? `TRIMESTRE ${trimestre}`} — ${grupo.ciclo_escolar}</div>

  <!-- TABLA PRINCIPAL -->
  <div class="contenedor-tabla-principal">
    <table id="tabla-reporte">
      <thead>
        <tr>
          <th rowspan="2" class="col-np"><div class="texto-vertical">N.P.</div></th>
          <th rowspan="2" class="col-nombre" style="text-align:center!important;">APELLIDOS Y NOMBRE</th>
          <th rowspan="2" class="col-genero"><div class="texto-vertical">GÉNERO (H/M)</div></th>
          <th rowspan="2" class="col-edad"><div class="texto-vertical">EDAD</div></th>
          <th rowspan="2" class="col-inasist"><div class="texto-vertical">INASISTENCIAS</div></th>
          <th colspan="4">ASIGNATURA / ÁREAS</th>
          <th rowspan="2" class="col-prom"><div class="texto-vertical">PROMEDIO</div></th>
        </tr>
        <tr>
          <th class="col-campo"><div class="texto-vertical">LENGUAJES</div></th>
          <th class="col-campo"><div class="texto-vertical">SABERES Y P. C.</div></th>
          <th class="col-campo"><div class="texto-vertical">ÉTICA, NAT. Y SOC.</div></th>
          <th class="col-campo"><div class="texto-vertical">DE LO HUMANO</div></th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
      <tfoot>${filaProms}</tfoot>
    </table>
  </div>

  <!-- ESTADÍSTICA -->
  <div class="contenedor-estadistica">
    <table class="tabla-estadistica">
      <thead>
        <tr><th>RANGO</th><th>10</th><th>9</th><th>8</th><th>7</th><th>6</th><th>5</th><th>TOTAL</th></tr>
      </thead>
      <tbody>
        <tr><td class="label-stat">ALUMNOS</td>${filaStatAlumnos}</tr>
        <tr><td class="label-stat">%</td>${filaStatPct}</tr>
      </tbody>
    </table>
  </div>

  <!-- PIE DE PÁGINA FIJO -->
  <div id="footer-fijo">

    <div class="fila-lugar-fecha">
      ${lugarFecha.toUpperCase()}
    </div>

    <footer class="seccion-firmas">
      <div class="bloque-firma">
        <div class="linea-firma"></div>
        <div class="nombre-firma">MTRO(A). ${maestroNombre}</div>
        <div class="cargo-firma">MAESTRO (A) DE GRUPO</div>
      </div>
      <div class="bloque-datos-central">
        <div class="espacio-sello">(SELLO)</div>
      </div>
      <div class="bloque-firma">
        <div class="linea-firma"></div>
        <div class="nombre-firma">MTRO(A). ${directorNombre}</div>
        <div class="cargo-firma">DIRECTOR (A) DE LA ESCUELA</div>
      </div>
    </footer>

    <div class="footer-decoracion">
      <img src="/reportes/pie.png" alt="Decoración" class="img-footer" onerror="this.style.display='none'">
    </div>

  </div>

</div>

<script>window.onload = function(){ window.print() }</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
