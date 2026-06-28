export default function LoadingDashboard() {
  return (
    <div className="p-8 space-y-8">
      <div className="h-8 w-48 rounded-xl bg-white/10 animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-white/10 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white/10 animate-pulse" />
      <div className="space-y-3">
        {[1,2].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/10 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
