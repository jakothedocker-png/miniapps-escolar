import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TRIMESTRE_LABEL: Record<number, string> = {
  0: 'DIAGNÓSTICO',
  1: '1ER. TRIMESTRE',
  2: '2DO. TRIMESTRE',
  3: '3ER. TRIMESTRE',
}

const CAMPO_LABEL: Record<string, string> = {
  lenguajes: 'Lenguajes',
  saberes:   'Saberes y Pensamiento Científico',
  etica:     'Ética, Naturaleza y Sociedades',
  humanos:   'De lo Humano y lo Comunitario',
}

function getDataFromCURP(curp: string | null): { edad: string; sexo: string } {
  if (!curp || curp.length < 18) return { edad: '-', sexo: '-' }
  const sexoLetra = curp.charAt(10).toUpperCase()
  const sexo = sexoLetra === 'H' ? 'H' : sexoLetra === 'M' ? 'M' : '-'
  const yy = parseInt(curp.substring(4, 6))
  const fullYear = yy + (yy < 30 ? 2000 : 1900)
  const birthDate = new Date(fullYear, parseInt(curp.substring(6, 8)) - 1, parseInt(curp.substring(8, 10)))
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return { edad: String(age), sexo }
}

// Trunca (no redondea) igual que SIDEC roundStandard con Math.floor
function trunc1(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return (Math.floor(Number(val) * 10) / 10).toFixed(1)
}

function trunc2(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return (Math.floor(Number(val) * 100) / 100).toFixed(2)
}

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

  // Mapa por período: 0=Diag, 1, 2, 3
  type EvRow = Record<string, unknown>
  const evByTrim: Record<number, EvRow> = { 0: {}, 1: {}, 2: {}, 3: {} }
  ;(evaluaciones ?? []).forEach(e => { evByTrim[e.trimestre] = e })

  const { edad, sexo } = getDataFromCURP(alumno.curp)
  const nombreAlumno = `${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''} ${alumno.nombre}`
    .toUpperCase().replace(/\s+/g, ' ').trim()

  const campos = ['lenguajes', 'saberes', 'etica', 'humanos'] as const

  // Calificaciones por campo: Diag muestra 2 decimales, trimestres 1 decimal
  // El promedio anual solo considera T1, T2, T3 (igual que SIDEC)
  const filasCampos = campos.map(campo => {
    const vDiag = evByTrim[0][campo] !== null && evByTrim[0][campo] !== undefined
      ? Number(evByTrim[0][campo]) : null
    const vTrims = [1, 2, 3].map(t => {
      const v = evByTrim[t][campo]
      return v !== null && v !== undefined ? Number(v) : null
    })
    const validos = vTrims.filter(v => v !== null) as number[]
    const promAnual = validos.length > 0 ? validos.reduce((a, b) => a + b, 0) / validos.length : null
    return { campo, vDiag, vTrims, promAnual }
  })

  // Promedios generales por trimestre (solo T1, T2, T3 para el anual)
  const promsDiag = (() => {
    const vals = campos.map(c => {
      const v = evByTrim[0][c]; return v !== null && v !== undefined ? Number(v) : null
    }).filter(v => v !== null) as number[]
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })()

  const promsPorTrim = [1, 2, 3].map(t => {
    const ev = evByTrim[t]
    if (!ev || Object.keys(ev).length === 0) return null
    const vals = campos.map(c => {
      const v = ev[c]; return v !== null && v !== undefined ? Number(v) : null
    }).filter(v => v !== null) as number[]
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })

  const promsValidos = promsPorTrim.filter(p => p !== null) as number[]
  const promAnualGeneral = promsValidos.length > 0 ? promsValidos.reduce((a, b) => a + b, 0) / promsValidos.length : null

  // Inasistencias
  const inasistDiag = Number(evByTrim[0].inasistencias ?? 0)
  const inasistPorTrim = [1, 2, 3].map(t => Number(evByTrim[t].inasistencias ?? 0))
  const totalInasist = inasistPorTrim.reduce((a, b) => a + b, 0)

  // Observaciones por período y campo
  const obsFilas = campos.map(campo => ({
    campo,
    obs: [0, 1, 2, 3].map(t => (evByTrim[t][`obs_${campo}`] as string) || ''),
  }))
  const tieneObs = obsFilas.some(f => f.obs.some(o => o.length > 0))

  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const municipio = escuela?.municipio || ''
  const directorNombre = directores?.[0]?.nombre?.toUpperCase() ?? ''
  const maestroNombre = maestroData?.nombre?.toUpperCase() ?? ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Kardex — ${nombreAlumno}</title>
<style>
*{box-sizing:border-box;}
@page{size:letter portrait;margin:1cm 1.5cm;}
body{margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;font-size:8pt;background:#525659;display:flex;justify-content:center;}
.hoja{background:white;width:21.59cm;min-height:27.94cm;padding:1cm 1.5cm;box-shadow:0 0 15px rgba(0,0,0,.5);display:flex;flex-direction:column;}
.titulo-ciclo{font-size:7pt;font-weight:bold;text-align:center;margin-top:4px;font-style:italic;}
.datos-escuela{border:1px solid #000;padding:4px;margin-bottom:5px;font-size:7.5pt;}
.fila-datos{display:flex;margin-bottom:3px;align-items:baseline;flex-wrap:wrap;gap:6px;}
.campo-dato{white-space:nowrap;}
.dato-nombre-escuela{flex:2;}
.titulo-kardex{text-align:center;font-weight:bold;font-size:9.5pt;text-transform:uppercase;border:1px solid #000;padding:4px;background:#f0f4ff;margin-bottom:8px;letter-spacing:.5px;}
.datos-alumno{border:1px solid #000;padding:5px 6px;margin-bottom:8px;font-size:7.5pt;background:#fafafa;}
.datos-alumno-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px 12px;}
.dato-al{display:flex;gap:4px;align-items:baseline;}
.dato-al strong{white-space:nowrap;font-size:7pt;color:#555;}

table.kardex{width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:10px;}
table.kardex th,table.kardex td{border:1px solid #000;padding:2px 3px;text-align:center;vertical-align:middle;}
table.kardex th{background:#e2efda!important;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.col-campo-label{text-align:left!important;padding-left:5px!important;width:38%;}
.col-diag{width:10%;background:#f8fafc!important;color:#555;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.col-trim{width:10%;}
.col-prom-anual{width:12%;background:#d0e0c5!important;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.fila-prom-gen td{background:#e2efda!important;font-weight:bold;border-top:2px solid #000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.fila-prom-gen .col-prom-anual{background:#b8d4a8!important;}
.fila-inasist td{background:#fff8e1!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.fila-inasist .col-prom-anual{background:#ffe082!important;font-weight:bold;}

.seccion-obs{margin-top:10px;font-size:7pt;}
.seccion-obs-titulo{font-weight:bold;font-size:7.5pt;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:6px;}
.obs-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;}
.obs-bloque{border:1px solid #ddd;padding:4px;border-radius:3px;}
.obs-trim-label{font-weight:bold;font-size:6.5pt;text-transform:uppercase;color:#555;margin-bottom:2px;}
.obs-campo-label{font-weight:bold;color:#333;margin-bottom:1px;font-size:6.5pt;}
.obs-texto{color:#333;line-height:1.4;}

#footer{margin-top:auto;}
.lugar-fecha{text-align:right;font-weight:bold;font-size:8pt;margin-bottom:28px;}
.firmas{display:flex;justify-content:space-around;align-items:flex-end;font-size:7.5pt;margin-bottom:8px;}
.bloque-firma{text-align:center;width:40%;}
.linea-firma{border-top:1px solid #000;margin:0 10px 3px;}
.nombre-firma{font-weight:bold;font-size:7pt;}
.cargo-firma{font-size:6.5pt;}
.bloque-sello{text-align:center;width:20%;color:#aaa;font-size:8pt;}
@media print{
  body{background:none;padding:0;display:block;padding-bottom:4.5cm;}
  .hoja{width:100%;box-shadow:none;padding:0;margin:0;min-height:0;}
  #footer{position:fixed;bottom:0;left:0;width:100%;background:white;z-index:100;}
  tr{page-break-inside:avoid;}
}
</style>
</head>
<body>
<div class="hoja">

  <div style="text-align:center;margin-bottom:8px;">
    <div class="titulo-ciclo">SECRETARÍA DE EDUCACIÓN · CICLO ESCOLAR ${grupo.ciclo_escolar}</div>
  </div>

  <section class="datos-escuela">
    <div class="fila-datos">
      <div class="campo-dato dato-nombre-escuela"><strong>ESCUELA:</strong> ${escuela?.nombre?.toUpperCase() ?? ''}</div>
      <div class="campo-dato"><strong>C.C.T.:</strong> ${escuela?.cct ?? ''}</div>
      <div class="campo-dato"><strong>TURNO:</strong> ${escuela?.turno?.toUpperCase() ?? 'MATUTINO'}</div>
    </div>
    <div class="fila-datos">
      <div class="campo-dato"><strong>MUNICIPIO:</strong> ${escuela?.municipio?.toUpperCase() ?? ''}</div>
      <div class="campo-dato"><strong>GRADO:</strong> ${grupo.grado}</div>
      <div class="campo-dato"><strong>GRUPO:</strong> ${grupo.grupo}</div>
    </div>
  </section>

  <div class="titulo-kardex">KARDEX DE EVALUACIONES — ${grupo.ciclo_escolar}</div>

  <div class="datos-alumno">
    <div class="datos-alumno-grid">
      <div class="dato-al" style="grid-column:1/-1"><strong>ALUMNO:</strong> <span style="font-weight:bold;font-size:8.5pt;">${nombreAlumno}</span></div>
      <div class="dato-al"><strong>CURP:</strong> ${alumno.curp ?? '—'}</div>
      <div class="dato-al"><strong>GÉNERO:</strong> ${sexo}</div>
      <div class="dato-al"><strong>EDAD:</strong> ${edad} años</div>
    </div>
  </div>

  <table class="kardex">
    <thead>
      <tr>
        <th class="col-campo-label">CAMPO FORMATIVO</th>
        <th class="col-diag">DIAG</th>
        <th class="col-trim">${TRIMESTRE_LABEL[1]}</th>
        <th class="col-trim">${TRIMESTRE_LABEL[2]}</th>
        <th class="col-trim">${TRIMESTRE_LABEL[3]}</th>
        <th class="col-prom-anual">PROM. ANUAL</th>
      </tr>
    </thead>
    <tbody>
      ${filasCampos.map(({ campo, vDiag, vTrims, promAnual }) => `
      <tr>
        <td class="col-campo-label">${CAMPO_LABEL[campo]}</td>
        <td class="col-diag">${vDiag !== null ? trunc2(vDiag) : '—'}</td>
        ${vTrims.map(v => `<td>${v !== null ? trunc1(v) : '—'}</td>`).join('')}
        <td class="col-prom-anual">${trunc1(promAnual)}</td>
      </tr>`).join('')}
      <tr class="fila-prom-gen">
        <td class="col-campo-label" style="font-weight:bold;">PROMEDIO GENERAL</td>
        <td class="col-diag">${trunc2(promsDiag)}</td>
        ${promsPorTrim.map(p => `<td>${trunc1(p)}</td>`).join('')}
        <td class="col-prom-anual">${trunc1(promAnualGeneral)}</td>
      </tr>
      <tr class="fila-inasist">
        <td class="col-campo-label">INASISTENCIAS</td>
        <td class="col-diag">${inasistDiag}</td>
        ${inasistPorTrim.map(v => `<td>${v}</td>`).join('')}
        <td class="col-prom-anual">${totalInasist}</td>
      </tr>
    </tbody>
  </table>

  ${tieneObs ? `
  <div class="seccion-obs">
    <div class="seccion-obs-titulo">Observaciones por campo formativo</div>
    ${obsFilas.map(({ campo, obs }) => {
      const tieneAlguna = obs.some(o => o.length > 0)
      if (!tieneAlguna) return ''
      return `
      <div style="margin-bottom:6px;">
        <div class="obs-campo-label">${CAMPO_LABEL[campo]}</div>
        <div class="obs-grid">
          ${obs.map((texto, idx) => texto ? `
          <div class="obs-bloque">
            <div class="obs-trim-label">${TRIMESTRE_LABEL[idx]}</div>
            <div class="obs-texto">${texto}</div>
          </div>` : `<div></div>`).join('')}
        </div>
      </div>`
    }).join('')}
  </div>` : ''}

  <div id="footer">
    <div class="lugar-fecha">${municipio}, a ${fechaHoy}</div>
    <div class="firmas">
      <div class="bloque-firma">
        <div class="linea-firma"></div>
        <div class="nombre-firma">${maestroNombre}</div>
        <div class="cargo-firma">MAESTRO (A) DE GRUPO</div>
      </div>
      <div class="bloque-sello">(SELLO)</div>
      <div class="bloque-firma">
        <div class="linea-firma"></div>
        <div class="nombre-firma">${directorNombre}</div>
        <div class="cargo-firma">DIRECTOR (A) DE LA ESCUELA</div>
      </div>
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
