import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Users, BookOpen, UserCheck, ClipboardList } from 'lucide-react'
import GraficaPromedios, { type DatosCampo } from '@/components/charts/GraficaPromedios'

const GRADO_LABEL: Record<number, string> = {
  1: '1°', 2: '2°', 3: '3°', 4: '4°', 5: '5°', 6: '6°',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

export default async function DirectorEscuelaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminClient = createAdminClient()

  // Obtener usuario y su escuela
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('escuela_id, zona_id, nombre')
    .eq('id', user.id)
    .single()

  if (!usuario?.escuela_id) {
    return (
      <div className="p-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
        <p className="text-sm" style={{ color: '#64748B' }}>
          Tu cuenta no tiene una escuela asignada. Contacta al administrador.
        </p>
      </div>
    )
  }

  // Obtener escuela
  const { data: escuela } = await adminClient
    .from('escuelas')
    .select('*')
    .eq('id', usuario.escuela_id)
    .single()

  if (!escuela) redirect('/auth/login')

  // Obtener grupos de la escuela
  const { data: grupos } = await adminClient
    .from('grupos')
    .select('id, grado, grupo, maestro_id')
    .eq('escuela_id', usuario.escuela_id)
    .order('grado')
    .order('grupo')

  const grupoIds = grupos?.map(g => g.id) ?? []
  const maestroIds = Array.from(new Set(grupos?.map(g => g.maestro_id).filter(Boolean) ?? []))

  // Obtener totales en paralelo
  const [
    { count: totalAlumnos },
    { data: maestros },
    { data: evaluacionesPorGrupo },
    { data: alumnosPorGrupo },
  ] = await Promise.all([
    adminClient
      .from('alumnos')
      .select('*', { count: 'exact', head: true })
      .eq('escuela_id', usuario.escuela_id)
      .eq('activo', true)
      .eq('deleted', false),

    maestroIds.length > 0
      ? adminClient
          .from('usuarios')
          .select('id, nombre')
          .in('id', maestroIds)
      : Promise.resolve({ data: [] }),

    grupoIds.length > 0
      ? adminClient
          .from('evaluaciones')
          .select('grupo_id, trimestre, alumno_id')
          .in('grupo_id', grupoIds)
      : Promise.resolve({ data: [] }),

    grupoIds.length > 0
      ? adminClient
          .from('alumnos')
          .select('grupo_id')
          .in('grupo_id', grupoIds)
          .eq('activo', true)
          .eq('deleted', false)
      : Promise.resolve({ data: [] }),
  ])

  // Construir mapa de maestros
  const maestrosMap = new Map((maestros ?? []).map(m => [m.id, m.nombre]))

  // Contar alumnos por grupo
  const alumnosPorGrupoMap = new Map<string, number>()
  for (const a of alumnosPorGrupo ?? []) {
    const prev = alumnosPorGrupoMap.get(a.grupo_id) ?? 0
    alumnosPorGrupoMap.set(a.grupo_id, prev + 1)
  }

  // Contar evaluaciones únicas
  const evalsPorGrupoMap = new Map<string, Set<string>>()
  for (const e of evaluacionesPorGrupo ?? []) {
    if (!evalsPorGrupoMap.has(e.grupo_id)) {
      evalsPorGrupoMap.set(e.grupo_id, new Set())
    }
    evalsPorGrupoMap.get(e.grupo_id)!.add(e.alumno_id)
  }

  const totalEvaluaciones = evaluacionesPorGrupo?.length ?? 0
  const totalMaestros = maestroIds.length

  // Gráfica de promedios de la escuela
  let datosGrafica: DatosCampo[] = [
    { campo: 'Lenguajes', t1: null, t2: null, t3: null },
    { campo: 'Saberes', t1: null, t2: null, t3: null },
    { campo: 'Ética', t1: null, t2: null, t3: null },
    { campo: 'De lo Humano', t1: null, t2: null, t3: null },
  ]

  if (grupoIds.length > 0) {
    const { data: evalsGrafica } = await adminClient
      .from('evaluaciones')
      .select('trimestre, lenguajes, saberes, etica, humanos')
      .eq('escuela_id', usuario.escuela_id)

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
    { label: 'Total alumnos', valor: totalAlumnos ?? 0, icon: Users, bg: 'rgba(6,135,216,0.10)', color: '#0687D8' },
    { label: 'Grupos', valor: grupos?.length ?? 0, icon: BookOpen, bg: '#EFF9F0', color: '#15803D' },
    { label: 'Maestros', valor: totalMaestros, icon: UserCheck, bg: '#FFFBEB', color: '#B45309' },
    { label: 'Evaluaciones capturadas', valor: totalEvaluaciones, icon: ClipboardList, bg: 'rgba(6,135,216,0.06)', color: '#0569B0' },
  ]

  return (
    <div className="p-8 space-y-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>{escuela.nombre}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: '#64748B' }}>
          <span className="font-mono">{escuela.cct}</span>
          {escuela.municipio && (
            <>
              <span>·</span>
              <span>{escuela.municipio}</span>
            </>
          )}
        </div>
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

      {/* Tabla de grupos */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
          <h2 className="text-base font-semibold" style={{ color: '#1E2D3D' }}>Grupos</h2>
        </div>

        {!grupos || grupos.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: '#94A3B8' }}>
            No hay grupos registrados para esta escuela.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                {['Grado y grupo', 'Maestro asignado', 'Alumnos', 'Progreso de captura'].map(h => (
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
              {grupos.map((g, idx) => {
                const numAlumnos = alumnosPorGrupoMap.get(g.id) ?? 0
                const alumnosConEval = evalsPorGrupoMap.get(g.id)?.size ?? 0
                const pct = numAlumnos > 0 ? Math.round((alumnosConEval / numAlumnos) * 100) : 0

                return (
                  <tr
                    key={g.id}
                    style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold" style={{ color: '#1E2D3D' }}>
                        {GRADO_LABEL[g.grado] ?? `${g.grado}°`} {g.grupo}
                      </p>
                    </td>
                    <td className="px-5 py-4" style={{ color: '#64748B' }}>
                      {g.maestro_id ? (maestrosMap.get(g.maestro_id) ?? 'Sin nombre') : (
                        <span className="italic" style={{ color: '#94A3B8' }}>Sin asignar</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium" style={{ color: '#1E2D3D' }}>
                      {numAlumnos}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-[120px] rounded-full h-2 overflow-hidden" style={{ background: '#E2E8F0' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: '#0687D8' }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap" style={{ color: '#64748B' }}>
                          {alumnosConEval}/{numAlumnos}
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
