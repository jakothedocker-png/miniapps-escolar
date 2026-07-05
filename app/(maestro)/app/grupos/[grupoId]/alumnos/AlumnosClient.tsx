'use client'
'use client'

import { useState, useTransition } from 'react'
import { Plus, UserX, Loader2, Users, Pencil, Upload, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { crearAlumno, darDeBajaAlumno, editarAlumno } from '@/app/actions/alumnos'
import { guardarAntecedentes } from '@/app/actions/calificaciones'

interface Alumno {
  id: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  curp: string | null
  grupo_id: string
  activo: boolean
  deleted: boolean
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
}

const FORM_VACIO = {
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  curp: '',
}

const TRIMESTRE_VACIO = { lenguajes: '', saberes: '', etica: '', humanos: '', inasistencias: '' }
const ANTECEDENTES_VACIO = [
  { ...TRIMESTRE_VACIO },
  { ...TRIMESTRE_VACIO },
  { ...TRIMESTRE_VACIO },
]

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

const inputStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  color: '#1E2D3D',
}

export default function AlumnosClient({ grupo, alumnos }: Props) {
  const router = useRouter()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState<string | null>(null)
  const [confirmBaja, setConfirmBaja] = useState<Alumno | null>(null)
  const [motivoBaja, setMotivoBaja] = useState('')
  const [alumnoEdit, setAlumnoEdit] = useState<Alumno | null>(null)
  const [formEdit, setFormEdit] = useState(FORM_VACIO)
  const [errorEdit, setErrorEdit] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [modalAntecedentes, setModalAntecedentes] = useState(false)
  const [alumnoNuevo, setAlumnoNuevo] = useState<{ id: string; nombre: string } | null>(null)
  const [antecedentes, setAntecedentes] = useState(ANTECEDENTES_VACIO)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState([true, false, false])
  const [errorAnt, setErrorAnt] = useState<string | null>(null)

  const alumnosActivos = alumnos.filter(a => a.activo && !a.deleted)
  const alumnosDadosDeBaja = alumnos.filter(a => !a.activo || a.deleted)

  function abrirModal() {
    setForm(FORM_VACIO)
    setError(null)
    setModalAbierto(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await crearAlumno({ ...form, grupo_id: grupo.id })
      if (res.error) { setError(res.error); return }
      setModalAbierto(false)
      const nombreMostrar = `${form.nombre} ${form.apellido_paterno}`.trim()
      setAlumnoNuevo({ id: res.alumno_id ?? '_pending', nombre: nombreMostrar })
      setAntecedentes([{ ...TRIMESTRE_VACIO }, { ...TRIMESTRE_VACIO }, { ...TRIMESTRE_VACIO }])
      setSeccionesAbiertas([true, false, false])
      setErrorAnt(null)
      setModalAntecedentes(true)
    })
  }

  function toggleSeccion(idx: number) {
    setSeccionesAbiertas(prev => prev.map((v, i) => i === idx ? !v : v))
  }

  function setAntField(trimIdx: number, field: string, value: string) {
    setAntecedentes(prev => prev.map((t, i) => i === trimIdx ? { ...t, [field]: value } : t))
  }

  function handleGuardarAntecedentes() {
    if (!alumnoNuevo || alumnoNuevo.id === '_pending') {
      setModalAntecedentes(false)
      return
    }
    setErrorAnt(null)
    startTransition(async () => {
      const trimestres = antecedentes.map((t, i) => ({
        trimestre: (i + 1) as 1 | 2 | 3,
        lenguajes: t.lenguajes !== '' ? parseFloat(t.lenguajes) : null,
        saberes: t.saberes !== '' ? parseFloat(t.saberes) : null,
        etica: t.etica !== '' ? parseFloat(t.etica) : null,
        humanos: t.humanos !== '' ? parseFloat(t.humanos) : null,
        inasistencias: t.inasistencias !== '' ? parseInt(t.inasistencias) : 0,
      }))
      const res = await guardarAntecedentes({
        alumno_id: alumnoNuevo.id,
        grupo_id: grupo.id,
        ciclo_escolar: grupo.ciclo_escolar,
        trimestres,
      })
      if (res.error) { setErrorAnt(res.error); return }
      setModalAntecedentes(false)
    })
  }

  function handleBaja(alumno: Alumno) { setMotivoBaja(''); setConfirmBaja(alumno) }

  function confirmarBaja() {
    if (!confirmBaja) return
    startTransition(async () => {
      await darDeBajaAlumno(confirmBaja.id, motivoBaja)
      setConfirmBaja(null)
    })
  }

  function abrirEditar(alumno: Alumno) {
    setFormEdit({
      nombre: alumno.nombre,
      apellido_paterno: alumno.apellido_paterno,
      apellido_materno: alumno.apellido_materno ?? '',
      curp: alumno.curp ?? '',
    })
    setErrorEdit(null)
    setAlumnoEdit(alumno)
  }

  function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!alumnoEdit) return
    setErrorEdit(null)
    startTransition(async () => {
      const res = await editarAlumno(alumnoEdit.id, formEdit)
      if (res.error) { setErrorEdit(res.error); return }
      setAlumnoEdit(null)
    })
  }

  function nombreCompleto(a: Alumno) {
    return [a.apellido_paterno, a.apellido_materno, a.nombre].filter(Boolean).join(' ')
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl text-sm focus:outline-none'

  const campo = (label: string, key: keyof typeof form, req = false) => (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>{label}{req ? ' *' : ''}</label>
      <input
        type="text"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={req}
        className={inputCls}
        style={inputStyle}
      />
    </div>
  )

  const inputNum = (trimIdx: number, field: string, label: string, max = 10) => (
    <div className="space-y-1">
      <label className="text-xs" style={{ color: '#64748B' }}>{label}</label>
      <input
        type="number"
        min={0}
        max={max}
        step={0.1}
        value={antecedentes[trimIdx][field as keyof typeof TRIMESTRE_VACIO]}
        onChange={e => setAntField(trimIdx, field, e.target.value)}
        placeholder="—"
        className={inputCls}
        style={inputStyle}
      />
    </div>
  )

  const TRIMESTRES_LABELS = ['1er Trimestre', '2do Trimestre', '3er Trimestre']

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: '#64748B' }}>
            {alumnosActivos.length} alumno{alumnosActivos.length !== 1 ? 's' : ''} activo{alumnosActivos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/app/grupos/${grupo.id}/alumnos/importar`)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
            style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}
          >
            <Upload size={15} />
            Importar Excel
          </button>
          <button
            onClick={abrirModal}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
          >
            <Plus size={16} />
            Agregar alumno
          </button>
        </div>
      </div>

      {/* Lista activos */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {alumnosActivos.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <p className="text-sm mb-4" style={{ color: '#64748B' }}>
              No hay alumnos en este grupo todavía
            </p>
            <button
              onClick={abrirModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
            >
              <Plus size={16} />
              Agregar alumno
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFF' }}>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>#</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Alumno</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>CURP</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Estado</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {alumnosActivos.map((alumno, idx) => (
                <tr key={alumno.id} className="transition-colors"
                  style={{ borderBottom: '1px solid #E2E8F0' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td className="px-5 py-4 text-xs" style={{ color: '#94A3B8' }}>{idx + 1}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium" style={{ color: '#1E2D3D' }}>{nombreCompleto(alumno)}</p>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs" style={{ color: '#64748B' }}>
                    {alumno.curp || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#EFF9F0', color: '#15803D' }}>
                      Activo
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEditar(alumno)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0687D8'; (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.07)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = '' }}
                        title="Editar alumno"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleBaja(alumno)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = '' }}
                        title="Dar de baja"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Alumnos dados de baja */}
      {alumnosDadosDeBaja.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#94A3B8' }}>
            Dados de baja ({alumnosDadosDeBaja.length})
          </p>
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <table className="w-full text-sm">
              <tbody>
                {alumnosDadosDeBaja.map((alumno) => (
                  <tr key={alumno.id} className="opacity-60" style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td className="px-5 py-4">
                      <p className="font-medium line-through" style={{ color: '#1E2D3D' }}>
                        {nombreCompleto(alumno)}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs" style={{ color: '#64748B' }}>
                      {alumno.curp || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#FEF2F2', color: '#DC2626' }}>
                        Baja
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal agregar alumno */}
      {modalAbierto && (
        <Modal titulo="Agregar alumno" onClose={() => setModalAbierto(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {campo('Nombre(s)', 'nombre', true)}
            <div className="grid grid-cols-2 gap-3">
              {campo('Apellido paterno', 'apellido_paterno', true)}
              {campo('Apellido materno', 'apellido_materno')}
            </div>
            {campo('CURP', 'curp')}

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalAbierto(false)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                Agregar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal antecedentes */}
      {modalAntecedentes && alumnoNuevo && (
        <Modal titulo="Capturar antecedentes" onClose={() => setModalAntecedentes(false)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: '#64748B' }}>
              Alumno inscrito: <span className="font-semibold" style={{ color: '#1E2D3D' }}>{alumnoNuevo.nombre}</span>
            </p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              Captura las calificaciones de trimestres anteriores si el alumno viene de otra escuela o grupo.
            </p>

            <div className="space-y-3">
              {TRIMESTRES_LABELS.map((label, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid #E2E8F0' }}>
                  <button
                    type="button"
                    onClick={() => toggleSeccion(idx)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
                    style={{ color: '#1E2D3D' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    {label}
                    {seccionesAbiertas[idx] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  {seccionesAbiertas[idx] && (
                    <div className="px-4 pb-4 space-y-3 pt-3" style={{ background: '#F8FAFF' }}>
                      <div className="grid grid-cols-2 gap-3">
                        {inputNum(idx, 'lenguajes', 'Lenguajes')}
                        {inputNum(idx, 'saberes', 'Saberes')}
                        {inputNum(idx, 'etica', 'Ética')}
                        {inputNum(idx, 'humanos', 'De lo Humano')}
                      </div>
                      {inputNum(idx, 'inasistencias', 'Inasistencias', 999)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {errorAnt && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{errorAnt}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setModalAntecedentes(false)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                Omitir
              </button>
              <button type="button" onClick={handleGuardarAntecedentes}
                disabled={pending || alumnoNuevo.id === '_pending'}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                Guardar antecedentes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar alumno */}
      {alumnoEdit && (
        <Modal titulo="Editar alumno" onClose={() => setAlumnoEdit(null)}>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Nombre(s) *</label>
              <input type="text" value={formEdit.nombre}
                onChange={e => setFormEdit(f => ({ ...f, nombre: e.target.value }))}
                required className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Apellido paterno *</label>
                <input type="text" value={formEdit.apellido_paterno}
                  onChange={e => setFormEdit(f => ({ ...f, apellido_paterno: e.target.value }))}
                  required className={inputCls} style={inputStyle} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Apellido materno</label>
                <input type="text" value={formEdit.apellido_materno}
                  onChange={e => setFormEdit(f => ({ ...f, apellido_materno: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>CURP</label>
              <input type="text" value={formEdit.curp}
                onChange={e => setFormEdit(f => ({ ...f, curp: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>

            {errorEdit && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{errorEdit}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAlumnoEdit(null)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal confirmar baja */}
      {confirmBaja && (
        <Modal titulo="Dar de baja" onClose={() => setConfirmBaja(null)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: '#64748B' }}>
              ¿Confirmas dar de baja a{' '}
              <span className="font-semibold" style={{ color: '#1E2D3D' }}>{nombreCompleto(confirmBaja)}</span>?
              Esta acción se puede deshacer contactando al administrador.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: '#64748B' }}>Motivo de la baja</label>
              <textarea value={motivoBaja} onChange={e => setMotivoBaja(e.target.value)}
                rows={2} placeholder="Ej. Cambio de domicilio, traslado a otra escuela…"
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition resize-none"
                style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBaja(null)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}>
                Cancelar
              </button>
              <button onClick={confirmarBaja} disabled={pending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: '#EF4444' }}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                Dar de baja
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
