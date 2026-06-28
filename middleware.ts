import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const RUTAS_PUBLICAS = ['/auth/login', '/auth/recuperar', '/auth/callback', '/auth/registro']

const DESTINOS_POR_ROL: Record<string, string> = {
  superadmin: '/dev/dashboard',
  supervisor: '/supervisor/dashboard',
  director:   '/director/escuela',
  maestro:    '/app/dashboard',
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const esPublica = RUTAS_PUBLICAS.some(r => pathname.startsWith(r))

  // Sin sesión → login
  if (!user && !esPublica) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Con sesión en login → redirigir a su dashboard
  if (user && pathname === '/auth/login') {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    const destino = DESTINOS_POR_ROL[usuario?.rol ?? ''] ?? '/app/dashboard'
    return NextResponse.redirect(new URL(destino, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
