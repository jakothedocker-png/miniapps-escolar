'use client'
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, ChevronDown, ChevronUp, Loader2, Sparkles, Users } from 'lucide-react'
import { guardarObservacion } from '@/app/actions/calificaciones'

interface Alumno {
  id: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
}

interface Observacion {
  id: string
  alumno_id: string
  trimestre: number
  ciclo_escolar: string
  descripcion_maestro: string
  observacion_1: string
  observacion_2: string
  observacion_seleccionada: number | null
  texto_final: string | null
  generada_con_ia: boolean
}

interface EvaluacionResumen {
  alumno_id: string
  trimestre: number
  promedio_general: number | null
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
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
  observaciones: Observacion[]
  evaluaciones: EvaluacionResumen[]
}

type Trimestre = 1 | 2 | 3

function nombreCompleto(a: Alumno) {
  return [a.apellido_paterno, a.apellido_materno, a.nombre].filter(Boolean).join(' ')
}

interface IAResult {
  observacion_1: string
  observacion_2: string
  es_prueba: boolean
  usos_restantes: number | null
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

function AlumnoObservacionPanel({
  alumno,
  grupo,
  trimestre,
  observacion,
  evaluacion,
}: {
  alumno: Alumno
  grupo: Grupo
  trimestre: Trimestre
  observacion: Observacion | undefined
  evaluacion: EvaluacionResumen | undefined
}) {
  const [expandido, setExpandido] = useState(false)
  const [descripcion, setDescripcion] = useState(observacion?.descripcion_maestro ?? '')
  const [iaResult, setIaResult] = useState<IAResult | null>(null)
  const rawSeleccionada = observacion?.observacion_seleccionada
  const initSeleccionada: 1 | 2 | null = rawSeleccionada === 1 ? 1 : rawSeleccionada === 2 ? 2 : null
  const [seleccionada, setSeleccionada] = useState<1 | 2 | null>(initSeleccionada)
  const [textoFinal, setTextoFinal] = useState(observacion?.texto_final ?? '')
  const [loadingIA, setLoadingIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  const tieneObservacion = !!(observacion?.texto_final)
  const promedio = evaluacion?.promedio_general

  async function generarIA() {
    if (!descripcion.trim()) {
      setErrorIA('Escribe una descripción del alumno antes de generar')
      return
    }
    setErrorIA(null)
    setLoadingIA(true)
    setIaResult(null)
    try {
      const res = await fetch('/api/ia/observaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id: alumno.id,
          trimestre,
          ciclo_escolar: grupo.ciclo_escolar,
          descripcion_maestro: descripcion,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorIA(data.error ?? 'Error al generar observaciones')
        return
      }
      setIaResult(data as IAResult)
    } catch {
      setErrorIA('Error de conexión')
    } finally {
      setLoadingIA(false)
    }
  }

  function usarOpcion(opcion: 1 | 2) {
    const texto = opcion === 1 ? iaResult?.observacion_1 : iaResult?.observacion_2
    setSeleccionada(opcion)
    setTextoFinal(texto ?? '')
  }

  function handleGuardar() {
    setErrorGuardar(null)
    if (!textoFinal.trim()) {
      setErrorGuardar('Escribe o selecciona una observación')
      return
    }
    startTransition(async () => {
      const res = await guardarObservacion({
        alumno_id: alumno.id,
        grupo_id: grupo.id,
        trimestre,
        ciclo_escolar: grupo.ciclo_escolar,
        descripcion_maestro: descripcion,
        observacion_1: iaResult?.observacion_1 ?? observacion?.observacion_1 ?? '',
        observacion_2: iaResult?.observacion_2 ?? observacion?.observacion_2 ?? '',
        observacion_seleccionada: seleccionada,
        texto_final: textoFinal,
        generada_con_ia: !!(iaResult),
      })
      if (res.error) { setErrorGuardar(res.error); return }
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 2000)
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      {/* Header del alumno */}
      <button
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
      >
        <div className="flex items-center gap-3">
          {tieneObservacion ? (
            <CheckCircle size={18} className="flex-shrink-0" style={{ color: '#15803D' }} />
          ) : (
            <Clock size={18} className="flex-shrink-0" style={{ color: '#B45309' }} />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>
              {nombreCompleto(alumno)}
            </p>
            {promedio !== null && promedio !== undefined && (
              <p className="text-xs" style={{ color: '#64748B' }}>
                Promedio: {promedio.toFixed(1)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={tieneObservacion
            ? { background: '#EFF9F0', color: '#15803D' }
            : { background: '#FFFBEB', color: '#B45309' }
          }>
            {tieneObservacion ? 'Lista' : 'Pendiente'}
          </span>
          {expandido
            ? <ChevronUp size={16} style={{ color: '#94A3B8' }} />
            : <ChevronDown size={16} style={{ color: '#94A3B8' }} />
          }
        </div>
      </button>

      {/* Panel expandido */}
      {expandido && (
        <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: '1px solid rgba(6,135,216,0.08)' }}>
          {/* Observación existente */}
          {tieneObservacion && !iaResult && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(6,135,216,0.04)', border: '1px solid rgba(6,135,216,0.10)' }}>
              <p className="text-xs mb-1" style={{ color: '#64748B' }}>Observación guardada</p>
              <p className="text-sm" style={{ color: '#1E2D3D' }}>{observacion!.texto_final}</p>
            </div>
          )}

          {/* Descripción del alumno */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#64748B' }}>
              Describe brevemente a este alumno en este trimestre
              <span className="ml-1" style={{ color: '#94A3B8' }}>({descripcion.length}/300)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Ej: Es muy participativo, tiene dificultades en matemáticas pero excelente en español..."
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition resize-none"
              style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }}
              onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
              onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* Botón generar IA */}
          <button
            onClick={generarIA}
            disabled={loadingIA}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
            style={{ background: 'rgba(6,135,216,0.08)', color: '#0687D8' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.14)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.08)'}
          >
            {loadingIA
              ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
              : <><Sparkles size={15} /> Generar con IA</>
            }
          </button>

          {errorIA && (
            <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{errorIA}</p>
          )}

          {/* Skeleton mientras carga IA */}
          {loadingIA && (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map(i => (
                <div key={i} className="rounded-xl p-4 space-y-2 animate-pulse"
                  style={{ border: '1px solid #E2E8F0' }}>
                  <div className="h-3 rounded w-1/3" style={{ background: '#E2E8F0' }} />
                  <div className="h-3 rounded" style={{ background: '#E2E8F0' }} />
                  <div className="h-3 rounded w-4/5" style={{ background: '#E2E8F0' }} />
                  <div className="h-3 rounded w-3/5" style={{ background: '#E2E8F0' }} />
                </div>
              ))}
            </div>
          )}

          {/* Resultados IA */}
          {iaResult && !loadingIA && (
            <div className="space-y-3">
              {iaResult.es_prueba && iaResult.usos_restantes !== null && (
                <p className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ color: '#B45309', background: '#FFFBEB' }}>
                  Plan de prueba — {iaResult.usos_restantes} uso{iaResult.usos_restantes !== 1 ? 's' : ''} restante{iaResult.usos_restantes !== 1 ? 's' : ''}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {([1, 2] as const).map(num => {
                  const texto = num === 1 ? iaResult.observacion_1 : iaResult.observacion_2
                  const estaSeleccionada = seleccionada === num
                  return (
                    <div
                      key={num}
                      className="rounded-xl p-4 space-y-3 transition-colors"
                      style={estaSeleccionada
                        ? { border: '2px solid #0687D8', background: 'rgba(6,135,216,0.04)' }
                        : { border: '2px solid #E2E8F0', background: '#fff' }
                      }
                    >
                      <p className="text-xs font-semibold" style={{ color: '#64748B' }}>
                        Opción {num} <span style={{ color: '#94A3B8' }}>({texto.length} chars)</span>
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#1E2D3D' }}>{texto}</p>
                      <button
                        onClick={() => usarOpcion(num)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={estaSeleccionada
                          ? { background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', color: '#fff' }
                          : { border: '1px solid #E2E8F0', color: '#64748B', background: '#fff' }
                        }
                        onMouseEnter={e => { if (!estaSeleccionada) (e.currentTarget as HTMLElement).style.background = '#F8FAFF' }}
                        onMouseLeave={e => { if (!estaSeleccionada) (e.currentTarget as HTMLElement).style.background = '#fff' }}
                      >
                        {estaSeleccionada ? '✓ Usando esta' : 'Usar esta'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Texto final editable */}
          {(seleccionada !== null || textoFinal) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: '#64748B' }}>
                Observación final (editable)
                <span className="ml-1" style={{ color: '#94A3B8' }}>({textoFinal.length} chars)</span>
              </label>
              <textarea
                value={textoFinal}
                onChange={e => setTextoFinal(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition resize-none"
                style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
              />
            </div>
          )}

          {/* Botón guardar */}
          <div className="flex items-center justify-between">
            {errorGuardar && (
              <p className="text-sm" style={{ color: '#DC2626' }}>{errorGuardar}</p>
            )}
            <button
              onClick={handleGuardar}
              disabled={pending || !textoFinal.trim()}
              className="ml-auto flex items-center gap-2 px-4 py-2 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.25)' }}
            >
              {pending ? (
                <><Loader2 size={14} className="animate-spin" /> Guardando...</>
              ) : guardadoOk ? (
                <><CheckCircle size={14} /> Guardado</>
              ) : (
                'Guardar observación'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ObservacionesClient({ grupo, alumnos, observaciones, evaluaciones }: Props) {
  const [trimestre, setTrimestre] = useState<Trimestre>(1)

  const TRIMESTRES: { valor: Trimestre; label: string }[] = [
    { valor: 1, label: '1er Trimestre' },
    { valor: 2, label: '2do Trimestre' },
    { valor: 3, label: '3er Trimestre' },
  ]

  const obsDelTrimestre = observaciones.filter(o => o.trimestre === trimestre)
  const evalDelTrimestre = evaluaciones.filter(e => e.trimestre === trimestre)
  const conObservacion = obsDelTrimestre.filter(o => o.texto_final).length

  if (alumnos.length === 0) {
    return (
      <div className="p-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
        <div className="rounded-2xl p-12 text-center" style={{
          background: '#FFFFFF',
          border: '1px solid rgba(6,135,216,0.12)',
          boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
        }}>
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

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Selector de trimestre */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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

        {/* Progreso */}
        <div className="flex items-center gap-2 text-sm" style={{ color: '#64748B' }}>
          <span className="font-semibold" style={{ color: '#1E2D3D' }}>{conObservacion}</span>
          <span>/ {alumnos.length} alumnos con observación</span>
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: alumnos.length > 0 ? `${(conObservacion / alumnos.length) * 100}%` : '0%',
                background: '#0687D8',
              }}
            />
          </div>
        </div>
      </div>

      {/* Lista de alumnos */}
      <div className="space-y-3">
        {alumnos.map((alumno) => {
          const obs = obsDelTrimestre.find(o => o.alumno_id === alumno.id)
          const eval_ = evalDelTrimestre.find(e => e.alumno_id === alumno.id)
          return (
            <AlumnoObservacionPanel
              key={`${alumno.id}-${trimestre}`}
              alumno={alumno}
              grupo={grupo}
              trimestre={trimestre}
              observacion={obs}
              evaluacion={eval_}
            />
          )
        })}
      </div>
    </div>
  )
}
