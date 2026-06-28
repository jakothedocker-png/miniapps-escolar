import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, BookOpen, CheckCircle, ChevronRight } from 'lucide-react'
import GraficaPromedios, { type DatosCampo } from '@/components/charts/GraficaPromedios'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const [{ data: usuario }, { data: grupos }] = await Promise.all([
    admin.from('usuarios').select('*').eq('id', user.id).single(),
    admin.from('grupos').select('*').eq('maestro_id', user.id).order('grado'),
  ])

  if (!usuario) redirect('/auth/login')

  const gruposData = grupos ?? []
  const grupoIds = gruposData.map(g => g.id)
  const cicloEscolar = gruposData[0]?.ciclo_escolar ?? ''

  const [
    { data: todosAlumnos },
    { data: evalsT1 },
    { count: califCapturadas },
    { data: evalsGrafica },
  ] = await Promise.all([
    grupoIds.length > 0
      ? admin.from('alumnos').select('grupo_id').in('grupo_id', grupoIds).eq('activo', true).eq('deleted', false)
      : Promise.resolve({ data: [] }),
    grupoIds.length > 0 && cicloEscolar
      ? admin.from('evaluaciones').select('grupo_id, alumno_id, lenguajes, saberes, etica, humanos').in('grupo_id', grupoIds).eq('ciclo_escolar', cicloEscolar).eq('trimestre', 1)
      : Promise.resolve({ data: [] }),
    admin.from('evaluaciones').select('*', { count: 'exact', head: true }).eq('maestro_id', user.id),
    grupoIds.length > 0 && cicloEscolar
      ? admin.from('evaluaciones').select('trimestre, lenguajes, saberes, etica, humanos').in('grupo_id', grupoIds).eq('ciclo_escolar', cicloEscolar)
      : Promise.resolve({ data: [] }),
  ])

  const alumnosPorGrupo = new Map<string, number>()
  for (const a of todosAlumnos ?? []) {
    alumnosPorGrupo.set(a.grupo_id, (alumnosPorGrupo.get(a.grupo_id) ?? 0) + 1)
  }
  const evalsPorGrupo = new Map<string, Set<string>>()
  for (const e of evalsT1 ?? []) {
    if (e.lenguajes !== null || e.saberes !== null || e.etica !== null || e.humanos !== null) {
      if (!evalsPorGrupo.has(e.grupo_id)) evalsPorGrupo.set(e.grupo_id, new Set())
      evalsPorGrupo.get(e.grupo_id)!.add(e.alumno_id)
    }
  }

  const gruposConStats = gruposData.map(grupo => ({
    ...grupo,
    totalAlumnos: alumnosPorGrupo.get(grupo.id) ?? 0,
    alumnosConCalif: evalsPorGrupo.get(grupo.id)?.size ?? 0,
  }))

  const totalAlumnos = gruposConStats.reduce((sum, g) => sum + g.totalAlumnos, 0)
  const totalGrupos = gruposConStats.length

  const campos = ['lenguajes', 'saberes', 'etica', 'humanos'] as const
  const labels = ['Lenguajes', 'Saberes', 'Ética', 'De lo Humano']
  const datosGrafica: DatosCampo[] = campos.map((c, i) => {
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

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid rgba(6,135,216,0.12)',
    boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
  }

  return (
    <div className="p-8 space-y-8" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>
          {saludo}, {usuario.nombre.split(' ')[0]}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Ciclo escolar 2025-2026
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,135,216,0.10)' }}>
              <Users size={20} style={{ color: '#0687D8' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>{totalAlumnos}</p>
              <p className="text-xs" style={{ color: '#64748B' }}>Total de alumnos</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#EFF9F0' }}>
              <BookOpen size={20} style={{ color: '#15803D' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>{totalGrupos}</p>
              <p className="text-xs" style={{ color: '#64748B' }}>Grupos activos</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#FFFBEB' }}>
              <CheckCircle size={20} style={{ color: '#B45309' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>{califCapturadas ?? 0}</p>
              <p className="text-xs" style={{ color: '#64748B' }}>Calificaciones capturadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica de promedios */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#1E2D3D' }}>Promedios por campo formativo</h2>
        <GraficaPromedios datos={datosGrafica} />
      </div>

      {/* Grupos */}
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#1E2D3D' }}>Mis grupos</h2>

        {gruposConStats.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={cardStyle}>
            <BookOpen size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <p className="text-sm mb-4" style={{ color: '#64748B' }}>
              Aún no tienes grupos registrados
            </p>
            <Link
              href="/app/grupos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
            >
              Crear mi primer grupo
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {gruposConStats.map((grupo) => {
              const porcentaje = grupo.totalAlumnos > 0
                ? Math.round((grupo.alumnosConCalif / grupo.totalAlumnos) * 100)
                : 0

              return (
                <Link
                  key={grupo.id}
                  href={`/app/grupos/${grupo.id}/alumnos`}
                  className="block rounded-2xl p-5 transition-colors group"
                  style={cardStyle}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-base font-semibold" style={{ color: '#1E2D3D' }}>
                          {grupo.grado} {grupo.grupo}
                        </p>
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
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs" style={{ color: '#64748B' }}>
                          <span>{grupo.alumnosConCalif}/{grupo.totalAlumnos} alumnos con calificaciones</span>
                          <span>{porcentaje}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${porcentaje}%`, background: '#0687D8' }}
                          />
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="ml-4 transition-colors" style={{ color: '#CBD5E1' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
