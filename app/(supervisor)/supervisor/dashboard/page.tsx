import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Building2, Users, BookOpen, ClipboardList } from 'lucide-react'
import GraficaPromedios, { type DatosCampo } from '@/components/charts/GraficaPromedios'

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

export default async function SupervisorDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  // Obtener zona del supervisor
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('zona_id, nombre')
    .eq('id', user.id)
    .single()

  if (!usuario?.zona_id) {
    return (
      <div className="p-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
        <p className="text-sm" style={{ color: '#64748B' }}>
          Tu cuenta no tiene una zona asignada. Contacta al administrador.
        </p>
      </div>
    )
  }

  const zona_id = usuario.zona_id

  // Obtener escuelas de la zona
  const { data: escuelas } = await adminClient
    .from('escuelas')
    .select('id, nombre, cct, municipio')
    .eq('zona_id', zona_id)
    .order('nombre')

  const escuelaIds = escuelas?.map(e => e.id) ?? []

  // Stats en paralelo
  const [
    { count: totalMaestros },
    { count: totalAlumnos },
    { data: gruposPorEscuela },
    { data: evaluaciones },
    { data: alumnosPorEscuela },
  ] = await Promise.all([
    adminClient
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('zona_id', zona_id)
      .eq('rol', 'maestro'),

    adminClient
      .from('alumnos')
      .select('*', { count: 'exact', head: true })
      .eq('zona_id', zona_id)
      .eq('activo', true)
      .eq('deleted', false),

    escuelaIds.length > 0
      ? adminClient
          .from('grupos')
          .select('id, escuela_id')
          .in('escuela_id', escuelaIds)
      : Promise.resolve({ data: [] }),

    adminClient
      .from('evaluaciones')
      .select('escuela_id, alumno_id', { count: 'exact' })
      .eq('zona_id', zona_id),

    escuelaIds.length > 0
      ? adminClient
          .from('alumnos')
          .select('escuela_id')
          .in('escuela_id', escuelaIds)
          .eq('activo', true)
          .eq('deleted', false)
      : Promise.resolve({ data: [] }),
  ])

  // Mapas por escuela
  const gruposPorEscuelaMap = new Map<string, number>()
  for (const g of gruposPorEscuela ?? []) {
    gruposPorEscuelaMap.set(g.escuela_id, (gruposPorEscuelaMap.get(g.escuela_id) ?? 0) + 1)
  }

  const alumnosEscuelaMap = new Map<string, number>()
  for (const a of alumnosPorEscuela ?? []) {
    alumnosEscuelaMap.set(a.escuela_id, (alumnosEscuelaMap.get(a.escuela_id) ?? 0) + 1)
  }

  const evalAlumnosEscuelaMap = new Map<string, Set<string>>()
  for (const e of evaluaciones ?? []) {
    if (e.escuela_id) {
      if (!evalAlumnosEscuelaMap.has(e.escuela_id)) {
        evalAlumnosEscuelaMap.set(e.escuela_id, new Set())
      }
      evalAlumnosEscuelaMap.get(e.escuela_id)!.add(e.alumno_id)
    }
  }

  const totalEvaluaciones = evaluaciones?.length ?? 0

  // Gráfica de promedios de la zona
  let datosGrafica: DatosCampo[] = [
    { campo: 'Lenguajes', t1: null, t2: null, t3: null },
    { campo: 'Saberes', t1: null, t2: null, t3: null },
    { campo: 'Ética', t1: null, t2: null, t3: null },
    { campo: 'De lo Humano', t1: null, t2: null, t3: null },
  ]

  {
    const { data: evalsGrafica } = await adminClient
      .from('evaluaciones')
      .select('trimestre, lenguajes, saberes, etica, humanos')
      .eq('zona_id', zona_id)

    const camposKeys = ['lenguajes', 'saberes', 'etica', 'humanos'] as const
    const labels = ['Lenguajes', 'Saberes', 'Ética', 'De lo Humano']

    datosGrafica = camposKeys.map((c, i) => {
      const porTrimestre: Record<number, number[]> = { 1: [], 2: [], 3: [] }
      for (const ev of evalsGrafica ?? []) {
        if (ev[c] !== null && ev[c] !== undefined) {
          porTrimestre[ev.trimestre]?.push(Number(ev[c]))
        }
      }
      const prom = (arr: number[]) => arr.length > 0
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        : null
      return { campo: labels[i], t1: prom(porTrimestre[1]), t2: prom(porTrimestre[2]), t3: prom(porTrimestre[3]) }
    })
  }

  const stats = [
    { label: 'Escuelas', valor: escuelas?.length ?? 0, icon: Building2, bg: 'rgba(6,135,216,0.10)', color: '#0687D8' },
    { label: 'Maestros', valor: totalMaestros ?? 0, icon: Users, bg: '#FFFBEB', color: '#B45309' },
    { label: 'Alumnos', valor: totalAlumnos ?? 0, icon: BookOpen, bg: '#EFF9F0', color: '#15803D' },
    { label: 'Evaluaciones capturadas', valor: totalEvaluaciones, icon: ClipboardList, bg: 'rgba(6,135,216,0.06)', color: '#0569B0' },
  ]

  return (
    <div className="p-8 space-y-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Dashboard de zona</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Resumen de actividad de tu zona escolar
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, valor, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl p-5" style={cardStyle}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1E2D3D' }}>{valor}</p>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Lista de escuelas */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
          <h2 className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Escuelas de la zona</h2>
        </div>

        {!escuelas || escuelas.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: '#94A3B8' }}>
            No hay escuelas registradas en tu zona.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                {['Escuela', 'CCT', 'Grupos', 'Alumnos', 'Captura'].map(h => (
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
              {escuelas.map((e, idx) => {
                const numGrupos = gruposPorEscuelaMap.get(e.id) ?? 0
                const numAlumnos = alumnosEscuelaMap.get(e.id) ?? 0
                const alumnosConEval = evalAlumnosEscuelaMap.get(e.id)?.size ?? 0
                const pct = numAlumnos > 0 ? Math.round((alumnosConEval / numAlumnos) * 100) : 0

                return (
                  <tr
                    key={e.id}
                    style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                    onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                    onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium" style={{ color: '#1E2D3D' }}>{e.nombre}</p>
                      {e.municipio && (
                        <p className="text-xs" style={{ color: '#64748B' }}>{e.municipio}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs" style={{ color: '#64748B' }}>
                      {e.cct}
                    </td>
                    <td className="px-5 py-4" style={{ color: '#1E2D3D' }}>
                      {numGrupos}
                    </td>
                    <td className="px-5 py-4" style={{ color: '#1E2D3D' }}>
                      {numAlumnos}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[100px] rounded-full h-2 overflow-hidden" style={{ background: '#E2E8F0' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: '#0687D8' }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Gráfica de promedios */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#1E2D3D' }}>Promedios por campo formativo</h2>
        <GraficaPromedios datos={datosGrafica} />
      </div>
    </div>
  )
}
