'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Users, Loader2, BookOpen, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { crearGrupo } from '@/app/actions/grupos'

interface GrupoConAlumnos {
  id: string
  grado: string
  grupo: string
  tipo: string
  ciclo_escolar: string
  maestro_id: string
  escuela_id: string
  zona_id: string
  totalAlumnos: number
}

const FORM_VACIO = {
  grado: '1°',
  grupo: 'A',
  tipo: 'regular' as 'regular' | 'multigrado',
  ciclo_escolar: '2025-2026',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

const inputClass = 'w-full px-3 py-2 rounded-xl text-sm focus:outline-none transition'
const inputStyle = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  color: '#1E2D3D',
}
const inputFocusStyle = 'focus:ring-2 focus:ring-blue-200'

export default function GruposClient({ grupos }: { grupos: GrupoConAlumnos[] }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function abrirModal() {
    setForm(FORM_VACIO)
    setError(null)
    setModalAbierto(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await crearGrupo(form)
      if (res.error) { setError(res.error); return }
      setModalAbierto(false)
    })
  }

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Mis grupos</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} registrado{grupos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
        >
          <Plus size={16} />
          Nuevo grupo
        </button>
      </div>

      {/* Lista */}
      {grupos.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={cardStyle}>
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>
            No tienes grupos registrados todavía
          </p>
          <button
            onClick={abrirModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
          >
            <Plus size={16} />
            Crear mi primer grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map((grupo) => (
            <Link
              key={grupo.id}
              href={`/app/grupos/${grupo.id}/alumnos`}
              className="block rounded-2xl p-5 transition-colors group"
              style={cardStyle}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold" style={{ color: '#1E2D3D' }}>
                    {grupo.grado} {grupo.grupo}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(6,135,216,0.10)', color: '#0687D8' }}>
                      {grupo.ciclo_escolar}
                    </span>
                    {grupo.tipo === 'multigrado' && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#FFFBEB', color: '#B45309' }}>
                        Multigrado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-sm" style={{ color: '#64748B' }}>
                    <Users size={14} />
                    <span>{grupo.totalAlumnos} alumnos</span>
                  </div>
                </div>
                <ChevronRight size={18} className="ml-2 mt-1 transition-colors" style={{ color: '#CBD5E1' }} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal crear grupo */}
      {modalAbierto && (
        <Modal titulo="Nuevo grupo" onClose={() => setModalAbierto(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Grado *</label>
                <select
                  value={form.grado}
                  onChange={e => setForm(f => ({ ...f, grado: e.target.value }))}
                  className={`${inputClass} ${inputFocusStyle}`}
                  style={inputStyle}
                >
                  {['1°', '2°', '3°', '4°', '5°', '6°'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Grupo *</label>
                <select
                  value={form.grupo}
                  onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))}
                  className={`${inputClass} ${inputFocusStyle}`}
                  style={inputStyle}
                >
                  {['A', 'B', 'C', 'Único'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'regular' | 'multigrado' }))}
                  className={`${inputClass} ${inputFocusStyle}`}
                  style={inputStyle}
                >
                  <option value="regular">Regular</option>
                  <option value="multigrado">Multigrado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>Ciclo escolar *</label>
                <input
                  type="text"
                  value={form.ciclo_escolar}
                  onChange={e => setForm(f => ({ ...f, ciclo_escolar: e.target.value }))}
                  required
                  className={`${inputClass} ${inputFocusStyle}`}
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ color: '#DC2626', background: '#FEF2F2' }}>{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid #E2E8F0', color: '#64748B' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)' }}
              >
                {pending && <Loader2 size={14} className="animate-spin" />}
                Crear grupo
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
