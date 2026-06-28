'use client'
'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'

interface AlumnoRiesgo {
  alumno_id: string
  nombre: string
  grado: string
  grupo: string
  t1_prom: number | null
  t1_faltas: number | null
  t2_prom: number | null
  t2_faltas: number | null
  t3_prom: number | null
  t3_faltas: number | null
  total_faltas: number
}

interface Props {
  alumnos: AlumnoRiesgo[]
}

const TRIMESTRES = [
  { value: 0, label: 'Todos' },
  { value: 1, label: '1er Trim.' },
  { value: 2, label: '2do Trim.' },
  { value: 3, label: '3er Trim.' },
]

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

function fmtProm(v: number | null) {
  if (v === null) return '—'
  return v.toFixed(1)
}

function celdaRiesgo(prom: number | null) {
  const promBajo = prom !== null && prom < 6
  return (
    <span style={{ color: promBajo ? '#DC2626' : '#1E2D3D', fontWeight: promBajo ? 600 : 400 }}>
      {fmtProm(prom)}
    </span>
  )
}

export default function RiesgoClient({ alumnos }: Props) {
  const [trimestre, setTrimestre] = useState(0)

  const filtrados = alumnos.filter(a => {
    if (trimestre === 0) return true
    if (trimestre === 1) return (a.t1_prom !== null && a.t1_prom < 6) || (a.t1_faltas !== null && a.t1_faltas >= 10)
    if (trimestre === 2) return (a.t2_prom !== null && a.t2_prom < 6) || (a.t2_faltas !== null && a.t2_faltas >= 10)
    if (trimestre === 3) return (a.t3_prom !== null && a.t3_prom < 6) || (a.t3_faltas !== null && a.t3_faltas >= 10)
    return true
  })

  return (
    <div className="p-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#1E2D3D' }}>
          <AlertTriangle size={22} style={{ color: '#DC2626' }} />
          Alumnos en riesgo
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Alumnos con promedio menor a 6 o con 10 o más inasistencias en cualquier trimestre.
        </p>
      </div>

      {/* Filtro trimestre */}
      <div className="flex items-center gap-2 mb-5">
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

      {filtrados.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={cardStyle}>
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: '#15803D' }} />
          <p className="font-semibold mb-1" style={{ color: '#1E2D3D' }}>¡Todo bien!</p>
          <p className="text-sm" style={{ color: '#64748B' }}>Sin alumnos en riesgo en el período seleccionado.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>#</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>Alumno</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>Grupo</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>T1</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>T2</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>T3</th>
                  <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>Faltas totales</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ background: '#F8FAFF', color: '#64748B' }}>Alerta</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, idx) => {
                  const promBajo = (a.t1_prom !== null && a.t1_prom < 6) || (a.t2_prom !== null && a.t2_prom < 6) || (a.t3_prom !== null && a.t3_prom < 6)
                  const faltasAltas = a.total_faltas >= 10
                  return (
                    <tr
                      key={a.alumno_id}
                      style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                    >
                      <td className="px-4 py-3.5 text-xs" style={{ color: '#94A3B8' }}>{idx + 1}</td>
                      <td className="px-4 py-3.5 font-medium" style={{ color: '#1E2D3D' }}>{a.nombre}</td>
                      <td className="px-4 py-3.5" style={{ color: '#64748B' }}>{a.grado} &quot;{a.grupo}&quot;</td>
                      <td className="px-4 py-3.5 text-center">{celdaRiesgo(a.t1_prom)}</td>
                      <td className="px-4 py-3.5 text-center">{celdaRiesgo(a.t2_prom)}</td>
                      <td className="px-4 py-3.5 text-center">{celdaRiesgo(a.t3_prom)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span style={{ color: a.total_faltas >= 10 ? '#B45309' : '#1E2D3D', fontWeight: a.total_faltas >= 10 ? 600 : 400 }}>
                          {a.total_faltas}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {promBajo && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: '#FEF2F2', color: '#DC2626' }}>
                              Prom. bajo
                            </span>
                          )}
                          {faltasAltas && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: '#FFFBEB', color: '#B45309' }}>
                              Faltas
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
