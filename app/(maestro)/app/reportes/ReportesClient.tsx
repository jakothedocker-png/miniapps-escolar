'use client'
'use client'

import { useState } from 'react'
import { FileText, FileSpreadsheet, User, ChevronDown, Printer, BookOpen } from 'lucide-react'

interface Grupo {
  id: string
  grado: string
  grupo: string
  ciclo_escolar: string
}

interface Alumno {
  id: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
}

interface Props {
  grupos: Grupo[]
  alumnosPorGrupo: Record<string, Alumno[]>
}

const TRIMESTRES = [
  { value: 0, label: 'Diagnóstico' },
  { value: 1, label: '1er. Trimestre' },
  { value: 2, label: '2do. Trimestre' },
  { value: 3, label: '3er. Trimestre' },
]

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

export default function ReportesClient({ grupos, alumnosPorGrupo }: Props) {
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? '')
  const [trimestre, setTrimestre] = useState(1)
  const [alumnoId, setAlumnoId] = useState('')
  const [showAlumnos, setShowAlumnos] = useState(false)

  const grupo = grupos.find(g => g.id === grupoId)
  const alumnos = grupoId ? (alumnosPorGrupo[grupoId] ?? []) : []

  function abrirCuadroGeneral() {
    if (!grupoId) return
    window.open(`/api/reportes/cuadro-general?grupoId=${grupoId}&trimestre=${trimestre}`, '_blank')
  }

  function abrirKardex() {
    if (!grupoId || !alumnoId) return
    window.open(`/api/reportes/kardex?grupoId=${grupoId}&alumnoId=${alumnoId}`, '_blank')
  }

  function descargarExcel() {
    if (!grupoId) return
    window.location.href = `/api/reportes/excel?grupoId=${grupoId}&trimestre=${trimestre}`
  }

  const alumnoSeleccionado = alumnos.find(a => a.id === alumnoId)
  const nombreAlumno = alumnoSeleccionado
    ? `${alumnoSeleccionado.apellido_paterno} ${alumnoSeleccionado.apellido_materno ?? ''} ${alumnoSeleccionado.nombre}`.replace(/\s+/g, ' ').trim()
    : ''

  if (grupos.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto" style={{ background: '#F5F8FF', minHeight: '100vh' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1E2D3D' }}>Reportes</h1>
        <p style={{ color: '#64748B' }}>No tienes grupos asignados. Solicita al director que te asigne un grupo.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#1E2D3D' }}>Reportes</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>Genera e imprime los reportes oficiales de calificaciones.</p>
      </div>

      {/* Selectores */}
      <div className="rounded-2xl p-5 mb-6 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Configuración</h2>

        {/* Grupo */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: '#64748B' }}>Grupo</label>
          <div className="flex flex-wrap gap-2">
            {grupos.map(g => (
              <button
                key={g.id}
                onClick={() => { setGrupoId(g.id); setAlumnoId(''); setShowAlumnos(false) }}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={grupoId === g.id
                  ? { background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(6,135,216,0.25)' }
                  : { background: '#F1F5F9', color: '#64748B' }
                }
                onMouseEnter={e => { if (grupoId !== g.id) (e.currentTarget as HTMLElement).style.background = '#E2E8F0' }}
                onMouseLeave={e => { if (grupoId !== g.id) (e.currentTarget as HTMLElement).style.background = '#F1F5F9' }}
              >
                {g.grado} &quot;{g.grupo}&quot;
              </button>
            ))}
          </div>
        </div>

        {/* Trimestre */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: '#64748B' }}>Trimestre (para Cuadro General y Excel)</label>
          <div className="flex flex-wrap gap-2">
            {TRIMESTRES.map(t => (
              <button
                key={t.value}
                onClick={() => setTrimestre(t.value)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={trimestre === t.value
                  ? { background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(6,135,216,0.25)' }
                  : { background: '#F1F5F9', color: '#64748B' }
                }
                onMouseEnter={e => { if (trimestre !== t.value) (e.currentTarget as HTMLElement).style.background = '#E2E8F0' }}
                onMouseLeave={e => { if (trimestre !== t.value) (e.currentTarget as HTMLElement).style.background = '#F1F5F9' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Cuadro General */}
        <div className="rounded-2xl p-5 flex flex-col" style={cardStyle}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(6,135,216,0.10)' }}>
            <FileText size={20} style={{ color: '#0687D8' }} />
          </div>
          <h3 className="font-semibold mb-1" style={{ color: '#1E2D3D' }}>Cuadro General</h3>
          <p className="text-xs mb-4 flex-1" style={{ color: '#64748B' }}>
            Lista completa del grupo con calificaciones por campo formativo. Listo para imprimir.
          </p>
          {grupo && (
            <p className="text-xs font-medium mb-3" style={{ color: '#0687D8' }}>
              {grupo.grado} &quot;{grupo.grupo}&quot; — {TRIMESTRES.find(t => t.value === trimestre)?.label}
            </p>
          )}
          <button
            onClick={abrirCuadroGeneral}
            disabled={!grupoId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.25)' }}
          >
            <Printer size={15} />
            Abrir e imprimir
          </button>
        </div>

        {/* Kardex */}
        <div className="rounded-2xl p-5 flex flex-col" style={cardStyle}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#EFF9F0' }}>
            <BookOpen size={20} style={{ color: '#15803D' }} />
          </div>
          <h3 className="font-semibold mb-1" style={{ color: '#1E2D3D' }}>Kardex Individual</h3>
          <p className="text-xs mb-4 flex-1" style={{ color: '#64748B' }}>
            Historial de calificaciones de un alumno en los 3 trimestres del ciclo escolar.
          </p>

          {/* Selector de alumno */}
          <div className="relative mb-3">
            <button
              onClick={() => setShowAlumnos(v => !v)}
              disabled={!grupoId || alumnos.length === 0}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: '1px solid #E2E8F0', background: '#F8FAFF', color: '#64748B' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F1F5F9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
            >
              <span className="flex items-center gap-2">
                <User size={14} style={{ color: '#94A3B8' }} />
                {alumnoSeleccionado ? nombreAlumno : 'Seleccionar alumno'}
              </span>
              <ChevronDown size={14} style={{ color: '#94A3B8', transform: showAlumnos ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>

            {showAlumnos && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(30,45,61,0.12)' }}>
                {alumnos.map(a => {
                  const nombre = `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.replace(/\s+/g, ' ').trim()
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setAlumnoId(a.id); setShowAlumnos(false) }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors"
                      style={alumnoId === a.id
                        ? { background: 'rgba(6,135,216,0.08)', color: '#0687D8', fontWeight: 600 }
                        : { color: '#1E2D3D' }
                      }
                      onMouseEnter={e => { if (alumnoId !== a.id) (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.04)' }}
                      onMouseLeave={e => { if (alumnoId !== a.id) (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      {nombre.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            onClick={abrirKardex}
            disabled={!grupoId || !alumnoId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)', boxShadow: '0 4px 16px rgba(21,128,61,0.25)' }}
          >
            <Printer size={15} />
            Abrir e imprimir
          </button>
        </div>

        {/* Excel */}
        <div className="rounded-2xl p-5 flex flex-col" style={cardStyle}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: '#FFFBEB' }}>
            <FileSpreadsheet size={20} style={{ color: '#B45309' }} />
          </div>
          <h3 className="font-semibold mb-1" style={{ color: '#1E2D3D' }}>Exportar Excel</h3>
          <p className="text-xs mb-4 flex-1" style={{ color: '#64748B' }}>
            Descarga las calificaciones del grupo en formato Excel (.xlsx) con todos los datos.
          </p>
          {grupo && (
            <p className="text-xs font-medium mb-3" style={{ color: '#B45309' }}>
              {grupo.grado} &quot;{grupo.grupo}&quot; — {TRIMESTRES.find(t => t.value === trimestre)?.label}
            </p>
          )}
          <button
            onClick={descargarExcel}
            disabled={!grupoId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)', boxShadow: '0 4px 16px rgba(180,83,9,0.25)' }}
          >
            <FileSpreadsheet size={15} />
            Descargar .xlsx
          </button>
        </div>

      </div>

      {/* Nota */}
      <p className="mt-6 text-xs text-center" style={{ color: '#94A3B8' }}>
        Los reportes se abren en una nueva pestaña. Usa Ctrl+P (o Cmd+P) para imprimir o guardar como PDF.
      </p>
    </div>
  )
}
