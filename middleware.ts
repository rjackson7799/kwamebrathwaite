import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { locales, defaultLocale } from './i18n/request'

// Create the intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

// Strip a leading locale segment so subsequent guards only see canonical paths.
// '/fr/founders/portal/x' → '/founders/portal/x', '/admin' → '/admin'.
function stripLocale(pathname: string) {
  const seg = pathname.split('/')[1]
  return (locales as readonly string[]).includes(seg)
    ? '/' + pathname.split('/').slice(2).join('/')
    : pathname
}

async function isAdminUid(supabase: SupabaseClient, uid: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('is_admin', { uid })
  if (error) {
    console.error('is_admin RPC failed in middleware:', error)
    return false
  }
  return data === true
}

export async function middleware(request: NextRequest) {
  const pathname = stripLocale(request.nextUrl.pathname)

  // Protect admin API routes (defense-in-depth; individual routes also call requireAdmin)
  if (pathname.startsWith('/api/admin')) {
    // Allow the auth endpoints themselves (login/logout/session)
    if (pathname.startsWith('/api/admin/auth/')) {
      return NextResponse.next()
    }

    const response = NextResponse.next({ request: { headers: request.headers } })
    const supabase = createSupabaseMiddlewareClient(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    if (!(await isAdminUid(supabase, user.id))) {
      // Belt-and-braces: clear the session so this user cannot continue
      // hitting admin endpoints with a non-admin token.
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }
    return response
  }

  // Handle admin page routes - check authentication AND admin membership.
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next()
    }

    const response = NextResponse.next({ request: { headers: request.headers } })
    const supabase = createSupabaseMiddlewareClient(request, response)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    if (!(await isAdminUid(supabase, user.id))) {
      await supabase.auth.signOut()
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('reason', 'not_admin')
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // Handle public routes with i18n
  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except for:
  // - Public API routes (we explicitly include /api/admin below)
  // - Static files (_next/static, _next/image, favicon.ico, etc.)
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    '/api/admin/:path*',
  ],
}
