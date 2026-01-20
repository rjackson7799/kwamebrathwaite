import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { locales, defaultLocale } from './i18n/request'

// Create the intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle admin routes - check authentication
  if (pathname.startsWith('/admin')) {
    // Skip auth check for login page and API routes
    if (pathname === '/admin/login' || pathname.startsWith('/api/')) {
      return NextResponse.next()
    }

    // Create Supabase client for middleware
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
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

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // Handle public routes with i18n
  return intlMiddleware(request)
}

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/...)
  // - Static files (_next/static, _next/image, favicon.ico, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
