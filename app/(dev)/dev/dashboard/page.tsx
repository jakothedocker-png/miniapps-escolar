import { createAdminClient } from '@/lib/supabase/server'
import { Building2, Users, Cpu, AlertTriangle } from 'lucide-react'

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

async function getStats() {
  const supabase = createAdminClient()

  const [{ count: totalZonas }, { count: totalUsuarios }, { count: totalLogs }, { data: zonasRiesgo }] =
    await Promise.all([
      supabase.from('zonas').select('*', { count: 'exact', head: true }),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).neq('rol', 'superadmin'),
      supabase.from('logs_ia').select('*', { count: 'exact', head: true }),
      supabase
        .from('zonas')
        .select('id, nombre, licencia_vence, estatus')
        .neq('plan', 'legacy')
        .not('licencia_vence', 'is', null)
        .lte('licencia_vence', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('estatus', 'activo'),
    ])

  return { totalZonas, totalUsuarios, totalLogs, zonasRiesgo }
}

export default async function DevDashboard() {
  const { totalZonas, totalUsuarios, totalLogs, zonasRiesgo } = await getStats()

  const stats = [
    { label: 'Zonas activas',        valor: totalZonas ?? 0,          icon: Building2,     bg: 'rgba(6,135,216,0.10)', color: '#0687D8'  },
    { label: 'Usuarios registrados', valor: totalUsuarios ?? 0,       icon: Users,          bg: '#EFF9F0',              color: '#15803D'  },
    { label: 'Observaciones IA',     valor: totalLogs ?? 0,           icon: Cpu,            bg: 'rgba(6,135,216,0.06)', color: '#0569B0'  },
    { label: 'Zonas por vencer',     valor: zonasRiesgo?.length ?? 0, icon: AlertTriangle,  bg: '#FFFBEB',              color: '#B45309'  },
  ]

  return (
    <div className="p-8 space-y-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Dev Console</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>Vista global de la plataforma Miniapps Escolar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, valor, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1E2D3D' }}>{valor}</p>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Zonas próximas a vencer */}
      {zonasRiesgo && zonasRiesgo.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: '#FFFBEB', border: '1px solid rgba(180,83,9,0.20)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} style={{ color: '#B45309' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#92400E' }}>Zonas que vencen en los próximos 30 días</h2>
          </div>
          <div className="space-y-2">
            {zonasRiesgo.map(zona => (
              <div key={zona.id} className="flex items-center justify-between text-sm">
                <span style={{ color: '#1E2D3D' }}>{zona.nombre}</span>
                <span className="font-mono" style={{ color: '#B45309' }}>
                  {new Date(zona.licencia_vence!).toLocaleDateString('es-MX')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado del sistema */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#64748B' }}>Estado del sistema</h2>
        <div className="space-y-3">
          {[
            { label: 'Supabase',      ok: true },
            { label: 'DeepSeek API', ok: !!process.env.DEEPSEEK_API_KEY },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span style={{ color: '#64748B' }}>{label}</span>
              <span className="flex items-center gap-1.5 font-medium" style={{ color: ok ? '#15803D' : '#DC2626' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: ok ? '#15803D' : '#DC2626' }} />
                {ok ? 'Conectado' : 'Sin configurar'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
