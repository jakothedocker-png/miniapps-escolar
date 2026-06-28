'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ titulo, onClose, children }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(30,45,61,0.45)' }} onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(6,135,216,0.12)',
          boxShadow: '0 24px 64px rgba(30,45,61,0.18), 0 4px 16px rgba(30,45,61,0.08)',
        }}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(6,135,216,0.10)' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>{titulo}</h2>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1E2D3D'; (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.background = '' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
