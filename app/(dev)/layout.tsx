import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DevSidebar from '@/components/dev/DevSidebar'

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol, nombre')
    .eq('id', user.id)
    .single()

  if (usuario?.rol !== 'superadmin') redirect('/app/dashboard')

  return (
    <div className="relative flex min-h-screen">
      <div className="fixed inset-0 bg-[#0f0f1a] -z-10" />
      <div className="fixed top-0 left-0 w-[60%] h-[60%] rounded-full bg-teal-500/30 blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none -z-10" />
      <div className="fixed top-0 right-0 w-[60%] h-[60%] rounded-full bg-orange-400/25 blur-[120px] translate-x-1/3 -translate-y-1/3 pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[55%] h-[55%] rounded-full bg-rose-600/20 blur-[120px] translate-x-1/4 translate-y-1/4 pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[55%] h-[55%] rounded-full bg-indigo-900/50 blur-[120px] -translate-x-1/4 translate-y-1/4 pointer-events-none -z-10" />

      <DevSidebar nombre={usuario.nombre} />
      <main className="flex-1 overflow-auto text-white">
        {children}
      </main>
    </div>
  )
}
