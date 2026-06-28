import Link from 'next/link'
import { GraduationCap, Check, Zap } from 'lucide-react'

interface Plan {
  nombre: string
  precio: string
  periodo: string
  descripcion: string
  features: string[]
  destacado: boolean
}

const PLANES: Plan[] = [
  {
    nombre: 'Tercer Trimestre',
    precio: '$69',
    periodo: 'MXN · pago único',
    descripcion: '1 trimestre de acceso completo',
    features: [
      'Generación de observaciones con IA ilimitada',
      'Hasta 50 alumnos',
      'Boletas en PDF',
      'Soporte por WhatsApp',
    ],
    destacado: false,
  },
  {
    nombre: 'Ciclo Completo',
    precio: '$250',
    periodo: 'MXN · ciclo escolar',
    descripcion: 'Ciclo escolar completo 2025-2026',
    features: [
      'Generación de observaciones con IA ilimitada',
      'Hasta 50 alumnos',
      'Boletas en PDF',
      'Los 3 trimestres incluidos',
      'Soporte prioritario por WhatsApp',
    ],
    destacado: true,
  },
]

export default function UpgradePage() {
  const buildWaLink = (planNombre: string) => {
    const msg = encodeURIComponent(
      `Hola, quiero activar el plan ${planNombre} para mi cuenta de Miniapps Escolar.`
    )
    return `https://wa.me/5272222478493?text=${msg}`
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(150deg, #EEF4FC 0%, #F5F8FF 50%, #EAF0FA 100%)' }}>
      {/* Header */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-2"
          style={{ background: 'linear-gradient(135deg, #0687D8 0%, #3B5BDB 100%)' }}>
          <GraduationCap size={28} />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#1E2D3D' }}>Elige tu plan</h1>
        <p className="max-w-sm mx-auto" style={{ color: '#64748B' }}>
          Accede a la generación de observaciones con IA y todas las funciones de Miniapps Escolar.
        </p>
      </div>

      {/* Cards de planes */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {PLANES.map((plan) => (
          <div
            key={plan.nombre}
            className="flex-1 rounded-2xl p-6 space-y-5"
            style={plan.destacado ? {
              background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)',
              border: '1px solid rgba(6,135,216,0.40)',
              boxShadow: '0 8px 32px rgba(6,135,216,0.35)',
            } : {
              background: '#FFFFFF',
              border: '1px solid rgba(6,135,216,0.12)',
              boxShadow: '0 4px 24px rgba(30,45,61,0.08)',
            }}
          >
            {/* Badge destacado */}
            {plan.destacado && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.20)', color: '#fff' }}>
                <Zap size={12} />
                Más popular
              </div>
            )}

            {/* Precio */}
            <div>
              <p className="text-sm font-medium" style={{ color: plan.destacado ? 'rgba(255,255,255,0.80)' : '#64748B' }}>
                {plan.nombre}
              </p>
              <p className="text-4xl font-bold mt-1" style={{ color: plan.destacado ? '#fff' : '#1E2D3D' }}>
                {plan.precio}
              </p>
              <p className="text-xs mt-0.5" style={{ color: plan.destacado ? 'rgba(255,255,255,0.70)' : '#94A3B8' }}>
                {plan.periodo}
              </p>
            </div>

            <p className="text-sm" style={{ color: plan.destacado ? 'rgba(255,255,255,0.85)' : '#64748B' }}>
              {plan.descripcion}
            </p>

            {/* Features */}
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check
                    size={16}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: plan.destacado ? 'rgba(255,255,255,0.80)' : '#0687D8' }}
                  />
                  <span style={{ color: plan.destacado ? 'rgba(255,255,255,0.85)' : '#64748B' }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href={buildWaLink(plan.nombre)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold text-sm transition"
              style={plan.destacado ? {
                background: '#fff',
                color: '#0687D8',
              } : {
                background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(6,135,216,0.30)',
              }}
            >
              Obtener este plan
            </a>
          </div>
        ))}
      </div>

      {/* Nota */}
      <div className="mt-8 max-w-md text-center space-y-2">
        <p className="text-sm" style={{ color: '#64748B' }}>
          El pago se coordina directamente con el equipo de Miniapps.
          Una vez confirmado, tu acceso se activa en minutos.
        </p>
        <Link href="/auth/login" className="text-sm transition-colors" style={{ color: '#0687D8' }}>
          Volver al inicio de sesión
        </Link>
      </div>

      <p className="mt-8 text-xs" style={{ color: '#C0CEDD' }}>
        Miniapps Escolar · Desarrollado por JakoSoft © 2026
      </p>
    </div>
  )
}
