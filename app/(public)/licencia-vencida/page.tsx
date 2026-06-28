import Link from 'next/link'
import { GraduationCap, Clock } from 'lucide-react'

export default function LicenciaVencidaPage() {
  const waLink =
    'https://wa.me/5272222478493?text=Hola%2C%20mi%20licencia%20de%20Miniapps%20Escolar%20ha%20vencido%20y%20necesito%20renovarla.'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(150deg, #EEF4FC 0%, #F5F8FF 50%, #EAF0FA 100%)' }}>
      <div className="w-full max-w-sm rounded-3xl p-8 space-y-6 text-center"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(6,135,216,0.12)',
          boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
        }}>
        {/* Icono */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{ background: '#FFFBEB', color: '#B45309' }}>
            <Clock size={32} />
          </div>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #3B5BDB 100%)' }}>
            <GraduationCap size={24} className="text-white" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>
            Tu acceso ha vencido
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
            Para continuar usando Miniapps Escolar y generar observaciones con IA,
            renueva tu plan.
          </p>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm text-white transition"
            style={{ background: '#16A34A' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12.001 2C6.477 2 2.002 6.476 2.002 12c0 1.872.51 3.627 1.397 5.138L2 22l4.986-1.37A9.962 9.962 0 0 0 12.001 22C17.524 22 22 17.524 22 12S17.524 2 12.001 2zm0 18a7.952 7.952 0 0 1-4.316-1.269l-.309-.185-3.24.892.876-3.176-.202-.326A7.95 7.95 0 0 1 4 12c0-4.411 3.59-8 8.001-8C16.41 4 20 7.589 20 12s-3.59 8-7.999 8zm4.49-5.836c-.246-.123-1.456-.718-1.682-.8-.226-.082-.39-.123-.554.123-.164.246-.636.8-.779.964-.143.163-.287.184-.533.061-.246-.123-1.038-.382-1.977-1.22-.73-.65-1.223-1.452-1.367-1.698-.143-.246-.015-.379.108-.5.11-.11.246-.287.369-.43.123-.143.164-.246.246-.41.082-.163.041-.307-.02-.43-.062-.123-.555-1.337-.76-1.831-.2-.48-.404-.415-.554-.422l-.472-.008c-.164 0-.43.061-.656.307-.226.246-.862.842-.862 2.055 0 1.213.882 2.386 1.005 2.549.123.164 1.735 2.65 4.204 3.716.587.254 1.046.405 1.403.518.59.188 1.127.161 1.55.098.473-.07 1.456-.595 1.661-1.169.205-.574.205-1.066.143-1.17-.062-.1-.226-.163-.472-.287z"/>
            </svg>
            Contactar a soporte
          </a>

          <Link
            href="/upgrade"
            className="flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold text-sm text-white transition"
            style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
          >
            Ver planes disponibles
          </Link>

          <Link
            href="/auth/login"
            className="block text-sm transition-colors"
            style={{ color: '#0687D8' }}
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <p className="mt-8 text-xs" style={{ color: '#C0CEDD' }}>
        Miniapps Escolar · Desarrollado por JakoSoft © 2026
      </p>
    </div>
  )
}
