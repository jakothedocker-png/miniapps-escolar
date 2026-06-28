'use client'
'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, Power, Loader2, Search, X, CreditCard, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { crearUsuario, toggleEstatusUsuario, activarPlan } from './actions'
import type { Usuario, Zona } from '@/types'

// ─── Badges ──────────────────────────────────────────────────────────────────

const ROL_BADGE_STYLE: Record<string, { background: string; color: string }> = {
  superadmin: { background: 'rgba(109,40,217,0.12)', color: '#7C3AED' },
  supervisor:  { background: 'rgba(6,135,216,0.12)',  color: '#0687D8' },
  director:    { background: 'rgba(6,135,216,0.08)',  color: '#0569B0' },
  maestro:     { background: '#EFF9F0',               color: '#15803D' },
}

const PLAN_BADGE_STYLE: Record<string, { background: string; color: string }> = {
  legacy:    { background: 'rgba(109,40,217,0.10)', color: '#7C3AED' },
  trial:     { background: '#FFFBEB',               color: '#B45309' },
  trimestre: { background: 'rgba(6,135,216,0.10)',  color: '#0687D8' },
  anual:     { background: '#EFF9F0',               color: '#15803D' },
}

// ─── Periodos disponibles ────────────────────────────────────────────────────

const PERIODOS_DISPONIBLES = [
  { key: 'diagnostico',  label: 'Diagnóstico' },
  { key: 'trimestre_1',  label: '1er Trimestre' },
  { key: 'trimestre_2',  label: '2do Trimestre' },
  { key: 'trimestre_3',  label: '3er Trimestre' },
]

const TODOS = PERIODOS_DISPONIBLES.map(p => p.key)

// ─── Tiers de alumnos ────────────────────────────────────────────────────────

const TIERS = [
  { maxAlumnos: 30,   label: '1–30',  precioTrim: '$95',  precioAnual: '$250' },
  { maxAlumnos: 45,   label: '31–45', precioTrim: '$120', precioAnual: '$320' },
  { maxAlumnos: null, label: '45+',   precioTrim: '$150', precioAnual: '$400' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelPlan(u: Usuario): string {
  if (u.licencia_plan === 'legacy') return 'Legacy'
  if (u.licencia_plan === 'trial')  return 'Trial'
  const dur = u.licencia_plan === 'anual' ? 'Anual' : 'Trim.'
  const rng = u.licencia_max_alumnos === null ? 'Premium'
    : u.licencia_max_alumnos <= 30 ? 'Básico' : 'Plus'
  return `${dur} · ${rng}`
}

function labelPeriodos(periodos: string[]): string {
  if (!periodos?.length) return 'Sin periodos'
  if (TODOS.every(p => periodos.includes(p))) return 'Ciclo completo'
  return periodos.map(p => PERIODOS_DISPONIBLES.find(x => x.key === p)?.label ?? p).join(', ')
}

function precioEstimado(periodos: string[], tier: typeof TIERS[0] | null): string {
  if (!tier || !periodos.length) return '—'
  const esCicloCompleto = TODOS.every(p => periodos.includes(p))
  return esCicloCompleto ? tier.precioAnual : `${tier.precioTrim} × ${periodos.length}`
}

const CICLO_ACTUAL = '2025-2026'
const FORM_VACIO = { nombre: '', email: '', password: '', zona_id: '', rol: 'maestro' }

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

const inputStyle = { border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }

// ─── Componente ──────────────────────────────────────────────────────────────

export default function UsuariosClient({ usuarios, zonas }: { usuarios: Usuario[], zonas: Zona[] }) {
  const [modal,     setModal]     = useState(false)
  const [modalPlan, setModalPlan] = useState<Usuario | null>(null)
  const [form,      setForm]      = useState(FORM_VACIO)
  const [error,     setError]     = useState<string | null>(null)
  const [pending,   start]        = useTransition()

  // Estado del modal de plan
  const [periodos,    setPeriodos]    = useState<string[]>([])
  const [tierIdx,     setTierIdx]     = useState<number | null>(null)
  const [ciclo,       setCiclo]       = useState(CICLO_ACTUAL)
  const [vence,       setVence]       = useState('')
  const [planError,   setPlanError]   = useState<string | null>(null)

  // Filtros tabla
  const [busqueda,     setBusqueda]     = useState('')
  const [filtroRol,    setFiltroRol]    = useState('')
  const [filtroZona,   setFiltroZona]   = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // ── Handlers ──────────────────────────────────────────────────────────────

  function abrirModalPlan(u: Usuario) {
    setModalPlan(u)
    setPeriodos(u.licencia_periodos ?? [])
    const tierActual = TIERS.findIndex(t => t.maxAlumnos === u.licencia_max_alumnos)
    setTierIdx(tierActual >= 0 ? tierActual : null)
    setCiclo(u.licencia_ciclo ?? CICLO_ACTUAL)
    setVence(u.licencia_vence ? u.licencia_vence.split('T')[0] : '')
    setPlanError(null)
  }

  function togglePeriodo(key: string) {
    setPeriodos(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  function seleccionarTodo() {
    setPeriodos(prev => TODOS.every(p => prev.includes(p)) ? [] : [...TODOS])
  }

  function handleActivarPlan() {
    if (!modalPlan) return
    if (periodos.length === 0) { setPlanError('Selecciona al menos un periodo.'); return }
    if (tierIdx === null) { setPlanError('Selecciona el límite de alumnos.'); return }
    setPlanError(null)
    start(async () => {
      const res = await activarPlan({
        usuarioId:  modalPlan.id,
        periodos,
        maxAlumnos: TIERS[tierIdx].maxAlumnos,
        ciclo,
        vence:      vence || null,
      })
      if (res?.error) { setPlanError(res.error); return }
      setModalPlan(null)
    })
  }

  function abrirModal() { setForm(FORM_VACIO); setError(null); setModal(true) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    start(async () => {
      const res = await crearUsuario(form)
      if (res.error) { setError(res.error); return }
      setModal(false)
    })
  }

  function handleToggle(u: Usuario) {
    start(async () => { await toggleEstatusUsuario(u.id, u.estatus) })
  }

  function limpiarFiltros() {
    setBusqueda(''); setFiltroRol(''); setFiltroZona(''); setFiltroStatus('')
  }

  // ── Datos filtrados ────────────────────────────────────────────────────────

  const base = useMemo(() => usuarios.filter(u => u.rol !== 'superadmin'), [usuarios])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return base.filter(u => {
      if (q && !u.nombre.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      if (filtroRol    && u.rol     !== filtroRol)    return false
      if (filtroStatus && u.estatus !== filtroStatus)  return false
      if (filtroZona   && u.zona_id !== filtroZona)   return false
      return true
    })
  }, [base, busqueda, filtroRol, filtroStatus, filtroZona])

  const hayFiltros = busqueda || filtroRol || filtroZona || filtroStatus
  const tierSeleccionado = tierIdx !== null ? TIERS[tierIdx] : null
  const todosSeleccionados = TODOS.every(p => periodos.includes(p))

  const campo = (label: string, key: keyof typeof form, type = 'text', req = false) => (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: '#64748B' }}>{label}{req && ' *'}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={req}
        className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
        style={inputStyle}
        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
      />
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Usuarios</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {hayFiltros
              ? <>{filtrados.length} de {base.length} usuario{base.length !== 1 ? 's' : ''}</>
              : <>{base.length} usuario{base.length !== 1 ? 's' : ''} registrado{base.length !== 1 ? 's' : ''}</>
            }
          </p>
        </div>
        <button onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors"
          style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {/* Buscador + filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
          <input type="text" placeholder="Buscar por nombre o email…" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition"
            style={inputStyle}
            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
          />
        </div>
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none transition"
          style={inputStyle}>
          <option value="">Todos los roles</option>
          {['maestro','director','supervisor'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none transition max-w-[200px]"
          style={inputStyle}>
          <option value="">Todas las zonas</option>
          {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none transition"
          style={inputStyle}>
          <option value="">Cualquier estatus</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="suspendido">Suspendido</option>
        </select>
        {hayFiltros && (
          <button onClick={limpiarFiltros}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-colors"
            style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: '#94A3B8' }}>
            {hayFiltros ? 'Ningún usuario coincide con los filtros.' : 'No hay usuarios registrados aún.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                {['Nombre', 'Email', 'Zona', 'Rol', 'Plan', 'Periodos', ''].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ background: '#F8FAFF', color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u, idx) => (
                <tr key={u.id}
                  style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td className="px-4 py-4 font-medium" style={{ color: '#1E2D3D' }}>{u.nombre}</td>
                  <td className="px-4 py-4 text-xs font-mono" style={{ color: '#64748B' }}>{u.email}</td>
                  <td className="px-4 py-4 text-xs" style={{ color: '#64748B' }}>
                    {zonas.find(z => z.id === u.zona_id)?.nombre ?? <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={ROL_BADGE_STYLE[u.rol] ?? { background: '#F1F5F9', color: '#64748B' }}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={PLAN_BADGE_STYLE[u.licencia_plan] ?? { background: '#F1F5F9', color: '#64748B' }}>
                      {labelPlan(u)}
                    </span>
                    {u.licencia_max_alumnos !== null && (
                      <span className="ml-1.5 text-xs" style={{ color: '#94A3B8' }}>máx {u.licencia_max_alumnos}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs max-w-[160px]" style={{ color: '#64748B' }}>
                    {u.licencia_periodos?.length
                      ? <span title={u.licencia_periodos.join(', ')}>{labelPeriodos(u.licencia_periodos)}</span>
                      : <span style={{ color: '#CBD5E1' }}>—</span>
                    }
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirModalPlan(u)} title="Gestionar plan"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0687D8'; (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.08)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = '' }}>
                        <CreditCard size={14} />
                      </button>
                      <button onClick={() => handleToggle(u)}
                        title={u.estatus === 'activo' ? 'Desactivar' : 'Activar'}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color = u.estatus === 'activo' ? '#DC2626' : '#15803D'
                          ;(e.currentTarget as HTMLElement).style.background = u.estatus === 'activo' ? '#FEF2F2' : '#EFF9F0'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color = '#94A3B8'
                          ;(e.currentTarget as HTMLElement).style.background = ''
                        }}>
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Gestionar Plan ──────────────────────────────────────────── */}
      {modalPlan && (
        <Modal titulo={`Plan — ${modalPlan.nombre}`} onClose={() => setModalPlan(null)}>
          <div className="space-y-3">

            {/* Plan actual + ciclo en la misma fila */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl px-3 py-2"
                style={{ background: 'rgba(6,135,216,0.06)', border: '1px solid rgba(6,135,216,0.12)' }}>
                <p className="text-xs" style={{ color: '#64748B' }}>Plan actual</p>
                <p className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>{labelPlan(modalPlan)}</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{labelPeriodos(modalPlan.licencia_periodos ?? [])}</p>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium" style={{ color: '#64748B' }}>Ciclo escolar</label>
                <input type="text" value={ciclo} onChange={e => setCiclo(e.target.value)}
                  placeholder="2025-2026"
                  className="w-full px-3 py-1.5 rounded-xl text-sm focus:outline-none transition"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                  onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                />
              </div>
            </div>

            {/* Periodos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Periodos</label>
                <button onClick={seleccionarTodo}
                  className="text-xs px-2 py-0.5 rounded-lg transition-colors"
                  style={todosSeleccionados
                    ? { background: '#EFF9F0', color: '#15803D', border: '1px solid rgba(21,128,61,0.30)' }
                    : { background: '#F8FAFF', color: '#64748B', border: '1px solid #E2E8F0' }
                  }>
                  {todosSeleccionados ? <><Check size={10} className="inline mr-1" />Ciclo completo</> : 'Ciclo completo'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PERIODOS_DISPONIBLES.map(p => {
                  const activo = periodos.includes(p.key)
                  return (
                    <button key={p.key} onClick={() => togglePeriodo(p.key)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={activo
                        ? { border: '1px solid #0687D8', background: 'rgba(6,135,216,0.08)', color: '#1E2D3D' }
                        : { border: '1px solid #E2E8F0', background: '#F8FAFF', color: '#64748B' }
                      }>
                      <span className="w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center"
                        style={activo
                          ? { background: '#0687D8', borderColor: '#0687D8' }
                          : { borderColor: '#E2E8F0' }
                        }>
                        {activo && <Check size={9} className="text-white" />}
                      </span>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Límite de alumnos */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Límite de alumnos</label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIERS.map((tier, idx) => (
                  <button key={idx} onClick={() => setTierIdx(idx)}
                    className="flex flex-col items-center gap-0 px-2 py-2 rounded-xl text-center transition-all"
                    style={tierIdx === idx
                      ? { border: '1px solid #0687D8', background: 'rgba(6,135,216,0.08)' }
                      : { border: '1px solid #E2E8F0', background: '#F8FAFF' }
                    }>
                    <span className="text-xs font-semibold" style={{ color: '#1E2D3D' }}>{tier.label} alumnos</span>
                    <span className="text-xs font-bold" style={{ color: '#0687D8' }}>
                      {todosSeleccionados ? tier.precioAnual : tier.precioTrim}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Precio estimado + fecha en la misma fila */}
            <div className="flex items-end gap-3">
              {periodos.length > 0 && tierSeleccionado && (
                <div className="flex-1 rounded-xl px-3 py-2 flex items-center justify-between"
                  style={{ background: '#F8FAFF', border: '1px solid rgba(6,135,216,0.10)' }}>
                  <span className="text-xs" style={{ color: '#64748B' }}>Estimado</span>
                  <span className="text-sm font-bold" style={{ color: '#1E2D3D' }}>{precioEstimado(periodos, tierSeleccionado)} MXN</span>
                </div>
              )}
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium" style={{ color: '#64748B' }}>Corte absoluto <span style={{ color: '#94A3B8' }}>(opcional)</span></label>
                <input type="date" value={vence} onChange={e => setVence(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl text-sm focus:outline-none transition"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                  onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
                />
              </div>
            </div>

            {planError && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{planError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalPlan(null)}
                className="flex-1 py-2 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                Cancelar
              </button>
              <button onClick={handleActivarPlan} disabled={pending}
                className="flex-1 py-2 rounded-xl disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}>
                {pending ? <><Loader2 size={14} className="animate-spin" /> Activando…</> : 'Activar plan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Nuevo usuario ──────────────────────────────────────────── */}
      {modal && (
        <Modal titulo="Nuevo usuario" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {campo('Nombre completo', 'nombre', 'text', true)}
            <div className="grid grid-cols-2 gap-3">
              {campo('Email', 'email', 'email', true)}
              {campo('Contraseña temporal', 'password', 'password', true)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: '#64748B' }}>Zona</label>
                <select value={form.zona_id} onChange={e => setForm(f => ({ ...f, zona_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                  onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}>
                  <option value="">Sin zona</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: '#64748B' }}>Rol *</label>
                <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
                  onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}>
                  {['maestro','director','supervisor'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex-1 py-2.5 rounded-xl disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                Crear usuario
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
