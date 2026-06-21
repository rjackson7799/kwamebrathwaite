import { NextRequest, NextResponse } from 'next/server'
import {
  resolveFounderInviteToken,
  generateFounderMagicLink,
} from '@/lib/auth/founders-admin'
import { foundersPath } from '@/lib/auth/founders'

// POST /founders/invite/[token]/confirm
//
// The credential-bearing half of the durable-link bridge. Reached only by an
// explicit human form submit from the confirmation page (page.tsx), so email
// scanners that follow GET links never get here.
//
// Flow:
//   1. Re-validate the durable token (never trust that the GET validated).
//   2. Mint a FRESH Supabase magic link (its own 24h window starts now).
//   3. Redirect into the existing /founders/auth/callback, which does verifyOtp,
//      the founders-table membership check, and status-based routing — so no auth
//      logic is duplicated here.
//
// Both responses set Cache-Control: no-store and Referrer-Policy: no-referrer so
// the inner Supabase token can't be cached, replayed, or leaked via Referer.
// (middleware.ts also sets these for /founders/invite/* — belt-and-braces.)
interface RouteParams {
  params: Promise<{ locale: string; token: string }>
}

function harden(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  res.headers.set('Referrer-Policy', 'no-referrer')
  return res
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { locale, token } = await params
  const origin = request.nextUrl.origin

  const loginUrl = new URL(
    `${foundersPath(locale, '/founders/login')}?reason=expired`,
    origin
  )

  let resolution
  try {
    resolution = await resolveFounderInviteToken(token)
  } catch (err) {
    console.error('founders invite confirm: resolve failed', err)
    return harden(NextResponse.redirect(loginUrl))
  }

  if (!resolution.ok) {
    return harden(NextResponse.redirect(loginUrl))
  }

  try {
    const magicUrl = await generateFounderMagicLink(
      resolution.founder.email,
      resolution.founder.preferred_locale || 'en'
    )
    return harden(NextResponse.redirect(new URL(magicUrl)))
  } catch (err) {
    console.error('founders invite confirm: magic link mint failed', err)
    return harden(NextResponse.redirect(loginUrl))
  }
}
