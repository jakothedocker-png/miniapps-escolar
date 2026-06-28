'use client'

export default function ErrorDashboard({ error }: { error: Error }) {
  return (
    <div className="p-8">
      <div className="rounded-2xl p-6 bg-red-500/20 border border-red-400/30 text-white">
        <p className="font-bold mb-2">Error al cargar el dashboard:</p>
        <pre className="text-sm text-red-200 whitespace-pre-wrap">{error.message}</pre>
      </div>
    </div>
  )
}
