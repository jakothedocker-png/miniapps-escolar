export const metadata = {
  title: 'Política de Privacidad — Miniapps Escolar',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F5F8FF' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-wide" style={{ color: '#1E2D3D' }}>
            Política de Privacidad y Términos de Uso
          </h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            Miniapps Escolar — vigente desde el ciclo escolar 2025–2026
          </p>
        </div>

        <Section titulo="1. Responsable del tratamiento de datos">
          <p>
            La presente plataforma es desarrollada y administrada por <strong>Miniapps (JakoSoft)</strong>,
            en cumplimiento de la <em>Ley Federal de Protección de Datos Personales en Posesión de
            los Particulares</em> (LFPDPPP) y demás normativa aplicable.
          </p>
          <p>
            Para consultas relacionadas con esta política:{' '}
            <a
              href="https://wa.me/5272222478493"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0687D8' }}
              className="underline hover:opacity-70 transition-opacity"
            >
              Soporte vía WhatsApp
            </a>
          </p>
        </Section>

        <Section titulo="2. Datos que se recopilan">
          <p>La plataforma recopila únicamente los datos necesarios para la gestión escolar interna:</p>
          <ul className="list-disc list-inside space-y-1" style={{ color: '#64748B' }}>
            <li><strong style={{ color: '#1E2D3D' }}>Datos de alumnos:</strong> nombre completo, CURP, grado, grupo, escuela y calificaciones por periodo</li>
            <li><strong style={{ color: '#1E2D3D' }}>Datos de usuarios:</strong> nombre, correo electrónico, rol y CCT de la escuela asignada</li>
            <li><strong style={{ color: '#1E2D3D' }}>Registros de actividad:</strong> cambios en calificaciones, altas y bajas de alumnos, accesos al sistema</li>
          </ul>
        </Section>

        <Section titulo="3. Finalidad del tratamiento">
          <p>Los datos tienen una <strong>finalidad exclusivamente interna</strong> y se utilizan para:</p>
          <ul className="list-disc list-inside space-y-1" style={{ color: '#64748B' }}>
            <li>Gestión y seguimiento de calificaciones por periodo</li>
            <li>Generación de reportes y boletas de evaluación</li>
            <li>Análisis de aprovechamiento escolar</li>
            <li>Control de movimientos de alumnos</li>
            <li>Auditoría de cambios realizados por usuarios</li>
          </ul>
          <Alerta>
            Los datos <strong>no serán compartidos, vendidos, cedidos ni transferidos a terceros</strong> bajo
            ninguna circunstancia, salvo requerimiento expreso de autoridad competente.
          </Alerta>
        </Section>

        <Section titulo="4. Almacenamiento y seguridad">
          <p>
            Los datos se almacenan en <strong>Supabase</strong> (PostgreSQL), plataforma con
            certificaciones internacionales de seguridad. La plataforma implementa:
          </p>
          <ul className="list-disc list-inside space-y-1" style={{ color: '#64748B' }}>
            <li>Cifrado en tránsito mediante HTTPS/TLS</li>
            <li>Cifrado en reposo automático</li>
            <li>Autenticación segura con correo y contraseña</li>
            <li>Control de acceso por roles (supervisor, director, docente)</li>
            <li>Reglas de seguridad en base de datos (RLS): operaciones sensibles validadas en servidor</li>
          </ul>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            Los servidores de Supabase operan en infraestructura de AWS, que puede incluir centros
            de datos fuera de México, en cumplimiento con estándares de seguridad internacionales.
          </p>
        </Section>

        <Section titulo="5. Uso de Inteligencia Artificial (IA)">
          <p>
            Esta plataforma incorpora un módulo opcional de generación de observaciones con IA,
            utilizando el modelo <strong>Claude Sonnet de Anthropic</strong>. Al activar esta función:
          </p>
          <ul className="list-disc list-inside space-y-1" style={{ color: '#64748B' }}>
            <li>El sistema envía a Anthropic únicamente el campo formativo, la calificación y la descripción opcional del docente</li>
            <li><strong style={{ color: '#1E2D3D' }}>No se envían datos de identificación del alumno</strong> (nombre, CURP u otros)</li>
            <li>Anthropic no almacena estos datos ni los usa para entrenamiento sin consentimiento</li>
            <li>El uso de este módulo es <strong style={{ color: '#1E2D3D' }}>voluntario</strong></li>
          </ul>
          <Alerta>
            El docente es responsable de revisar, validar y modificar el texto generado antes de guardarlo.
            La plataforma no garantiza la exactitud ni idoneidad del contenido producido por la IA.
          </Alerta>
        </Section>

        <Section titulo="6. Responsabilidad sobre los datos">
          <p>Cada usuario es responsable de la veracidad y exactitud de los datos que registra. Los administradores de la plataforma no se hacen responsables por datos falsos, alterados o incorrectos.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(6,135,216,0.12)' }}>
              <thead>
                <tr style={{ background: '#F8FAFF', borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Escenario</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Docente captura calificación incorrecta', 'El docente'],
                  ['Director registra alumno con datos erróneos', 'El director'],
                  ['Usuario modifica datos sin autorización', 'El usuario (queda en auditoría)'],
                  ['La plataforma muestra lo que el usuario capturó', 'El usuario que capturó'],
                  ['Falla de infraestructura de Supabase / AWS', 'Proveedor (fuerza mayor)'],
                ].map(([esc, resp], idx) => (
                  <tr key={esc}
                    style={{ borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td className="px-4 py-2.5" style={{ color: '#64748B' }}>{esc}</td>
                    <td className="px-4 py-2.5" style={{ color: '#64748B' }}>{resp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section titulo="7. Derechos ARCO">
          <p>
            En cumplimiento de la LFPDPPP, los usuarios tienen derecho a <strong>Acceder, Rectificar,
            Cancelar u Oponerse</strong> al tratamiento de sus datos personales. Para ejercer estos
            derechos, comuníquese con soporte a través de{' '}
            <a
              href="https://wa.me/5272222478493"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0687D8' }}
              className="underline hover:opacity-70 transition-opacity"
            >
              WhatsApp
            </a>.
          </p>
        </Section>

        <Section titulo="8. Modificaciones a esta política">
          <p>
            Esta política podrá actualizarse cuando sea necesario. Los cambios serán notificados
            a través de la propia plataforma. El uso continuado del sistema implica la aceptación
            de la versión vigente.
          </p>
        </Section>

        <Section titulo="9. Aceptación">
          <p>
            Al ingresar a <strong>Miniapps Escolar</strong>, el usuario declara haber leído, comprendido
            y aceptado la presente Política de Privacidad y Términos de Uso.
          </p>
        </Section>

        <div className="pt-8 text-center text-xs"
          style={{ borderTop: '1px solid rgba(6,135,216,0.10)', color: '#CBD5E1' }}>
          Miniapps Escolar · JakoSoft © 2026 · Versión 2.0
        </div>
      </div>
    </div>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold pb-2"
        style={{ color: '#1E2D3D', borderBottom: '1px solid rgba(6,135,216,0.10)' }}>
        {titulo}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#64748B' }}>{children}</div>
    </section>
  )
}

function Alerta({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 rounded-xl text-sm"
      style={{ background: '#FFFBEB', border: '1px solid rgba(180,83,9,0.20)', color: '#92400E' }}>
      {children}
    </div>
  )
}
