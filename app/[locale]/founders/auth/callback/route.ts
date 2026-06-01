import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

// GET /founders/auth/callback?token_hash=...&type=email&next=/founders/portal
// (Supabase's generateLink with type='magiclink' produces a URL that hits
//  this callback with token_hash and type=email or type=magiclink.)
//
// Flow:
//   1. Validate query params (must have token_hash + type).
//   2. supabase.auth.verifyOtp({ token_hash, type }) — sets the session
//      cookie via the SSR client.
//   3. Verify the now-signed-in user is in the `founders` table. If NOT,
//      sign back out and bounce to /founders/login?reason=not_invited so a
//      non-Founder can't sit in an authenticated state.
//   4. Record last_login_at (non-fatal). Activation to 'active' is NOT done
//      here — it's a deliberate admin step after the donation is confirmed.
//   5. Redirect by status: active -> portal; invited -> invitation page
//      (review + donate); paused/declined -> invitation page's closed state;
//      archived -> signed out above.
//
// On any failure, redirect to /founders/login with a `reason` query param
// rather than throwing — the brief's audience (infrequent users) shouldn't
// see raw error pages.
export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = request.nextUrl

  // Locale prefix from the request path so the redirect stays in-locale
  // (e.g. /fr/founders/auth/callback → redirects to /fr/founders/...)
  const localePrefixMatch = pathname.match(/^\/(fr|ja)\//)
  const localePrefix = localePrefixMatch ? `/${localePrefixMatch[1]}` : ''

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'email' | 'magiclink' | 'recovery' | null
  const errParam = searchParams.get('error_description')

  // Supabase sometimes appends ?error_description=... when the link itself
  // is malformed before we ever get to verifyOtp.
  if (errParam) {
    console.error('founders auth callback received error param:', errParam)
    return NextResponse.redirect(
      new URL(`${localePrefix}/founders/login?reason=expired`, origin)
    )
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL(`${localePrefix}/founders/login?reason=missing_token`, origin)
    )
  }

  // SSR client bound to this request's cookies so verifyOtp can write the
  // session cookie on the response.
  const response = NextResponse.redirect(
    new URL(`${localePrefix}/founders/portal`, origin)
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

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type === 'magiclink' ? 'magiclink' : 'email',
  })

  if (verifyError || !verifyData?.user) {
    console.error('founders auth callback verifyOtp failed:', verifyError)
    return NextResponse.redirect(
      new URL(`${localePrefix}/founders/login?reason=expired`, origin)
    )
  }

  const userId = verifyData.user.id

  // Founder membership check — service-role to bypass RLS while we still
  // confirm the row before "trusting" this session.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminSupabase = createAdminClient() as any
  const { data: founder, error: lookupError } = await adminSupabase
    .from('founders')
    .select('user_id, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (lookupError) {
    console.error('founders auth callback membership lookup failed:', lookupError)
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL(`${localePrefix}/founders/login?reason=server_error`, origin)
    )
  }

  if (!founder) {
    // Authenticated, but NOT a Founder — sign them out so they can't sit at
    // a half-authenticated state, then bounce.
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL(`${localePrefix}/founders/login?reason=not_invited`, origin)
    )
  }

  if (founder.status === 'archived') {
    // Access was revoked; closed-door state.
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL(`${localePrefix}/founders/login?reason=revoked`, origin)
    )
  }

  // Record the sign-in. Non-fatal: a failed timestamp write must not block a
  // successful login (the session is already valid).
  const now = new Date().toISOString()
  const { error: loginStampError } = await adminSupabase
    .from('founders')
    .update({ last_login_at: now })
    .eq('user_id', userId)
  if (loginStampError) {
    console.warn('founders auth callback: last_login_at update failed', loginStampError)
  }

  // Route by status. Activation (invited -> active) is a deliberate admin step
  // after the donation, so an invited member lands on the invitation page to
  // review terms + donate rather than the portal. paused/declined also land on
  // the invitation page, which renders the "no longer active" state.
  const dest =
    founder.status === 'active'
      ? `${localePrefix}/founders/portal`
      : `${localePrefix}/founders/invitation`
  response.headers.set('location', new URL(dest, origin).toString())
  return response
}
