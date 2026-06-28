'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, CheckCircle2, GraduationCap } from 'lucide-react'

export default function RecuperarPage() {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/nueva-contrasena`,
    })
    if (err) { setError('No se pudo enviar el correo. Verifica la dirección.'); setLoading(false); return }
    setEnviado(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(150deg, #EEF4FC 0%, #F5F8FF 50%, #EAF0FA 100%)' }}>

      <div className="w-full max-w-sm space-y-5">

        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #3B5BDB 100%)' }}>
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E2D3D' }}>Recuperar acceso</h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#94A3B8' }}>Miniapps Escolar</p>
        </div>

        {enviado ? (
          <div className="rounded-2xl px-6 py-8 text-center space-y-3"
            style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
            <CheckCircle2 size={36} className="mx-auto" style={{ color: '#15803D' }} />
            <p className="font-semibold" style={{ color: '#1E2D3D' }}>Correo enviado</p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
              <div className="flex items-center gap-3 px-5 py-4">
                <Mail size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="Tu correo electrónico"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: '#1E2D3D' }} />
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-xl text-sm text-center"
                style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : 'Enviar instrucciones'}
            </button>
          </form>
        )}

        <p className="text-center text-xs" style={{ color: '#94A3B8' }}>
          <a href="/auth/login" className="transition-colors" style={{ color: '#0687D8' }}>
            ← Volver al inicio de sesión
          </a>
        </p>
      </div>

      <p className="mt-12 text-xs" style={{ color: '#C0CEDD' }}>Miniapps © 2026</p>
    </div>
  )
}
