'use client'

import { useState, useTransition } from 'react'
import { Save, Check, Loader2, FileText, School, User } from 'lucide-react'
import { guardarConfigReporte } from '@/app/actions/configuracion'

interface Escuela {
  id: string
  nombre: string
  cct: string
  municipio: string | null
  comunidad: string | null
  estado: string | null
  ciclo_activo: string | null
  turno: string | null
  fecha_diagnostico: string | null
  fecha_trimestre_1: string | null
  fecha_trimestre_2: string | null
  fecha_trimestre_3: string | null
  director_diagnostico: string | null
  director_trimestre_1: string | null
  director_trimestre_2: string | null
  director_trimestre_3: string | null
}

interface Props {
  escuela: Escuela | null
  maestro: { nombre: string; email: string }
}

const MESES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function formatearFecha(fechaISO: string): string {
  const [year, month, day] = fechaISO.split('-').map(Number)
  const mes = MESES[month - 1]
  return `${day} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${year}`
}

type PeriodoKey =
  | 'fecha_diagnostico'
  | 'fecha_trimestre_1'
  | 'fecha_trimestre_2'
  | 'fecha_trimestre_3'

type DirectorKey =
  | 'director_diagnostico'
  | 'director_trimestre_1'
  | 'director_trimestre_2'
  | 'director_trimestre_3'

const PERIODOS: { label: string; fechaKey: PeriodoKey; directorKey: DirectorKey }[] = [
  { label: 'Diagnóstico',    fechaKey: 'fecha_diagnostico', directorKey: 'director_diagnostico' },
  { label: '1er Trimestre',  fechaKey: 'fecha_trimestre_1', directorKey: 'director_trimestre_1' },
  { label: '2do Trimestre',  fechaKey: 'fecha_trimestre_2', directorKey: 'director_trimestre_2' },
  { label: '3er Trimestre',  fechaKey: 'fecha_trimestre_3', directorKey: 'director_trimestre_3' },
]

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

const inputStyle = {
  border: '1px solid #E2E8F0',
  background: '#fff',
  color: '#1E2D3D',
}

export default function ConfiguracionClient({ escuela, maestro }: Props) {
  const [comunidad,    setComunidad]    = useState(escuela?.comunidad    ?? '')
  const [municipio,    setMunicipio]    = useState(escuela?.municipio    ?? '')
  const [estado,       setEstado]       = useState(escuela?.estado       ?? 'Estado de México')
  const [cicloActivo,  setCicloActivo]  = useState(escuela?.ciclo_activo ?? '2025-2026')

  const [fechas, setFechas] = useState<Record<PeriodoKey, string>>({
    fecha_diagnostico: escuela?.fecha_diagnostico ?? '',
    fecha_trimestre_1: escuela?.fecha_trimestre_1 ?? '',
    fecha_trimestre_2: escuela?.fecha_trimestre_2 ?? '',
    fecha_trimestre_3: escuela?.fecha_trimestre_3 ?? '',
  })

  const [directores, setDirectores] = useState<Record<DirectorKey, string>>({
    director_diagnostico: escuela?.director_diagnostico ?? '',
    director_trimestre_1: escuela?.director_trimestre_1 ?? '',
    director_trimestre_2: escuela?.director_trimestre_2 ?? '',
    director_trimestre_3: escuela?.director_trimestre_3 ?? '',
  })

  const [pending, startTransition] = useTransition()
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleGuardar() {
    setError(null)
    startTransition(async () => {
      const res = await guardarConfigReporte({
        comunidad,
        municipio,
        estado,
        ciclo_activo: cicloActivo,
        ...fechas,
        ...directores,
      })
      if (res.error) { setError(res.error); return }
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    })
  }

  if (!escuela) {
    return (
      <div className="p-8" style={{ minHeight: '100vh' }}>
        <div className="rounded-2xl p-6 text-center" style={{ background: '#FFFBEB', border: '1px solid rgba(180,83,9,0.20)' }}>
          <School size={32} className="mx-auto mb-3" style={{ color: '#B45309' }} />
          <p className="font-medium" style={{ color: '#92400E' }}>No se encontró tu escuela.</p>
          <p className="text-sm mt-1" style={{ color: '#B45309' }}>Asegúrate de tener al menos un grupo registrado con una escuela asignada.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}><div className="p-8 max-w-3xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Configuración</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          {escuela.nombre} · {escuela.cct}
        </p>
      </div>

      {/* Mis datos (read-only) */}
      <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2">
          <User size={18} style={{ color: '#0687D8' }} />
          <h2 className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Mis datos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dato label="Nombre" value={maestro.nombre} />
          <Dato label="Correo electrónico" value={maestro.email} />
          <Dato label="Escuela" value={escuela.nombre} />
          <Dato label="C.C.T." value={escuela.cct} />
          <Dato label="Turno" value={escuela.turno ?? '—'} />
          <Dato label="Ciclo escolar activo" value={cicloActivo} editable
            onChange={e => setCicloActivo(e.target.value)} placeholder="Ej. 2025-2026" />
        </div>
      </div>

      {/* Lugar del reporte */}
      <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
        <div className="flex items-center gap-2">
          <FileText size={18} style={{ color: '#0687D8' }} />
          <h2 className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Lugar del cuadro de calificaciones</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#64748B' }}>Comunidad / Localidad</label>
            <input
              type="text"
              value={comunidad}
              onChange={e => setComunidad(e.target.value)}
              placeholder="Ej. San Agustín"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition"
              style={inputStyle}
              onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
              onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#64748B' }}>Municipio</label>
              <input
                type="text"
                value={municipio}
                onChange={e => setMunicipio(e.target.value)}
                placeholder="Ej. Texcaltitlán"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition"
                style={inputStyle}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: '#64748B' }}>Estado</label>
              <input
                type="text"
                value={estado}
                onChange={e => setEstado(e.target.value)}
                placeholder="Ej. México"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition"
                style={inputStyle}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Periodos: fecha + director */}
      <div className="rounded-2xl p-6 space-y-5" style={cardStyle}>
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Periodos</h2>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            La fecha y el director de cada periodo aparecerán en el cuadro imprimible correspondiente.
          </p>
        </div>

        <div className="space-y-6">
          {PERIODOS.map(({ label, fechaKey, directorKey }) => {
            const fecha     = fechas[fechaKey]
            const director  = directores[directorKey]
            const fechaText = fecha ? formatearFecha(fecha) : 'sin configurar'
            const lugar     = [comunidad || 'Comunidad', municipio || 'Municipio', estado || 'Estado'].join(', ')

            return (
              <div key={fechaKey} className="rounded-xl p-4 space-y-3"
                style={{ border: '1px solid rgba(6,135,216,0.10)', background: '#F8FAFF' }}>
                <p className="text-sm font-semibold" style={{ color: '#0687D8' }}>{label}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#64748B' }}>Fecha del cuadro</label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={e => setFechas(prev => ({ ...prev, [fechaKey]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
                      style={{ ...inputStyle, background: '#fff' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" style={{ color: '#64748B' }}>Nombre del director(a)</label>
                    <input
                      type="text"
                      value={director}
                      onChange={e => setDirectores(prev => ({ ...prev, [directorKey]: e.target.value }))}
                      placeholder="Nombre completo del director(a)"
                      className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
                      style={{ ...inputStyle, background: '#fff' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                    />
                  </div>
                </div>

                <p className="text-xs italic" style={{ color: '#94A3B8' }}>
                  Vista previa: {lugar} a {fechaText}.
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm px-4 py-2.5 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{error}</p>
      )}

      <div className="flex justify-end">
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
            <><Save size={16} /> Guardar configuración</>
          )}
        </button>
      </div>
    </div>
  )
}

function Dato({
  label, value, editable, onChange, placeholder,
}: {
  label: string
  value: string
  editable?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium" style={{ color: '#64748B' }}>{label}</p>
      {editable ? (
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
          style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }}
          onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
          onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
        />
      ) : (
        <p className="text-sm font-medium px-3 py-2 rounded-xl"
          style={{ background: '#F8FAFF', border: '1px solid rgba(6,135,216,0.08)', color: '#1E2D3D' }}>
          {value}
        </p>
      )}
    </div></div>
  )
}
