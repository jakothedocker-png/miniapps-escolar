'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Save, Check, Users, MessageSquare, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { guardarCalificaciones, guardarObsCampo, guardarAlumnoCalif } from '@/app/actions/calificaciones'
import Modal from '@/components/ui/Modal'

interface Alumno {
  id: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  curp: string | null
}

interface IaPar { op1: string; op2: string }

interface Evaluacion {
  id: string
  alumno_id: string
  trimestre: number
  ciclo_escolar: string
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
  promedio_general: number | null
  inasistencias: number | null
  obs_lenguajes: string | null
  obs_saberes: string | null
  obs_etica: string | null
  obs_humanos: string | null
  ia_obs_lenguajes: IaPar | null
  ia_obs_saberes: IaPar | null
  ia_obs_etica: IaPar | null
  ia_obs_humanos: IaPar | null
  ia_usos_lenguajes: number
  ia_usos_saberes: number
  ia_usos_etica: number
  ia_usos_humanos: number
}

interface Grupo {
  id: string
  grado: string
  grupo: string
  ciclo_escolar: string
}

interface Props {
  grupo: Grupo
  alumnos: Alumno[]
  evaluaciones: Evaluacion[]
}

type Trimestre = 0 | 1 | 2 | 3  // 0 = Diagnóstico
type Campo = 'lenguajes' | 'saberes' | 'etica' | 'humanos'
type ObsCampo = `obs_${Campo}`
type IaObsCampo = `ia_obs_${Campo}`
type IaUsosCampo = `ia_usos_${Campo}`
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const TRIMESTRES: { valor: Trimestre; label: string }[] = [
  { valor: 0, label: 'Diagnóstico' },
  { valor: 1, label: '1er Trimestre' },
  { valor: 2, label: '2do Trimestre' },
  { valor: 3, label: '3er Trimestre' },
]

const CAMPOS: { key: Campo; label: string; corto: string }[] = [
  { key: 'lenguajes', label: 'Lenguajes',       corto: 'Lenguajes' },
  { key: 'saberes',   label: 'Saberes y P.C.',  corto: 'Saberes' },
  { key: 'etica',     label: 'Ética, N. y S.',  corto: 'Ética' },
  { key: 'humanos',   label: 'De lo Humano',    corto: 'Humano' },
]

const OBS_KEY: Record<Campo, ObsCampo> = {
  lenguajes: 'obs_lenguajes',
  saberes:   'obs_saberes',
  etica:     'obs_etica',
  humanos:   'obs_humanos',
}

const IA_OBS_KEY: Record<Campo, IaObsCampo> = {
  lenguajes: 'ia_obs_lenguajes',
  saberes:   'ia_obs_saberes',
  etica:     'ia_obs_etica',
  humanos:   'ia_obs_humanos',
}

const IA_USOS_KEY: Record<Campo, IaUsosCampo> = {
  lenguajes: 'ia_usos_lenguajes',
  saberes:   'ia_usos_saberes',
  etica:     'ia_usos_etica',
  humanos:   'ia_usos_humanos',
}

function calcularPromedio(vals: (number | null)[]): number | null {
  const noNulos = vals.filter((v): v is number => v !== null)
  if (noNulos.length === 0) return null
  return Math.round((noNulos.reduce((a, b) => a + b, 0) / noNulos.length) * 10) / 10
}

function nombreCompleto(a: Alumno) {
  return [a.apellido_paterno, a.apellido_materno, a.nombre].filter(Boolean).join(' ')
}

interface ModalInfo {
  alumnoId: string
  alumnoNombre: string
  campo: Campo
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

export default function CalificacionesClient({ grupo, alumnos, evaluaciones }: Props) {
  const [trimestre, setTrimestre] = useState<Trimestre>(1)
  const [pending, startTransition] = useTransition()
  const [pendingObs, startObsTransition] = useTransition()
  const [guardado, setGuardado] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  // ── Calificaciones ────────────────────────────────────────────────────────
  const [califs, setCalifs] = useState<Record<Trimestre, Record<string, Record<Campo, number | null>>>>(() => {
    const init: Record<Trimestre, Record<string, Record<Campo, number | null>>> = { 0: {}, 1: {}, 2: {}, 3: {} }
    for (const ev of evaluaciones) {
      const t = ev.trimestre as Trimestre
      init[t][ev.alumno_id] = {
        lenguajes: ev.lenguajes,
        saberes:   ev.saberes,
        etica:     ev.etica,
        humanos:   ev.humanos,
      }
    }
    for (const t of [0, 1, 2, 3] as Trimestre[]) {
      for (const alumno of alumnos) {
        if (!init[t][alumno.id]) {
          init[t][alumno.id] = { lenguajes: null, saberes: null, etica: null, humanos: null }
        }
      }
    }
    return init
  })

  // ── Inasistencias ─────────────────────────────────────────────────────────
  const [inasist, setInasist] = useState<Record<Trimestre, Record<string, number | null>>>(() => {
    const init: Record<Trimestre, Record<string, number | null>> = { 0: {}, 1: {}, 2: {}, 3: {} }
    for (const ev of evaluaciones) {
      const t = ev.trimestre as Trimestre
      init[t][ev.alumno_id] = ev.inasistencias ?? 0
    }
    for (const t of [0, 1, 2, 3] as Trimestre[]) {
      for (const alumno of alumnos) {
        if (init[t][alumno.id] === undefined) init[t][alumno.id] = null
      }
    }
    return init
  })

  // ── Observaciones guardadas por campo ─────────────────────────────────────
  const [obsMap, setObsMap] = useState<Record<Trimestre, Record<string, Record<ObsCampo, string>>>>(() => {
    const init: Record<Trimestre, Record<string, Record<ObsCampo, string>>> = { 0: {}, 1: {}, 2: {}, 3: {} }
    for (const ev of evaluaciones) {
      const t = ev.trimestre as Trimestre
      init[t][ev.alumno_id] = {
        obs_lenguajes: ev.obs_lenguajes ?? '',
        obs_saberes:   ev.obs_saberes ?? '',
        obs_etica:     ev.obs_etica ?? '',
        obs_humanos:   ev.obs_humanos ?? '',
      }
    }
    for (const t of [0, 1, 2, 3] as Trimestre[]) {
      for (const alumno of alumnos) {
        if (!init[t][alumno.id]) {
          init[t][alumno.id] = { obs_lenguajes: '', obs_saberes: '', obs_etica: '', obs_humanos: '' }
        }
      }
    }
    return init
  })

  // ── Pares IA generados + contadores de uso por campo ─────────────────────
  const [iaParMap, setIaParMap] = useState<Record<Trimestre, Record<string, Record<IaObsCampo, IaPar | null>>>>(() => {
    const init: Record<Trimestre, Record<string, Record<IaObsCampo, IaPar | null>>> = { 0: {}, 1: {}, 2: {}, 3: {} }
    for (const ev of evaluaciones) {
      const t = ev.trimestre as Trimestre
      init[t][ev.alumno_id] = {
        ia_obs_lenguajes: ev.ia_obs_lenguajes ?? null,
        ia_obs_saberes:   ev.ia_obs_saberes   ?? null,
        ia_obs_etica:     ev.ia_obs_etica     ?? null,
        ia_obs_humanos:   ev.ia_obs_humanos   ?? null,
      }
    }
    for (const t of [0, 1, 2, 3] as Trimestre[]) {
      for (const alumno of alumnos) {
        if (!init[t][alumno.id]) {
          init[t][alumno.id] = { ia_obs_lenguajes: null, ia_obs_saberes: null, ia_obs_etica: null, ia_obs_humanos: null }
        }
      }
    }
    return init
  })

  const [iaUsosMap, setIaUsosMap] = useState<Record<Trimestre, Record<string, Record<IaUsosCampo, number>>>>(() => {
    const init: Record<Trimestre, Record<string, Record<IaUsosCampo, number>>> = { 0: {}, 1: {}, 2: {}, 3: {} }
    for (const ev of evaluaciones) {
      const t = ev.trimestre as Trimestre
      init[t][ev.alumno_id] = {
        ia_usos_lenguajes: ev.ia_usos_lenguajes ?? 0,
        ia_usos_saberes:   ev.ia_usos_saberes   ?? 0,
        ia_usos_etica:     ev.ia_usos_etica     ?? 0,
        ia_usos_humanos:   ev.ia_usos_humanos   ?? 0,
      }
    }
    for (const t of [0, 1, 2, 3] as Trimestre[]) {
      for (const alumno of alumnos) {
        if (!init[t][alumno.id]) {
          init[t][alumno.id] = { ia_usos_lenguajes: 0, ia_usos_saberes: 0, ia_usos_etica: 0, ia_usos_humanos: 0 }
        }
      }
    }
    return init
  })

  // ── Autosave ──────────────────────────────────────────────────────────────
  const califsRef  = useRef(califs);  califsRef.current  = califs
  const inasistRef = useRef(inasist); inasistRef.current = inasist
  const trimestreRef = useRef<Trimestre>(trimestre); trimestreRef.current = trimestre
  const autoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [saveState, setSaveState] = useState<Record<string, SaveStatus>>({})

  // Reset save state when trimestre changes
  useEffect(() => {
    Object.values(autoTimers.current).forEach(clearTimeout)
    autoTimers.current = {}
    setSaveState({})
  }, [trimestre])

  function scheduleAutosave(alumnoId: string) {
    if (autoTimers.current[alumnoId]) clearTimeout(autoTimers.current[alumnoId])
    setSaveState(prev => ({ ...prev, [alumnoId]: 'idle' }))
    autoTimers.current[alumnoId] = setTimeout(async () => {
      setSaveState(prev => ({ ...prev, [alumnoId]: 'saving' }))
      const t = trimestreRef.current
      const campos = califsRef.current[t][alumnoId] ?? { lenguajes: null, saberes: null, etica: null, humanos: null }
      const prom = calcularPromedio([campos.lenguajes, campos.saberes, campos.etica, campos.humanos])
      const res = await guardarAlumnoCalif({
        alumno_id:        alumnoId,
        grupo_id:         grupo.id,
        trimestre:        t,
        ciclo_escolar:    grupo.ciclo_escolar,
        lenguajes:        campos.lenguajes,
        saberes:          campos.saberes,
        etica:            campos.etica,
        humanos:          campos.humanos,
        inasistencias:    inasistRef.current[t][alumnoId] ?? 0,
        promedio_general: prom,
      })
      setSaveState(prev => ({ ...prev, [alumnoId]: res.error ? 'error' : 'saved' }))
      if (!res.error) setTimeout(() => setSaveState(prev => ({ ...prev, [alumnoId]: 'idle' })), 1500)
    }, 2000)
  }

  // ── Modal de observación ──────────────────────────────────────────────────
  const [modal, setModal]             = useState<ModalInfo | null>(null)
  const [modalTexto, setModalTexto]   = useState('')
  const [iaDesc, setIaDesc]           = useState('')
  const [iaOpciones, setIaOpciones]   = useState<{ op1: string; op2: string } | null>(null)
  const [generando, setGenerando]     = useState(false)
  const [iaError, setIaError]         = useState<string | null>(null)
  const [obsError, setObsError]       = useState<string | null>(null)

  // ── Handlers calificaciones ───────────────────────────────────────────────
  const setCampo = useCallback((alumnoId: string, campo: Campo, valor: number | null) => {
    setCalifs(prev => ({
      ...prev,
      [trimestre]: {
        ...prev[trimestre],
        [alumnoId]: { ...prev[trimestre][alumnoId], [campo]: valor },
      },
    }))
  }, [trimestre])

  function handleInputChange(alumnoId: string, campo: Campo, raw: string) {
    if (raw === '') { setCampo(alumnoId, campo, null); scheduleAutosave(alumnoId); return }
    const num = parseInt(raw, 10)
    if (isNaN(num)) return
    const clamped = Math.max(5, Math.min(10, num))
    setCampo(alumnoId, campo, clamped)
    scheduleAutosave(alumnoId)
  }

  function handleInasistChange(alumnoId: string, raw: string) {
    setInasist(prev => ({
      ...prev,
      [trimestre]: {
        ...prev[trimestre],
        [alumnoId]: raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0),
      },
    }))
    scheduleAutosave(alumnoId)
  }

  function handleGuardar() {
    setErrorGuardar(null)
    const rows = alumnos.map(alumno => {
      const campos = califs[trimestre][alumno.id]
      return {
        alumno_id:    alumno.id,
        grupo_id:     grupo.id,
        trimestre,
        ciclo_escolar: grupo.ciclo_escolar,
        lenguajes:    campos?.lenguajes ?? null,
        saberes:      campos?.saberes ?? null,
        etica:        campos?.etica ?? null,
        humanos:      campos?.humanos ?? null,
        inasistencias: inasist[trimestre][alumno.id] ?? 0,
        promedio_general: calcularPromedio([
          campos?.lenguajes ?? null,
          campos?.saberes ?? null,
          campos?.etica ?? null,
          campos?.humanos ?? null,
        ]),
      }
    })
    startTransition(async () => {
      const res = await guardarCalificaciones(rows, grupo.id)
      if (res.error) { setErrorGuardar(res.error); return }
      setGuardado(true)
      setSaveState({})
      setTimeout(() => setGuardado(false), 2000)
    })
  }

  // ── Handlers modal obs ────────────────────────────────────────────────────
  function abrirModal(alumno: Alumno, campo: Campo) {
    const obs      = obsMap[trimestre][alumno.id]?.[OBS_KEY[campo]] ?? ''
    const savedPar = iaParMap[trimestre][alumno.id]?.[IA_OBS_KEY[campo]] ?? null
    setModal({ alumnoId: alumno.id, alumnoNombre: nombreCompleto(alumno), campo })
    setModalTexto(obs)
    setIaDesc('')
    setIaOpciones(savedPar ? { op1: savedPar.op1, op2: savedPar.op2 } : null)
    setIaError(null)
    setObsError(null)
  }

  function cerrarModal() {
    setModal(null)
    setIaOpciones(null)
    setGenerando(false)
  }

  async function generarIA() {
    if (!modal) return
    setGenerando(true)
    setIaOpciones(null)
    setIaError(null)
    try {
      const res = await fetch('/api/ia/observaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id:           modal.alumnoId,
          trimestre,
          ciclo_escolar:       grupo.ciclo_escolar,
          descripcion_maestro: iaDesc.trim() || `Alumno de ${grupo.grado} grado`,
          campo:               modal.campo,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setIaError(json.error || 'Error al generar'); return }

      const newPar: IaPar = { op1: json.observacion_1, op2: json.observacion_2 }
      setIaOpciones(newPar)

      // Guardar par en estado local
      setIaParMap(prev => ({
        ...prev,
        [trimestre]: {
          ...prev[trimestre],
          [modal.alumnoId]: { ...prev[trimestre][modal.alumnoId], [IA_OBS_KEY[modal.campo]]: newPar },
        },
      }))

      // Actualizar contador de usos local
      if (json.usos_campo != null) {
        setIaUsosMap(prev => ({
          ...prev,
          [trimestre]: {
            ...prev[trimestre],
            [modal.alumnoId]: { ...prev[trimestre][modal.alumnoId], [IA_USOS_KEY[modal.campo]]: json.usos_campo },
          },
        }))
      }
    } catch {
      setIaError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  function guardarObs() {
    if (!modal) return
    setObsError(null)
    startObsTransition(async () => {
      const res = await guardarObsCampo({
        alumno_id:     modal.alumnoId,
        grupo_id:      grupo.id,
        trimestre,
        ciclo_escolar: grupo.ciclo_escolar,
        campo:         modal.campo,
        texto:         modalTexto.slice(0, 500),
      })
      if (res.error) { setObsError(res.error); return }
      setObsMap(prev => ({
        ...prev,
        [trimestre]: {
          ...prev[trimestre],
          [modal.alumnoId]: {
            ...prev[trimestre][modal.alumnoId],
            [OBS_KEY[modal.campo]]: modalTexto.slice(0, 500),
          },
        },
      }))
      cerrarModal()
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (alumnos.length === 0) {
    return (
      <div className="p-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
        <div className="rounded-2xl p-12 text-center" style={cardStyle}>
          <Users size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            No hay alumnos en este grupo. Agrégalos primero.
          </p>
          <Link
            href={`/app/grupos/${grupo.id}/alumnos`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
          >
            Ir a Alumnos
          </Link>
        </div>
      </div>
    )
  }

  const campoActualLabel = modal
    ? CAMPOS.find(c => c.key === modal.campo)?.label ?? modal.campo
    : ''

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>

      {/* Selector de trimestre */}
      <div
        className="flex items-center gap-1 rounded-xl p-1 w-fit"
        style={{ background: '#FFFFFF', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 2px 8px rgba(30,45,61,0.06)' }}
      >
        {TRIMESTRES.map(t => (
          <button
            key={t.valor}
            onClick={() => setTrimestre(t.valor)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={trimestre === t.valor
              ? { background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(6,135,216,0.30)' }
              : { color: '#64748B' }
            }
            onMouseEnter={e => { if (trimestre !== t.valor) (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.06)' }}
            onMouseLeave={e => { if (trimestre !== t.valor) (e.currentTarget as HTMLElement).style.background = '' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-x-auto" style={cardStyle}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide min-w-[180px]"
                style={{ background: '#F8FAFF', color: '#64748B' }}>
                Alumno
              </th>
              {CAMPOS.map(c => (
                <th key={c.key} className="px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-wide"
                  style={{ background: '#F8FAFF', color: '#64748B' }}>
                  {c.corto}
                </th>
              ))}
              <th className="px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-wide w-20"
                style={{ background: '#F8FAFF', color: '#64748B' }}>
                Faltas
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide w-24"
                style={{ background: '#F8FAFF', color: '#64748B' }}>
                Prom.
              </th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((alumno, idx) => {
              const campos = califs[trimestre][alumno.id] ?? { lenguajes: null, saberes: null, etica: null, humanos: null }
              const promedio = calcularPromedio([campos.lenguajes, campos.saberes, campos.etica, campos.humanos])
              const faltasVal = inasist[trimestre][alumno.id]
              const rowStatus = saveState[alumno.id] ?? 'idle'

              return (
                <tr
                  key={alumno.id}
                  style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <td className="px-5 py-2.5 font-medium text-sm" style={{ color: '#1E2D3D' }}>
                    {nombreCompleto(alumno)}
                  </td>

                  {CAMPOS.map(c => {
                    const tieneObs = !!(obsMap[trimestre][alumno.id]?.[OBS_KEY[c.key]])
                    return (
                      <td key={c.key} className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min={5}
                            max={10}
                            step={1}
                            value={campos[c.key] === null ? '' : campos[c.key]!}
                            onChange={e => handleInputChange(alumno.id, c.key, e.target.value)}
                            className="w-14 text-center px-1 py-1.5 rounded-lg text-sm focus:outline-none transition"
                            style={{
                              border: '1px solid #E2E8F0',
                              background: '#fff',
                              color: '#1E2D3D',
                            }}
                            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                            placeholder="—"
                          />
                          <button
                            onClick={() => abrirModal(alumno, c.key)}
                            title={`Observación: ${c.label}`}
                            className="p-1 rounded-lg transition-colors flex-shrink-0"
                            style={{ color: tieneObs ? '#0687D8' : '#CBD5E1' }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.08)'
                              ;(e.currentTarget as HTMLElement).style.color = '#0687D8'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = ''
                              ;(e.currentTarget as HTMLElement).style.color = tieneObs ? '#0687D8' : '#CBD5E1'
                            }}
                          >
                            <MessageSquare size={13} />
                          </button>
                        </div>
                      </td>
                    )
                  })}

                  <td className="px-2 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={faltasVal === null ? '' : faltasVal}
                      onChange={e => handleInasistChange(alumno.id, e.target.value)}
                      className="w-14 text-center px-1 py-1.5 rounded-lg text-sm focus:outline-none transition"
                      style={{
                        border: '1px solid #E2E8F0',
                        background: '#fff',
                        color: '#1E2D3D',
                      }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                      placeholder="0"
                    />
                  </td>

                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-bold" style={{
                        color: promedio === null
                          ? '#94A3B8'
                          : promedio >= 8 ? '#15803D'
                          : promedio >= 6 ? '#B45309'
                          : '#DC2626'
                      }}>
                        {promedio === null ? '—' : promedio.toFixed(1)}
                      </span>
                      {rowStatus === 'saving' && (
                        <Loader2 size={11} className="animate-spin flex-shrink-0" style={{ color: '#94A3B8' }} />
                      )}
                      {rowStatus === 'saved' && (
                        <CheckCircle size={11} className="flex-shrink-0" style={{ color: '#15803D' }} />
                      )}
                      {rowStatus === 'error' && (
                        <AlertCircle size={11} className="flex-shrink-0" style={{ color: '#DC2626' }} />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Guardar todo */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Los cambios se guardan automáticamente al dejar de escribir
        </p>
        <div className="flex items-center gap-3">
          {errorGuardar && (
            <p className="text-sm" style={{ color: '#DC2626' }}>{errorGuardar}</p>
          )}
          <button
            onClick={handleGuardar}
            disabled={pending}
            className="flex items-center gap-2 px-6 py-2.5 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
          >
            {pending ? (
              <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            ) : guardado ? (
              <><Check size={16} /> Guardado</>
            ) : (
              <><Save size={16} /> Guardar todo</>
            )}
          </button>
        </div>
      </div>

      {/* Modal de observación por campo */}
      {modal && (() => {
        const usosActuales = iaUsosMap[trimestre][modal.alumnoId]?.[IA_USOS_KEY[modal.campo]] ?? 0
        const generarBloqueado = usosActuales >= 2
        return (
        <Modal titulo={`Observación — ${campoActualLabel}`} onClose={cerrarModal}>
          <div className="space-y-3">

            {/* Info alumno */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(6,135,216,0.06)', border: '1px solid rgba(6,135,216,0.12)' }}>
              <span className="text-xs font-semibold" style={{ color: '#1E2D3D' }}>{modal.alumnoNombre}</span>
              <span style={{ color: '#CBD5E1' }}>·</span>
              <span className="text-xs" style={{ color: '#64748B' }}>{TRIMESTRES.find(t => t.valor === trimestre)?.label}</span>
            </div>

            {/* Textarea observación */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: '#64748B' }}>Observación / Sugerencia de mejora</label>
                <span className="text-xs font-medium" style={{ color: modalTexto.length > 480 ? '#B45309' : '#94A3B8' }}>
                  {modalTexto.length}/500
                </span>
              </div>
              <textarea
                value={modalTexto}
                onChange={e => setModalTexto(e.target.value.slice(0, 500))}
                rows={5}
                placeholder="Escribe aquí la sugerencia de mejora para el alumno..."
                className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition"
                style={{
                  background: '#fff',
                  border: '1px solid #E2E8F0',
                  color: '#1E2D3D',
                }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Sección IA */}
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(6,135,216,0.04)', border: '1px solid rgba(6,135,216,0.15)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: '#0687D8' }}>
                  <Sparkles size={11} /> Generar sugerencia con IA
                </p>
                <span className="text-xs font-medium" style={{ color: generarBloqueado ? '#DC2626' : '#94A3B8' }}>
                  {usosActuales}/2 usos
                </span>
              </div>

              {/* Input + botón en la misma fila */}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={300}
                  value={iaDesc}
                  onChange={e => setIaDesc(e.target.value)}
                  disabled={generarBloqueado}
                  placeholder={generarBloqueado ? 'Límite de generaciones alcanzado' : 'Área de oportunidad (ej: le cuesta leer en voz alta)'}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-50 transition"
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    color: '#1E2D3D',
                  }}
                  onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                  onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                />
                <button
                  onClick={generarIA}
                  disabled={generando || generarBloqueado}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 text-white"
                  style={generarBloqueado
                    ? { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' }
                    : { background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 2px 8px rgba(6,135,216,0.25)' }
                  }
                >
                  {generando
                    ? <><Loader2 size={12} className="animate-spin" /> Generando</>
                    : generarBloqueado
                    ? 'Límite (2/2)'
                    : <><Sparkles size={12} /> Generar</>
                  }
                </button>
              </div>

              {iaError && (
                <p className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#DC2626', background: '#FEF2F2' }}>{iaError}</p>
              )}

              {iaOpciones && (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { num: 1 as const, texto: iaOpciones.op1 },
                    { num: 2 as const, texto: iaOpciones.op2 },
                  ]).map(({ num, texto }) => (
                    <div key={num} className="rounded-xl p-2.5 flex flex-col gap-1.5"
                      style={{ border: '1px solid rgba(6,135,216,0.15)', background: '#fff' }}>
                      <p className="text-xs font-bold uppercase" style={{ color: '#0687D8' }}>Opción {num}</p>
                      <p className="text-xs leading-relaxed flex-1" style={{ color: '#64748B' }}>{texto}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: texto.length <= 500 ? '#15803D' : '#DC2626' }}>
                          {texto.length} chars
                        </span>
                        <button
                          onClick={() => setModalTexto(texto.slice(0, 500))}
                          className="text-xs px-2 py-0.5 rounded-md font-medium transition-colors text-white"
                          style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}
                        >
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {obsError && (
              <p className="text-xs px-3 py-1.5 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{obsError}</p>
            )}

            {/* Botones */}
            <div className="flex gap-2">
              <button
                onClick={cerrarModal}
                className="flex-1 py-2 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
              >
                Cancelar
              </button>
              <button
                onClick={guardarObs}
                disabled={pendingObs}
                className="flex-1 py-2 rounded-xl disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}
              >
                {pendingObs && <Loader2 size={13} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </Modal>
        )
      })()}
    </div>
  )
}
