'use client'
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  grupoId: string
}

export default function GrupoTabs({ grupoId }: Props) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Alumnos',        href: `/app/grupos/${grupoId}/alumnos` },
    { label: 'Calificaciones', href: `/app/grupos/${grupoId}/calificaciones` },
  ]

  return (
    <nav className="flex gap-1">
      {tabs.map(tab => {
        const activo = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            style={activo
              ? { borderColor: '#0687D8', color: '#0687D8' }
              : { borderColor: 'transparent', color: '#64748B' }
            }
            onMouseEnter={e => {
              if (!activo) {
                (e.currentTarget as HTMLElement).style.color = '#1E2D3D'
                ;(e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'
              }
            }}
            onMouseLeave={e => {
              if (!activo) {
                (e.currentTarget as HTMLElement).style.color = '#64748B'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
              }
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
