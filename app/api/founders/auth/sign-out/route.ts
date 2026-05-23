import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// POST /api/founders/auth/sign-out
// Ends the Founder's session and redirects to /founders/login.
// Used by the "Sign out" link in the portal nav. Not gated by the middleware
// portal guard (it lives under /api/founders/auth/* not /founders/portal/*)
// so an already-revoked session can still call it cleanly.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL('/founders/login?reason=signed_out', request.url),
    { status: 303 }
  )

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
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()
  return response
}
