import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'bella_session'

/**
 * Cheap edge guard: bounces requests with no session cookie away from the app
 * area before they hit the server components. The real check (session validity,
 * membership, permissions) always runs server-side.
 */
const PROTECTED_PREFIXES = [
  '/painel',
  '/agenda',
  '/clientes',
  '/profissionais',
  '/servicos',
  '/produtos',
  '/estoque',
  '/vendas',
  '/caixa',
  '/financeiro',
  '/comissoes',
  '/marketing',
  '/whatsapp',
  '/fidelidade',
  '/relatorios',
  '/bella-ia',
  '/configuracoes',
  '/onboarding',
  '/notificacoes',
  '/conta',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (!isProtected) return NextResponse.next()

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest).*)'],
}
