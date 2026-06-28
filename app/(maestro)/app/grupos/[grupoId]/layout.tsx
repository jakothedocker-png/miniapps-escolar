import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import GrupoTabs from './GrupoTabs'

interface Props {
  children: React.ReactNode
  params: { grupoId: string }
}

export default async function GrupoLayout({ children, params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('*')
    .eq('id', params.grupoId)
    .single()

  if (!grupo) notFound()
  if (grupo.maestro_id !== user.id) redirect('/app/grupos')

  return (
    <div className="flex flex-col min-h-full">
      {/* Header del grupo */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 pt-8 pb-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {grupo.grado} {grupo.grupo}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Ciclo {grupo.ciclo_escolar}
            {grupo.tipo === 'multigrado' && (
              <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                Multigrado
              </span>
            )}
          </p>
        </div>
        <GrupoTabs grupoId={params.grupoId} />
      </div>

      {/* Contenido del tab */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-950">
        {children}
      </div>
    </div>
  )
}
