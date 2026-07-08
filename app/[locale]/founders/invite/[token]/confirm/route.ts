import { NextRequest, NextResponse } from 'next/server'
import {
  resolveFounderInviteToken,
  generateFounderMagicLink,
} from '@/lib/auth/founders-admin'
import { foundersPath } from '@/lib/auth/founders'
import { rateLimitPersistent, getClientIP } from '@/lib/api'

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

// Redirect with 303 See Other so the browser switches to GET when following.
// This is a POST handler; the targets (the GET-only magic-link callback and the
// login page) would 405 under the default 307, which preserves the method —
// that's the Post/Redirect/Get rule. Also harden the credential-bearing hop
// against caching and Referer leakage.
function redirectGet(url: URL): NextResponse {
  const res = NextResponse.redirect(url, 303)
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

  // Per-IP throttle on magic-link minting. The GET page is deliberately NOT
  // rate-limited (a false positive there would lock out the members this
  // bridge exists to help); token brute force is infeasible regardless
  // (256-bit tokens, unique hash index).
  const ipLimit = await rateLimitPersistent(
    'founder_invite_confirm',
    `ip:${getClientIP(request)}`,
    10,
    60 * 1000 // 10 per minute per IP
  )
  if (!ipLimit.success) {
    const rateLimitedUrl = new URL(
      `${foundersPath(locale, '/founders/login')}?reason=rate_limited`,
      origin
    )
    return redirectGet(rateLimitedUrl)
  }

  let resolution
  try {
    resolution = await resolveFounderInviteToken(token)
  } catch (err) {
    console.error('founders invite confirm: resolve failed', err)
    return redirectGet(loginUrl)
  }

  if (!resolution.ok) {
    return redirectGet(loginUrl)
  }

  try {
    const magicUrl = await generateFounderMagicLink(
      resolution.founder.email,
      resolution.founder.preferred_locale || 'en'
    )
    // Re-base the callback onto the origin the founder is actually browsing
    // (e.g. www vs apex). generateFounderMagicLink builds an absolute URL from
    // the canonical siteUrl(), which can differ from the request host — and a
    // cross-origin redirect after this POST trips the `form-action 'self'` CSP
    // (next.config.mjs). The token is verified host-independently in the
    // callback, so only the path + query matter.
    const minted = new URL(magicUrl)
    const sameOrigin = new URL(minted.pathname + minted.search, origin)
    return redirectGet(sameOrigin)
  } catch (err) {
    console.error('founders invite confirm: magic link mint failed', err)
    return redirectGet(loginUrl)
  }
}
