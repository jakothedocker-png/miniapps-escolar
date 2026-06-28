'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Power, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { crearZona, actualizarZona, toggleEstatusZona } from './actions'
import type { Zona } from '@/types'

const FORM_VACIO = {
  nombre: '', estado: '', ia_habilitada: false,
  contacto_nombre: '', contacto_email: '',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

const inputStyle = { border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }

export default function ZonasClient({ zonas }: { zonas: Zona[] }) {
  const [modal, setModal]       = useState<'crear' | 'editar' | null>(null)
  const [zonaEdit, setZonaEdit] = useState<Zona | null>(null)
  const [form, setForm]         = useState(FORM_VACIO)
  const [error, setError]       = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function abrirCrear() {
    setForm(FORM_VACIO)
    setZonaEdit(null)
    setError(null)
    setModal('crear')
  }

  function abrirEditar(zona: Zona) {
    const c = zona.contacto_admin
    setForm({
      nombre:          zona.nombre,
      estado:          zona.estado,
      ia_habilitada:   zona.ia_habilitada,
      contacto_nombre: c?.nombre ?? '',
      contacto_email:  c?.email  ?? '',
    })
    setZonaEdit(zona)
    setError(null)
    setModal('editar')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = modal === 'crear'
        ? await crearZona(form)
        : await actualizarZona(zonaEdit!.id, form)
      if (res.error) { setError(res.error); return }
      setModal(null)
    })
  }

  function handleToggle(zona: Zona) {
    startTransition(async () => { await toggleEstatusZona(zona.id, zona.estatus) })
  }

  const campo = (label: string, key: 'nombre' | 'estado' | 'contacto_nombre' | 'contacto_email', type = 'text', req = false) => (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: '#64748B' }}>{label}{req && ' *'}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={req}
        className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition"
        style={inputStyle}
        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
      />
    </div>
  )

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Zonas</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {zonas.length} zona{zonas.length !== 1 ? 's' : ''} registrada{zonas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors"
          style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}>
          <Plus size={16} /> Nueva zona
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {zonas.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: '#94A3B8' }}>No hay zonas registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                {['Nombre / ID', 'Estado', 'IA', 'Contacto', 'Estatus', ''].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ background: '#F8FAFF', color: '#64748B' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zonas.map((z, idx) => (
                <tr key={z.id}
                  style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <td className="px-5 py-4">
                    <p className="font-medium" style={{ color: '#1E2D3D' }}>{z.nombre}</p>
                    <p className="text-xs font-mono" style={{ color: '#94A3B8' }}>{z.id}</p>
                  </td>
                  <td className="px-5 py-4" style={{ color: '#64748B' }}>{z.estado}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium" style={{ color: z.ia_habilitada ? '#15803D' : '#94A3B8' }}>
                      {z.ia_habilitada ? '✓ Activa' : '✗ No'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs" style={{ color: '#64748B' }}>
                    {z.contacto_admin?.nombre
                      ? <><p>{z.contacto_admin.nombre}</p><p className="font-mono" style={{ color: '#94A3B8' }}>{z.contacto_admin.email}</p></>
                      : <span style={{ color: '#CBD5E1' }}>—</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium" style={{ color: z.estatus === 'activo' ? '#15803D' : '#DC2626' }}>
                      {z.estatus === 'activo' ? 'Activa' : 'Suspendida'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => abrirEditar(z)} title="Editar"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0687D8'; (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.08)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = '' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleToggle(z)}
                        title={z.estatus === 'activo' ? 'Suspender' : 'Activar'}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color = z.estatus === 'activo' ? '#DC2626' : '#15803D'
                          ;(e.currentTarget as HTMLElement).style.background = z.estatus === 'activo' ? '#FEF2F2' : '#EFF9F0'
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

      {modal && (
        <Modal titulo={modal === 'crear' ? 'Nueva zona' : 'Editar zona'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {campo('Nombre', 'nombre', 'text', true)}
              {campo('Estado', 'estado', 'text', true)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {campo('Contacto — Nombre', 'contacto_nombre')}
              {campo('Contacto — Email', 'contacto_email', 'email')}
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
              <div onClick={() => setForm(f => ({ ...f, ia_habilitada: !f.ia_habilitada }))}
                className="w-10 h-5 rounded-full relative transition-colors"
                style={{ background: form.ia_habilitada ? '#0687D8' : '#E2E8F0' }}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ia_habilitada ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm" style={{ color: '#1E2D3D' }}>IA habilitada</span>
            </label>
            {error && <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
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
                {modal === 'crear' ? 'Crear zona' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
