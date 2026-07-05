'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { LayoutDashboard, Users, LogOut, GraduationCap, Printer, AlertTriangle, Settings, BarChart3, ArrowRightLeft } from 'lucide-react'

const NAV = [
  { href: '/app/dashboard',        label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/app/grupos',           label: 'Mis grupos',      icon: Users },
  { href: '/app/reportes',         label: 'Reportes',        icon: Printer },
  { href: '/app/aprovechamiento',  label: 'Aprovechamiento', icon: BarChart3 },
  { href: '/app/movimientos',      label: 'Movimientos',     icon: ArrowRightLeft },
  { href: '/app/riesgo',           label: 'En Riesgo',       icon: AlertTriangle },
  { href: '/app/configuracion',    label: 'Configuración',   icon: Settings },
]

export default function MaestroSidebar({ nombre }: { nombre: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col min-h-screen"
      style={{
        background: '#FFFFFF',
        borderRight: '1px solid rgba(6,135,216,0.10)',
        boxShadow: '2px 0 12px rgba(30,45,61,0.06)',
      }}>
      <div style={{ background: 'linear-gradient(135deg, #0687D8 0%, #3B5BDB 100%)' }}
        className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.20)' }}>
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Miniapps</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>Escolar</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={activo ? {
                background: 'rgba(6,135,216,0.12)',
                color: '#0687D8',
                borderLeft: '3px solid #0687D8',
              } : {
                color: '#64748B',
              }}
              onMouseEnter={activo ? undefined : e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.07)'
                ;(e.currentTarget as HTMLElement).style.color = '#1E2D3D'
              }}
              onMouseLeave={activo ? undefined : e => {
                (e.currentTarget as HTMLElement).style.background = ''
                ;(e.currentTarget as HTMLElement).style.color = '#64748B'
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid rgba(6,135,216,0.10)' }}>
        <div className="px-3">
          <p className="text-xs" style={{ color: '#94A3B8' }}>Maestro</p>
          <p className="text-sm font-medium truncate" style={{ color: '#1E2D3D' }}>{nombre}</p>
        </div>
        <form action={logout}>
          <button type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{ color: '#64748B' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.07)'
              ;(e.currentTarget as HTMLElement).style.color = '#1E2D3D'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = ''
              ;(e.currentTarget as HTMLElement).style.color = '#64748B'
            }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
