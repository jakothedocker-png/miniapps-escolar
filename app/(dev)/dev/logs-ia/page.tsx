import { createAdminClient } from '@/lib/supabase/server'
import { Activity, DollarSign, Cpu, TrendingUp } from 'lucide-react'

const USD_TO_MXN = 17.5

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

export default async function LogsIAPage() {
  const supabase = createAdminClient()

  // Obtener últimos 100 logs
  const { data: logs } = await supabase
    .from('logs_ia')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Totales del mes
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

  const { data: logsMes } = await supabase
    .from('logs_ia')
    .select('tokens_input, tokens_output, costo_usd')
    .gte('created_at', inicioMes)

  const totalMesTokensInput = logsMes?.reduce((s, l) => s + (l.tokens_input ?? 0), 0) ?? 0
  const totalMesTokensOutput = logsMes?.reduce((s, l) => s + (l.tokens_output ?? 0), 0) ?? 0
  const totalMesCostoUSD = logsMes?.reduce((s, l) => s + (l.costo_usd ?? 0), 0) ?? 0
  const totalMesCostoMXN = totalMesCostoUSD * USD_TO_MXN

  // IDs únicos para fetch de nombres
  const maestroIds = Array.from(new Set((logs ?? []).map(l => l.maestro_id).filter(Boolean)))
  const alumnoIds  = Array.from(new Set((logs ?? []).map(l => l.alumno_id).filter(Boolean)))

  const [{ data: maestros }, { data: alumnos }] = await Promise.all([
    maestroIds.length > 0
      ? supabase.from('usuarios').select('id, nombre, zona_id').in('id', maestroIds)
      : Promise.resolve({ data: [] }),

    alumnoIds.length > 0
      ? supabase
          .from('alumnos')
          .select('id, nombre, apellido_paterno')
          .in('id', alumnoIds)
      : Promise.resolve({ data: [] }),
  ])

  const maestrosMap = new Map((maestros ?? []).map(m => [m.id, m.nombre]))
  const alumnosMap = new Map(
    (alumnos ?? []).map(a => [a.id, `${a.nombre} ${a.apellido_paterno}`])
  )

  // Zonas para los maestros
  const zonaIds = Array.from(new Set((maestros ?? []).map(m => m.zona_id).filter(Boolean)))
  const { data: zonas } = zonaIds.length > 0
    ? await supabase.from('zonas').select('id, nombre').in('id', zonaIds)
    : { data: [] }

  const maestroZonaMap = new Map(
    (maestros ?? []).map(m => [m.id, m.zona_id])
  )
  const zonasMap = new Map((zonas ?? []).map(z => [z.id, z.nombre]))

  const resumenCards = [
    {
      label: 'Llamadas este mes',
      valor: logsMes?.length ?? 0,
      icon: Activity,
      bg: 'rgba(6,135,216,0.10)',
      color: '#0687D8',
    },
    {
      label: 'Tokens entrada (mes)',
      valor: totalMesTokensInput.toLocaleString('es-MX'),
      icon: Cpu,
      bg: 'rgba(109,40,217,0.10)',
      color: '#7C3AED',
    },
    {
      label: 'Tokens salida (mes)',
      valor: totalMesTokensOutput.toLocaleString('es-MX'),
      icon: TrendingUp,
      bg: '#EFF9F0',
      color: '#15803D',
    },
    {
      label: 'Costo mes (USD / MXN)',
      valor: `$${totalMesCostoUSD.toFixed(4)} / $${totalMesCostoMXN.toFixed(2)}`,
      icon: DollarSign,
      bg: '#FFFBEB',
      color: '#B45309',
    },
  ]

  return (
    <div className="p-8 space-y-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Logs de IA</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Últimas 100 llamadas · Total del mes: {logsMes?.length ?? 0} generaciones
          </p>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {resumenCards.map(({ label, valor, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-2xl font-bold leading-tight" style={{ color: '#1E2D3D' }}>{valor}</p>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-16">
            <Activity size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>No hay logs de IA registrados aún.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                {['Fecha', 'Maestro', 'Zona', 'Alumno', 'Tokens entrada', 'Tokens salida', 'Costo USD'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ background: '#F8FAFF', color: '#64748B' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const fecha = new Date(log.created_at)
                const zona_id = maestroZonaMap.get(log.maestro_id)
                return (
                  <tr
                    key={log.id}
                    style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap">
                      <span style={{ color: '#1E2D3D' }}>{fecha.toLocaleDateString('es-MX')}</span>
                      <br />
                      <span style={{ color: '#94A3B8' }}>{fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: '#1E2D3D' }}>
                      {maestrosMap.get(log.maestro_id) ?? (
                        <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{log.maestro_id?.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: '#64748B' }}>
                      {zona_id ? (zonasMap.get(zona_id) ?? zona_id) : '—'}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: '#1E2D3D' }}>
                      {log.alumno_id
                        ? (alumnosMap.get(log.alumno_id) ?? (
                          <span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{log.alumno_id.slice(0, 8)}…</span>
                        ))
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: '#64748B' }}>
                      {(log.tokens_input ?? 0).toLocaleString('es-MX')}
                    </td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: '#64748B' }}>
                      {(log.tokens_output ?? 0).toLocaleString('es-MX')}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      <span style={{ color: (log.costo_usd ?? 0) > 0.01 ? '#B45309' : '#94A3B8' }}>
                        ${(log.costo_usd ?? 0).toFixed(6)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-right" style={{ color: '#CBD5E1' }}>
        Mostrando últimos 100 registros · 1 USD ≈ {USD_TO_MXN} MXN
      </p>
    </div>
  )
}
