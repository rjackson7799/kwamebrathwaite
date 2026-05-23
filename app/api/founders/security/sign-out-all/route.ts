import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// POST /api/founders/security/sign-out-all
// Signs the user out globally (every device, every browser) and ends
// THIS browser's session as well. Redirects to /founders/login.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL('/founders/login?reason=signed_out_all', request.url),
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

  // 'global' scope revokes every refresh token for this user, then clears
  // the local cookie too.
  await supabase.auth.signOut({ scope: 'global' })
  return response
}
