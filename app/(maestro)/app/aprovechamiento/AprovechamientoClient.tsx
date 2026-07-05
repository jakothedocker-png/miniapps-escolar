'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Grupo { id: string; grado: string; grupo: string; ciclo_escolar: string }
interface Alumno { id: string; grupo_id: string; nombre: string }
interface Evaluacion {
  alumno_id: string
  grupo_id: string
  trimestre: number
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
}

const CAMPOS = ['lenguajes', 'saberes', 'etica', 'humanos'] as const
type Campo = typeof CAMPOS[number]

const LABEL_CAMPO: Record<Campo, string> = {
  lenguajes: 'Lenguajes',
  saberes:   'Saberes y Pens.',
  etica:     'Ética Nat. y Soc.',
  humanos:   'De lo Humano',
}

const COLOR_CAMPO: Record<Campo, string> = {
  lenguajes: '#0687D8',
  saberes:   '#10B981',
  etica:     '#7C3AED',
  humanos:   '#F59E0B',
}

const PERIODOS = [
  { t: 0, label: 'Diagnóstico' },
  { t: 1, label: '1er Trimestre' },
  { t: 2, label: '2do Trimestre' },
  { t: 3, label: '3er Trimestre' },
]

const RANGOS = [
  { key: 'r10', label: 'Calif. 10',  min: 10 },
  { key: 'r9',  label: '9.0 – 9.9',  min: 9 },
  { key: 'r8',  label: '8.0 – 8.9',  min: 8 },
  { key: 'r7',  label: '7.0 – 7.9',  min: 7 },
  { key: 'r6',  label: '6.0 – 6.9',  min: 6 },
  { key: 'r5',  label: '< 6.0',      min: -Infinity },
] as const

const TABS = [
  { key: 'periodo',   label: 'Por Período' },
  { key: 'final',     label: 'Promedio Final' },
  { key: 'aprend',    label: 'Aprendizajes Esperados' },
  { key: 'graficas',  label: 'Gráficas' },
  { key: 'evolucion', label: 'Evolución' },
] as const
type Tab = typeof TABS[number]['key']

// ─── Helpers (truncado, nunca redondeo: 9.75 → 9.7) ─────────────────────────

const trunc1 = (v: number) => Math.floor(v * 10) / 10
const fmt = (v: number | null) => (v === null ? '—' : trunc1(v).toFixed(1))

function colorCelda(v: number | null): { background: string; color: string } {
  if (v === null) return { background: '#F8FAFC', color: '#CBD5E1' }
  if (v >= 9) return { background: '#BBF7D0', color: '#14532D' }
  if (v >= 8) return { background: '#D1FAE5', color: '#065F46' }
  if (v >= 7) return { background: '#FEF9C3', color: '#713F12' }
  if (v >= 6) return { background: '#FFEDD5', color: '#7C2D12' }
  return { background: '#FEE2E2', color: '#7F1D1D' }
}

function media(vals: number[]): number | null {
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

// Promedio personal: media de los campos capturados (> 0), como SIDEC
function promEval(ev: Evaluacion | undefined): number | null {
  if (!ev) return null
  const vals = CAMPOS.map(c => ev[c]).filter((v): v is number => v !== null && v > 0)
  return media(vals)
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function AprovechamientoClient({ grupos, alumnos, evaluaciones }: {
  grupos: Grupo[]
  alumnos: Alumno[]
  evaluaciones: Evaluacion[]
}) {
  const [grupoId, setGrupoId] = useState(grupos[0].id)
  const [tab, setTab]         = useState<Tab>('periodo')
  const [periodo, setPeriodo] = useState(1)
  const [dimension, setDimension] = useState<'general' | 'campo'>('general')

  const grupoActual = grupos.find(g => g.id === grupoId) ?? grupos[0]

  const alumnosGrupo = useMemo(
    () => alumnos.filter(a => a.grupo_id === grupoId),
    [alumnos, grupoId]
  )

  // alumno_id → trimestre → evaluación
  const evMap = useMemo(() => {
    const m = new Map<string, Map<number, Evaluacion>>()
    evaluaciones.filter(e => e.grupo_id === grupoId).forEach(e => {
      if (!m.has(e.alumno_id)) m.set(e.alumno_id, new Map())
      m.get(e.alumno_id)!.set(e.trimestre, e)
    })
    return m
  }, [evaluaciones, grupoId])

  // Promedios del grupo por campo para un período
  function promsCampoGrupo(t: number): Record<Campo, number | null> & { general: number | null } {
    const out = {} as Record<Campo, number | null> & { general: number | null }
    const generales: number[] = []
    CAMPOS.forEach(c => {
      const vals: number[] = []
      alumnosGrupo.forEach(a => {
        const v = evMap.get(a.id)?.get(t)?.[c]
        if (v !== null && v !== undefined && v > 0) vals.push(v)
      })
      out[c] = media(vals)
    })
    alumnosGrupo.forEach(a => {
      const p = promEval(evMap.get(a.id)?.get(t))
      if (p !== null) generales.push(p)
    })
    out.general = media(generales)
    return out
  }

  // Distribución por rangos de un trimestre
  function distribucion(t: number) {
    const counts: Record<string, number> = { r10: 0, r9: 0, r8: 0, r7: 0, r6: 0, r5: 0 }
    let evaluados = 0
    alumnosGrupo.forEach(a => {
      const p = promEval(evMap.get(a.id)?.get(t))
      if (p === null) return
      evaluados++
      const r = RANGOS.find(rg => p >= rg.min)!
      counts[r.key]++
    })
    return { counts, evaluados, total: alumnosGrupo.length }
  }

  // Promedio final por alumno: media de promedios trimestrales (T1-T3, sin diagnóstico)
  function finalAlumno(alumnoId: string) {
    const porCampo = {} as Record<Campo, number | null>
    CAMPOS.forEach(c => {
      const vals: number[] = []
      ;[1, 2, 3].forEach(t => {
        const v = evMap.get(alumnoId)?.get(t)?.[c]
        if (v !== null && v !== undefined && v > 0) vals.push(v)
      })
      porCampo[c] = media(vals)
    })
    const promsTrim: number[] = []
    ;[1, 2, 3].forEach(t => {
      const p = promEval(evMap.get(alumnoId)?.get(t))
      if (p !== null) promsTrim.push(trunc1(p))
    })
    return { porCampo, promFinal: media(promsTrim) }
  }

  // ── Export Excel (6 hojas, formato SIDEC) ─────────────────────────────────

  function descargarExcel() {
    const wb = XLSX.utils.book_new()

    PERIODOS.forEach(p => {
      const aoa: unknown[][] = [['NP', 'NOMBRE', 'LENGUAJES', 'SABERES Y PENS.', 'ETICA NAT. Y SOC.', 'DE LO HUMANO', 'PROMEDIO']]
      alumnosGrupo.forEach((a, i) => {
        const ev = evMap.get(a.id)?.get(p.t)
        const prom = promEval(ev)
        aoa.push([
          i + 1, a.nombre,
          ...CAMPOS.map(c => (ev?.[c] !== null && ev?.[c] !== undefined && ev[c]! > 0 ? trunc1(ev[c]!) : '')),
          prom !== null ? trunc1(prom) : '',
        ])
      })
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 16 }, { wch: 13 }, { wch: 10 }]
      const nombre = p.t === 0 ? 'DIAG' : `${p.t}ER TRIM`.replace('2ER', '2DO').replace('3ER', '3ER')
      XLSX.utils.book_append_sheet(wb, ws, nombre)
    })

    // PROM FINAL
    {
      const aoa: unknown[][] = [['NP', 'NOMBRE', 'LENGUAJES', 'SABERES Y PENS.', 'ETICA NAT. Y SOC.', 'DE LO HUMANO', 'PROM FINAL']]
      alumnosGrupo.forEach((a, i) => {
        const f = finalAlumno(a.id)
        aoa.push([
          i + 1, a.nombre,
          ...CAMPOS.map(c => (f.porCampo[c] !== null ? trunc1(f.porCampo[c]!) : '')),
          f.promFinal !== null ? trunc1(f.promFinal) : '',
        ])
      })
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 16 }, { wch: 13 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(wb, ws, 'PROM FINAL')
    }

    // APREND-ESP
    {
      const aoa: unknown[][] = []
      ;[1, 2, 3].forEach(t => {
        const { counts, total } = distribucion(t)
        aoa.push([`${t}ER TRIMESTRE`.replace('2ER', '2DO').replace('3ER', '3ER')])
        aoa.push(['ALUMNOS', ...RANGOS.flatMap(r => [`${r.label} Num.`, `${r.label} %`])])
        aoa.push([
          total,
          ...RANGOS.flatMap(r => [
            counts[r.key],
            total > 0 ? (counts[r.key] / total) : 0,
          ]),
        ])
        aoa.push([])
      })
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = Array(13).fill({ wch: 12 })
      XLSX.utils.book_append_sheet(wb, ws, 'APREND-ESP')
    }

    const nombre = `aprovechamiento_${grupoActual.grado}_${grupoActual.grupo}_${grupoActual.ciclo_escolar}.xlsx`
      .replace(/[^\w._-]/g, '_')
    XLSX.writeFile(wb, nombre)
  }

  // ── Datos para render ──────────────────────────────────────────────────────

  const promsGrupo = useMemo(() => promsCampoGrupo(periodo), [grupoId, periodo, evMap, alumnosGrupo]) // eslint-disable-line react-hooks/exhaustive-deps

  const datosEvolucion = useMemo(() =>
    PERIODOS.map(p => {
      const proms = promsCampoGrupo(p.t)
      return {
        periodo: p.label,
        General: proms.general !== null ? trunc1(proms.general) : null,
        ...Object.fromEntries(CAMPOS.map(c => [LABEL_CAMPO[c], proms[c] !== null ? trunc1(proms[c]!) : null])),
      }
    }),
  [grupoId, evMap, alumnosGrupo]) // eslint-disable-line react-hooks/exhaustive-deps

  const datosBarrasCampo = CAMPOS.map(c => ({
    campo: LABEL_CAMPO[c],
    promedio: promsGrupo[c] !== null ? trunc1(promsGrupo[c]!) : 0,
    fill: COLOR_CAMPO[c],
  }))

  const datosComparativo = useMemo(() => {
    const porTrim = [1, 2, 3].map(t => promsCampoGrupo(t))
    return CAMPOS.map((c, _i) => ({
      campo: LABEL_CAMPO[c],
      T1: porTrim[0][c] !== null ? trunc1(porTrim[0][c]!) : undefined,
      T2: porTrim[1][c] !== null ? trunc1(porTrim[1][c]!) : undefined,
      T3: porTrim[2][c] !== null ? trunc1(porTrim[2][c]!) : undefined,
    }))
  }, [grupoId, evMap, alumnosGrupo]) // eslint-disable-line react-hooks/exhaustive-deps

  const distActual = distribucion(periodo)
  const datosBarrasRangos = RANGOS.map(r => ({
    rango: r.label,
    alumnos: distActual.counts[r.key],
  }))

  const selectorPeriodo = (
    <div className="flex gap-1.5 flex-wrap">
      {PERIODOS.map(p => (
        <button key={p.t} onClick={() => setPeriodo(p.t)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={periodo === p.t
            ? { background: 'rgba(6,135,216,0.10)', color: '#0687D8', border: '1px solid rgba(6,135,216,0.30)' }
            : { background: '#fff', color: '#64748B', border: '1px solid #E2E8F0' }}>
          {p.label}
        </button>
      ))}
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Aprovechamiento</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {grupoActual.grado} {grupoActual.grupo} · {grupoActual.ciclo_escolar} · {alumnosGrupo.length} alumno{alumnosGrupo.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {grupos.length > 1 && (
            <select value={grupoId} onChange={e => setGrupoId(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm focus:outline-none"
              style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }}>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.grado} {g.grupo}</option>)}
            </select>
          )}
          <button onClick={descargarExcel}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}>
            <Download size={15} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={tab === t.key
              ? { background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', color: '#fff', boxShadow: '0 4px 16px rgba(6,135,216,0.25)' }
              : { background: '#fff', color: '#64748B', border: '1px solid #E2E8F0' }}>
            {t.label}
          </button>
        ))}
      </div>

      {alumnosGrupo.length === 0 ? (
        <div className="rounded-2xl text-center py-16 text-sm" style={{ ...cardStyle, color: '#94A3B8' }}>
          Este grupo no tiene alumnos activos.
        </div>
      ) : (
        <>
          {/* ── Tab: Por Período ─────────────────────────────────────────── */}
          {tab === 'periodo' && (
            <div className="space-y-4">
              {selectorPeriodo}
              <div className="rounded-2xl overflow-x-auto" style={cardStyle}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                      {['#', 'Alumno', ...CAMPOS.map(c => LABEL_CAMPO[c]), 'Promedio'].map((h, i) => (
                        <th key={h} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${i < 2 ? 'text-left' : 'text-center'}`}
                          style={{ background: '#F8FAFF', color: '#64748B' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosGrupo.map((a, i) => {
                      const ev = evMap.get(a.id)?.get(periodo)
                      const prom = promEval(ev)
                      return (
                        <tr key={a.id} style={{ borderTop: i > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}>
                          <td className="px-3 py-2.5 text-xs" style={{ color: '#94A3B8' }}>{i + 1}</td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: '#1E2D3D' }}>{a.nombre}</td>
                          {CAMPOS.map(c => {
                            const v = ev?.[c] !== null && ev?.[c] !== undefined && ev[c]! > 0 ? ev[c]! : null
                            return (
                              <td key={c} className="px-3 py-2.5 text-center text-xs font-bold" style={colorCelda(v)}>
                                {fmt(v)}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2.5 text-center text-xs font-bold" style={colorCelda(prom)}>{fmt(prom)}</td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: '2px solid rgba(6,135,216,0.15)', background: '#F8FAFF' }}>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-xs font-bold uppercase" style={{ color: '#0687D8' }}>Promedio del grupo</td>
                      {CAMPOS.map(c => (
                        <td key={c} className="px-3 py-3 text-center text-xs font-bold" style={{ color: '#1E2D3D' }}>{fmt(promsGrupo[c])}</td>
                      ))}
                      <td className="px-3 py-3 text-center text-xs font-bold" style={{ color: '#0687D8' }}>{fmt(promsGrupo.general)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Promedio Final ──────────────────────────────────────── */}
          {tab === 'final' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: '#94A3B8' }}>Promedio de los 3 trimestres (el Diagnóstico no cuenta para el promedio final).</p>
              <div className="rounded-2xl overflow-x-auto" style={cardStyle}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                      {['#', 'Alumno', ...CAMPOS.map(c => LABEL_CAMPO[c]), 'Prom. Final'].map((h, i) => (
                        <th key={h} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide ${i < 2 ? 'text-left' : 'text-center'}`}
                          style={{ background: '#F8FAFF', color: '#64748B' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosGrupo.map((a, i) => {
                      const f = finalAlumno(a.id)
                      return (
                        <tr key={a.id} style={{ borderTop: i > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}>
                          <td className="px-3 py-2.5 text-xs" style={{ color: '#94A3B8' }}>{i + 1}</td>
                          <td className="px-3 py-2.5 font-medium" style={{ color: '#1E2D3D' }}>{a.nombre}</td>
                          {CAMPOS.map(c => (
                            <td key={c} className="px-3 py-2.5 text-center text-xs font-bold" style={colorCelda(f.porCampo[c])}>
                              {fmt(f.porCampo[c])}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center text-xs font-bold" style={colorCelda(f.promFinal)}>{fmt(f.promFinal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Aprendizajes Esperados ──────────────────────────────── */}
          {tab === 'aprend' && (
            <div className="space-y-4">
              {[1, 2, 3].map(t => {
                const { counts, evaluados, total } = distribucion(t)
                return (
                  <div key={t} className="rounded-2xl overflow-hidden" style={cardStyle}>
                    <div className="px-5 py-3 flex items-center justify-between"
                      style={{ background: ['rgba(6,135,216,0.08)', 'rgba(124,58,237,0.08)', 'rgba(16,185,129,0.08)'][t - 1] }}>
                      <p className="text-sm font-bold" style={{ color: ['#0687D8', '#7C3AED', '#059669'][t - 1] }}>
                        {['1er', '2do', '3er'][t - 1]} Trimestre
                      </p>
                      <p className="text-xs" style={{ color: '#64748B' }}>
                        {evaluados} de {total} alumno{total !== 1 ? 's' : ''} con calificación
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: '#64748B' }}>Alumnos</th>
                          {RANGOS.map(r => (
                            <th key={r.key} className="px-3 py-2.5 text-center text-xs font-semibold uppercase" style={{ color: '#64748B' }}>{r.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 font-bold" style={{ color: '#1E2D3D' }}>{total}</td>
                          {RANGOS.map(r => (
                            <td key={r.key} className="px-3 py-3 text-center">
                              <span className="text-sm font-bold" style={{ color: '#1E2D3D' }}>{counts[r.key]}</span>
                              <span className="block text-xs" style={{ color: '#94A3B8' }}>
                                {total > 0 ? ((counts[r.key] / total) * 100).toFixed(1) : '0.0'}%
                              </span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Tab: Gráficas ────────────────────────────────────────────── */}
          {tab === 'graficas' && (
            <div className="space-y-4">
              {selectorPeriodo}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <p className="text-sm font-semibold mb-4" style={{ color: '#1E2D3D' }}>
                    Promedio por campo formativo — {PERIODOS.find(p => p.t === periodo)?.label}
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={datosBarrasCampo} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                      <XAxis dataKey="campo" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip formatter={(v: number) => [v.toFixed(1), 'Promedio']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="promedio" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        <LabelList dataKey="promedio" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#1E2D3D' }} />
                        {datosBarrasCampo.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl p-5" style={cardStyle}>
                  <p className="text-sm font-semibold mb-4" style={{ color: '#1E2D3D' }}>
                    Distribución por rango — {PERIODOS.find(p => p.t === periodo)?.label}
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={datosBarrasRangos} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                      <XAxis dataKey="rango" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip formatter={(v: number) => [v, 'Alumnos']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="alumnos" fill="#0687D8" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        <LabelList dataKey="alumnos" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#1E2D3D' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl p-5 lg:col-span-2" style={cardStyle}>
                  <p className="text-sm font-semibold mb-4" style={{ color: '#1E2D3D' }}>Comparativo de trimestres por campo</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datosComparativo} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                      <XAxis dataKey="campo" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip formatter={(v: number) => [v.toFixed(1), '']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="T1" fill="#0687D8" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="T2" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="T3" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Evolución ───────────────────────────────────────────── */}
          {tab === 'evolucion' && (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {([['general', 'Promedio General'], ['campo', 'Por Campo']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setDimension(k)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={dimension === k
                      ? { background: 'rgba(6,135,216,0.10)', color: '#0687D8', border: '1px solid rgba(6,135,216,0.30)' }
                      : { background: '#fff', color: '#64748B', border: '1px solid #E2E8F0' }}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl p-5" style={cardStyle}>
                <p className="text-sm font-semibold mb-4" style={{ color: '#1E2D3D' }}>
                  Evolución del grupo — Diagnóstico a 3er Trimestre
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={datosEvolucion} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip formatter={(v: number) => [v?.toFixed?.(1) ?? v, '']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    {dimension === 'general' ? (
                      <Line type="monotone" dataKey="General" stroke="#0687D8" strokeWidth={3}
                        dot={{ r: 5, fill: '#0687D8' }} connectNulls />
                    ) : (
                      CAMPOS.map(c => (
                        <Line key={c} type="monotone" dataKey={LABEL_CAMPO[c]} stroke={COLOR_CAMPO[c]} strokeWidth={2.5}
                          dot={{ r: 4, fill: COLOR_CAMPO[c] }} connectNulls />
                      ))
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
