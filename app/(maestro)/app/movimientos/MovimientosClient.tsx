'use client'

import { useMemo, useState } from 'react'
import { Search, X, UserPlus, UserMinus, ArrowRightLeft } from 'lucide-react'

interface Movimiento {
  id: string
  tipo: string
  alumno_nombre: string
  curp: string | null
  motivo: string | null
  autorizo_nombre: string | null
  fecha: string
}

const TIPO_BADGE: Record<string, { background: string; color: string; label: string }> = {
  alta:     { background: '#EFF9F0',               color: '#15803D', label: 'Alta' },
  baja:     { background: '#FEF2F2',               color: '#DC2626', label: 'Baja' },
  traslado: { background: 'rgba(6,135,216,0.10)',  color: '#0687D8', label: 'Traslado' },
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

const inputStyle = { border: '1px solid #E2E8F0', background: '#fff', color: '#1E2D3D' }

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function MovimientosClient({ movimientos }: { movimientos: Movimiento[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return movimientos.filter(m => {
      if (filtroTipo && m.tipo !== filtroTipo) return false
      if (q && !m.alumno_nombre.toLowerCase().includes(q) && !(m.curp ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [movimientos, busqueda, filtroTipo])

  const hayFiltros = busqueda || filtroTipo

  const totales = useMemo(() => ({
    alta:     movimientos.filter(m => m.tipo === 'alta').length,
    baja:     movimientos.filter(m => m.tipo === 'baja').length,
    traslado: movimientos.filter(m => m.tipo === 'traslado').length,
  }), [movimientos])

  return (
    <div className="p-8 space-y-6" style={{ background: '#F5F8FF', minHeight: '100%' }}>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Movimientos de alumnos</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Historial de altas, bajas y traslados. Se registra automáticamente al inscribir, importar o dar de baja alumnos.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { tipo: 'alta',     icon: UserPlus,      total: totales.alta },
          { tipo: 'baja',     icon: UserMinus,     total: totales.baja },
          { tipo: 'traslado', icon: ArrowRightLeft, total: totales.traslado },
        ].map(({ tipo, icon: Icon, total }) => {
          const badge = TIPO_BADGE[tipo]
          return (
            <div key={tipo} className="rounded-2xl p-4 flex items-center gap-3" style={cardStyle}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: badge.background }}>
                <Icon size={18} style={{ color: badge.color }} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: '#1E2D3D' }}>{total}</p>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>{badge.label}{total !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Buscador + filtro */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
          <input type="text" placeholder="Buscar por nombre o CURP…" value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition"
            style={inputStyle}
            onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'}
            onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'}
          />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none transition"
          style={inputStyle}>
          <option value="">Todos los tipos</option>
          <option value="alta">Altas</option>
          <option value="baja">Bajas</option>
          <option value="traslado">Traslados</option>
        </select>
        {hayFiltros && (
          <button onClick={() => { setBusqueda(''); setFiltroTipo('') }}
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
            {hayFiltros
              ? 'Ningún movimiento coincide con los filtros.'
              : 'Aún no hay movimientos registrados. Se generarán al inscribir, importar o dar de baja alumnos.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                  {['Fecha', 'Alumno', 'Tipo', 'Motivo', 'Registró'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ background: '#F8FAFF', color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, idx) => {
                  const badge = TIPO_BADGE[m.tipo] ?? { background: '#F1F5F9', color: '#64748B', label: m.tipo }
                  return (
                    <tr key={m.id}
                      style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                      <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                        {formatFecha(m.fecha)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium" style={{ color: '#1E2D3D' }}>{m.alumno_nombre}</p>
                        {m.curp && <p className="text-xs font-mono mt-0.5" style={{ color: '#94A3B8' }}>{m.curp}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: badge.background, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[280px]" style={{ color: '#64748B' }}>
                        {m.motivo || <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: '#64748B' }}>
                        {m.autorizo_nombre || <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {movimientos.length >= 500 && (
        <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
          Se muestran los últimos 500 movimientos.
        </p>
      )}
    </div>
  )
}
