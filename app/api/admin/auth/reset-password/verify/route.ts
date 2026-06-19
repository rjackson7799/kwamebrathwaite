import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

// POST /api/admin/auth/reset-password/verify
//
// Step 1 of the admin password reset. Verifies the recovery token from the
// emailed link and, on success, establishes a short-lived recovery session
// (cookies) used by the subsequent password update. The token is consumed
// here (one-time use) — it never lives in client JS.
//
// Body: { token_hash: string }
// Returns: { success: true, data: { email } } | error
//
// Mirrors the Founders Circle callback's server-side verifyOtp cookie wiring
// (app/[locale]/founders/auth/callback/route.ts). Confirms the verified user
// is an admin; signs out + 403 otherwise so a non-admin recovery link (should
// never happen — only admins are emailed) can't yield a usable session.

const verifySchema = z.object({
  token_hash: z.string().min(1),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing token' } },
      { status: 400 }
    )
  }

  // Collect any cookies Supabase wants to set (the recovery session, or the
  // sign-out clearing cookies) and apply them to whichever response we return.
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push({ name, value, options: options as Record<string, unknown> })
          )
        },
      },
    }
  )

  const applyCookies = (res: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.cookies.set(name, value, options as any)
    )
    return res
  }

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: 'recovery',
  })

  if (verifyError || !verifyData?.user) {
    console.error('admin reset-password verify failed:', verifyError)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'This reset link is invalid or has expired.',
        },
      },
      { status: 400 }
    )
  }

  // Confirm the verified user is an admin. Belt-and-braces: only admins are
  // emailed reset links, but never trust a recovery session that isn't one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: isAdmin, error: rpcError } = await (supabase as any).rpc(
    'is_admin',
    { uid: verifyData.user.id }
  )

  if (rpcError || !isAdmin) {
    await supabase.auth.signOut()
    return applyCookies(
      NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'This account does not have admin access.' },
        },
        { status: 403 }
      )
    )
  }

  return applyCookies(
    NextResponse.json(
      { success: true, data: { email: verifyData.user.email } },
      { status: 200 }
    )
  )
}
