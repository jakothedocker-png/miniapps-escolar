import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MaestroSidebar from '@/components/maestro/MaestroSidebar'

export default async function MaestroLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol, nombre, licencia_plan, licencia_periodos')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'maestro') redirect('/auth/login')

  const periodosPago = ['trimestre_1', 'trimestre_2', 'trimestre_3']
  const esLegacy = usuario.licencia_plan === 'legacy'
  const modoConsulta = !esLegacy && !periodosPago.some(p => (usuario.licencia_periodos ?? []).includes(p))

  return (
    <div className="relative flex min-h-screen">
      {/* Fondo con blobs fijos */}
      <div className="fixed inset-0 bg-[#0f0f1a] -z-10" />
      <div className="fixed top-0 left-0 w-[60%] h-[60%] rounded-full bg-teal-500/30 blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none -z-10" />
      <div className="fixed top-0 right-0 w-[60%] h-[60%] rounded-full bg-orange-400/25 blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[55%] h-[55%] rounded-full bg-rose-600/20 blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[55%] h-[55%] rounded-full bg-indigo-900/50 blur-[120px] -translate-x-1/4 translate-y-1/4 pointer-events-none -z-10" />

      <MaestroSidebar nombre={usuario.nombre} />
      <main className="flex-1 overflow-auto">
        {modoConsulta && <BannerConsulta />}
        {children}
      </main>
    </div>
  )
}

function BannerConsulta() {
  return (
    <div className="backdrop-blur-md bg-amber-500/20 border-b border-amber-400/30 px-6 py-2.5 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-200">
        <span className="font-semibold">Modo consulta.</span>{' '}
        Puedes ver tu información pero no puedes capturar ni editar. Contrata un plan para activar todas las funciones.
      </p>
      <a href="https://wa.me/5272222478493" target="_blank" rel="noopener noreferrer"
        className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/40 border border-amber-400/50 hover:bg-amber-500/60 text-white transition-colors">
        Contratar
      </a>
    </div>
  )
}
