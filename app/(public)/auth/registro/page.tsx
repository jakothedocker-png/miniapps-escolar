'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { registrarMaestro } from '@/app/actions/registro'
import {
  GraduationCap, Loader2, Search, CheckCircle2,
  PlusCircle, ChevronRight, ChevronLeft, Eye, EyeOff, Mail, Lock, User,
} from 'lucide-react'

interface EscuelaResultado {
  id: string
  nombre: string
  cct: string
  municipio: string | null
}

type Paso = 1 | 2 | 3

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [paso, setPaso] = useState<Paso>(1)

  const [nombre,   setNombre]   = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [verPass,  setVerPass]  = useState(false)

  const [cct,            setCct]            = useState('')
  const [buscando,       setBuscando]       = useState(false)
  const [resultados,     setResultados]     = useState<EscuelaResultado[]>([])
  const [escuelaElegida, setEscuelaElegida] = useState<EscuelaResultado | null>(null)
  const [modoManual,     setModoManual]     = useState(false)
  const [escuelaNombre,  setEscuelaNombre]  = useState('')
  const [municipio,      setMunicipio]      = useState('')

  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const buscarEscuela = useCallback(async (valor: string) => {
    if (valor.length < 4) { setResultados([]); return }
    setBuscando(true)
    try {
      const res = await fetch(`/api/escuelas/buscar?cct=${encodeURIComponent(valor)}`)
      const data = await res.json()
      setResultados(data)
    } finally {
      setBuscando(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscarEscuela(cct), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cct, buscarEscuela])

  function elegirEscuela(e: EscuelaResultado) {
    setEscuelaElegida(e); setModoManual(false); setResultados([])
  }

  function activarModoManual() {
    setEscuelaElegida(null); setModoManual(true); setEscuelaNombre(''); setMunicipio('')
  }

  function validarPaso1() {
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      setError('Completa todos los campos. La contraseña debe tener al menos 6 caracteres.')
      return false
    }
    setError(null); return true
  }

  function validarPaso2() {
    if (!escuelaElegida && !modoManual) {
      setError('Busca y selecciona tu escuela, o regístrala manualmente.')
      return false
    }
    if (modoManual && (!cct.trim() || !escuelaNombre.trim())) {
      setError('Ingresa el CCT y nombre de tu escuela.')
      return false
    }
    setError(null); return true
  }

  async function handleSubmit() {
    if (!validarPaso2()) return
    setLoading(true); setError(null)

    const resultado = await registrarMaestro({
      nombre,
      email,
      password,
      cct:            escuelaElegida?.cct ?? cct.toUpperCase(),
      escuela_nombre: escuelaElegida?.nombre ?? escuelaNombre,
      municipio:      escuelaElegida?.municipio ?? municipio,
      escuela_id:     escuelaElegida?.id ?? null,
    })

    if (resultado.error) { setError(resultado.error); setLoading(false); return }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { router.push('/auth/login?registered=1'); return }
    router.push('/app/dashboard')
  }

  const inputStyle = {
    background: '#fff',
    border: '1px solid #E2E8F0',
    color: '#1E2D3D',
    fontSize: '0.875rem',
  }

  const inputClass = 'flex-1 bg-transparent text-sm focus:outline-none'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(150deg, #EEF4FC 0%, #F5F8FF 50%, #EAF0FA 100%)' }}>

      <div className="w-full max-w-md space-y-5">

        {/* Logo + título */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #3B5BDB 100%)' }}>
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: '#1E2D3D' }}>Crear cuenta</h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#94A3B8' }}>Miniapps Escolar</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 px-2">
          {([1, 2, 3] as Paso[]).map((n, i) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={paso >= n ? {
                  background: '#0687D8',
                  color: '#fff',
                } : {
                  background: '#F1F5F9',
                  color: '#94A3B8',
                  border: '1px solid #E2E8F0',
                }}>
                {paso > n ? <CheckCircle2 size={14} /> : n}
              </div>
              {i < 2 && <div className="flex-1 h-px transition-colors"
                style={{ background: paso > n ? '#0687D8' : '#E2E8F0' }} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
          {paso === 1 ? 'Tus datos' : paso === 2 ? 'Tu escuela' : 'Confirmar registro'}
        </p>

        {/* PASO 1 */}
        {paso === 1 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #E2E8F0' }}>
              <User size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Nombre completo" className={inputClass}
                style={{ ...inputStyle, border: 'none', padding: 0 }} />
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #E2E8F0' }}>
              <Mail size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Correo electrónico" className={inputClass}
                style={{ ...inputStyle, border: 'none', padding: 0 }} />
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Lock size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <input type={verPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)"
                className={inputClass} style={{ ...inputStyle, border: 'none', padding: 0 }} />
              <button type="button" onClick={() => setVerPass(!verPass)}
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#0687D8'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94A3B8'}
              >
                {verPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Search size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
                <input type="text" value={cct}
                  onChange={e => { setCct(e.target.value.toUpperCase()); setEscuelaElegida(null) }}
                  placeholder="CCT de tu escuela (Ej: 15EPR0001A)" maxLength={15}
                  className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: '#1E2D3D' }} />
                {buscando && <Loader2 size={14} className="animate-spin" style={{ color: '#94A3B8' }} />}
              </div>
            </div>

            {resultados.length > 0 && !escuelaElegida && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
                {resultados.map(r => (
                  <button key={r.id} onClick={() => elegirEscuela(r)} type="button"
                    className="w-full px-5 py-3 text-left transition-colors"
                    style={{ borderBottom: '1px solid #E2E8F0' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.05)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <p className="text-sm font-medium" style={{ color: '#1E2D3D' }}>{r.nombre}</p>
                    <p className="text-xs font-mono" style={{ color: '#94A3B8' }}>{r.cct}{r.municipio ? ` · ${r.municipio}` : ''}</p>
                  </button>
                ))}
                <button onClick={activarModoManual} type="button"
                  className="w-full px-5 py-3 text-left transition-colors flex items-center gap-2"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <PlusCircle size={13} style={{ color: '#94A3B8' }} />
                  <span className="text-sm" style={{ color: '#64748B' }}>Mi escuela no aparece, la registro manualmente</span>
                </button>
              </div>
            )}

            {cct.length >= 4 && !buscando && resultados.length === 0 && !escuelaElegida && !modoManual && (
              <button onClick={activarModoManual} type="button"
                className="w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors"
                style={{ border: '1px dashed #E2E8F0', color: '#64748B' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'; (e.currentTarget as HTMLElement).style.color = '#0687D8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}>
                <PlusCircle size={15} />
                No encontramos tu escuela — registrarla manualmente
              </button>
            )}

            {escuelaElegida && (
              <div className="rounded-2xl px-5 py-3 flex items-start gap-3"
                style={{ background: '#EFF9F0', border: '1px solid rgba(6,135,216,0.12)' }}>
                <CheckCircle2 size={16} style={{ color: '#15803D', marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>{escuelaElegida.nombre}</p>
                  <p className="text-xs font-mono" style={{ color: '#64748B' }}>{escuelaElegida.cct}</p>
                </div>
                <button onClick={() => { setEscuelaElegida(null); setResultados([]) }}
                  className="text-xs underline flex-shrink-0" style={{ color: '#64748B' }}>Cambiar</button>
              </div>
            )}

            {modoManual && (
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
                <p className="text-xs font-medium uppercase tracking-widest px-5 pt-3 pb-1" style={{ color: '#94A3B8' }}>Datos de tu escuela</p>
                {[
                  { value: cct, onChange: (v: string) => setCct(v.toUpperCase()), placeholder: 'CCT (Ej: 15EPR0001A)', maxLength: 15 },
                  { value: escuelaNombre, onChange: setEscuelaNombre, placeholder: 'Nombre oficial de la escuela' },
                  { value: municipio, onChange: setMunicipio, placeholder: 'Municipio' },
                ].map((f, i, arr) => (
                  <div key={i} className="px-5 py-3" style={i < arr.length - 1 ? { borderBottom: '1px solid #E2E8F0' } : {}}>
                    <input type="text" value={f.value} onChange={e => f.onChange(e.target.value)}
                      placeholder={f.placeholder} maxLength={f.maxLength}
                      className="w-full bg-transparent text-sm focus:outline-none"
                      style={{ color: '#1E2D3D' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid rgba(6,135,216,0.12)', boxShadow: '0 4px 24px rgba(30,45,61,0.08)' }}>
            {[
              ['Nombre',  nombre],
              ['Email',   email],
              ['Escuela', escuelaElegida?.nombre ?? escuelaNombre],
              ['CCT',     escuelaElegida?.cct ?? cct],
              ['Plan',    'Trial gratuito — Diagnóstico con IA'],
            ].map(([k, v], i, arr) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3"
                style={i < arr.length - 1 ? { borderBottom: '1px solid #E2E8F0' } : {}}>
                <span className="text-sm" style={{ color: '#64748B' }}>{k}</span>
                <span className="text-sm font-medium text-right" style={{ color: '#1E2D3D' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="px-4 py-2.5 rounded-xl text-sm text-center"
            style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.20)', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          {paso > 1 && (
            <button onClick={() => { setPaso(p => (p - 1) as Paso); setError(null) }}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm transition-all"
              style={{ background: '#fff', border: '1px solid #E2E8F0', color: '#64748B' }}>
              <ChevronLeft size={15} /> Atrás
            </button>
          )}
          {paso < 3 ? (
            <button onClick={() => {
              if (paso === 1 && !validarPaso1()) return
              if (paso === 2 && !validarPaso2()) return
              setPaso(p => (p + 1) as Paso)
            }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}>
              Continuar <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creando…</> : 'Crear mi cuenta'}
            </button>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: '#94A3B8' }}>
          ¿Ya tienes cuenta?{' '}
          <a href="/auth/login" className="font-medium transition-colors" style={{ color: '#0687D8' }}>
            Inicia sesión
          </a>
        </p>
      </div>

      <p className="mt-10 text-xs" style={{ color: '#C0CEDD' }}>Miniapps © 2026</p>
    </div>
  )
}
