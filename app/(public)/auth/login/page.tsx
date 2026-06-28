'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

const DESTINOS: Record<string, string> = {
  superadmin: '/dev/dashboard',
  supervisor:  '/supervisor/dashboard',
  director:    '/director/escuela',
  maestro:     '/app/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [verPass, setVerPass]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [aceptoTerminos, setAcepto] = useState(false)
  const [focusEmail, setFocusEmail] = useState(false)
  const [focusPass, setFocusPass]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aceptoTerminos) return
    setLoading(true)
    setError(null)

    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !user) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    router.push(DESTINOS[usuario?.rol ?? ''] ?? '/app/dashboard')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4"
         style={{ background: 'linear-gradient(150deg, #EEF4FC 0%, #F5F8FF 50%, #EAF0FA 100%)' }}>

      {/* Blobs Deepin light — azul muy suave */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(6,135,216,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', filter: 'blur(70px)' }} />
      <div className="absolute top-[40%] left-[-5%] w-[30%] h-[30%] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(6,135,216,0.07) 0%, transparent 70%)', filter: 'blur(50px)' }} />

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{
                 background: 'linear-gradient(135deg, #0687D8 0%, #3B5BDB 100%)',
                 boxShadow: '0 8px 32px rgba(6,135,216,0.35), 0 2px 8px rgba(0,0,0,0.10)'
               }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="8"  y="8"  width="6" height="6" rx="1.5" fill="white" opacity="0.95"/>
              <rect x="18" y="8"  width="6" height="6" rx="1.5" fill="white" opacity="0.60"/>
              <rect x="8"  y="18" width="6" height="6" rx="1.5" fill="white" opacity="0.60"/>
              <rect x="18" y="18" width="6" height="6" rx="1.5" fill="white" opacity="0.95"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-wide" style={{ color: '#1E2D3D' }}>
              Miniapps Escolar
            </h1>
            <p className="text-xs tracking-widest uppercase mt-1" style={{ color: '#7A8FA6' }}>
              Calificaciones con IA
            </p>
          </div>
        </div>

        {/* Card blanca */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl overflow-hidden"
               style={{
                 background: '#FFFFFF',
                 border: '1px solid rgba(6,135,216,0.12)',
                 boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)'
               }}>

            {/* Input email */}
            <div className="flex items-center gap-3 px-5 py-4 transition-colors"
                 style={{
                   borderBottom: `1px solid ${focusEmail ? 'rgba(6,135,216,0.20)' : 'rgba(0,0,0,0.07)'}`,
                   background: focusEmail ? 'rgba(6,135,216,0.03)' : 'transparent'
                 }}>
              <Mail size={15} style={{ color: focusEmail ? '#0687D8' : '#94A3B8', flexShrink: 0, transition: 'color 0.2s' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                required
                autoComplete="email"
                placeholder="Correo electrónico"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder-slate-300"
                style={{ color: '#1E2D3D' }}
              />
            </div>

            {/* Input contraseña */}
            <div className="flex items-center gap-3 px-5 py-4 transition-colors"
                 style={{
                   background: focusPass ? 'rgba(6,135,216,0.03)' : 'transparent'
                 }}>
              <Lock size={15} style={{ color: focusPass ? '#0687D8' : '#94A3B8', flexShrink: 0, transition: 'color 0.2s' }} />
              <input
                type={verPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                required
                autoComplete="current-password"
                placeholder="Contraseña"
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder-slate-300"
                style={{ color: '#1E2D3D' }}
              />
              <button
                type="button"
                onClick={() => setVerPass(!verPass)}
                className="transition-colors"
                style={{ color: '#94A3B8' }}
              >
                {verPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Olvidé contraseña */}
          <div className="flex justify-end px-1">
            <a href="/auth/recuperar"
               className="text-xs transition-opacity hover:opacity-70"
               style={{ color: '#0687D8' }}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-center"
                 style={{
                   background: '#FEF2F2',
                   border: '1px solid #FECACA',
                   color: '#DC2626'
                 }}>
              {error}
            </div>
          )}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer px-1">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={aceptoTerminos}
                onChange={e => setAcepto(e.target.checked)}
                className="sr-only"
              />
              <div className="w-4 h-4 rounded transition-all flex items-center justify-center"
                   style={{
                     background: aceptoTerminos ? '#0687D8' : '#fff',
                     border: aceptoTerminos ? '1px solid #0687D8' : '1px solid #CBD5E1',
                     boxShadow: aceptoTerminos ? '0 0 0 3px rgba(6,135,216,0.15)' : 'none'
                   }}>
                {aceptoTerminos && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
              He leído y acepto la{' '}
              <a
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ color: '#0687D8' }}
                className="underline hover:opacity-70 transition-opacity"
              >
                Política de Privacidad
              </a>
            </span>
          </label>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !aceptoTerminos}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium tracking-wider uppercase transition-all"
            style={{
              background: loading || !aceptoTerminos
                ? '#93C5E8'
                : 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)',
              color: '#fff',
              boxShadow: loading || !aceptoTerminos
                ? 'none'
                : '0 4px 16px rgba(6,135,216,0.35), 0 1px 4px rgba(0,0,0,0.08)',
              cursor: loading || !aceptoTerminos ? 'not-allowed' : 'pointer'
            }}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Entrando…</>
              : 'Iniciar sesión'
            }
          </button>
        </form>

        {/* Registro */}
        <p className="text-center text-xs mt-6" style={{ color: '#94A3B8' }}>
          ¿No tienes cuenta?{' '}
          <a href="/auth/registro"
             className="font-medium hover:opacity-70 transition-opacity"
             style={{ color: '#0687D8' }}>
            Regístrate gratis
          </a>
        </p>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-10 text-xs" style={{ color: '#B8C5D6' }}>
        Miniapps © 2026 · JakoSoft
      </p>
    </div>
  )
}
