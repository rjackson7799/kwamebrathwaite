// Cloudflare Turnstile — server half. The client half is
// components/ui/TurnstileField.tsx. Both keys must be set for verification to
// run: a secret without the site key means no widget renders, so every real
// visitor would be refused; a site key without the secret means tokens are
// minted but never checked. Either half-config is logged loudly on every
// submission (see HonuVault patterns/captcha-both-halves.md).

import { errorResponse, ErrorCodes } from './response'
import { getClientIP } from './rate-limit'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 5000

export type TurnstileMode = 'off' | 'on' | 'misconfigured'

type Env = Record<string, string | undefined>

export function turnstileMode(env: Env = process.env): TurnstileMode {
  const hasSecret = Boolean(env.TURNSTILE_SECRET_KEY)
  const hasSiteKey = Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  if (hasSecret && hasSiteKey) return 'on'
  if (!hasSecret && !hasSiteKey) return 'off'
  return 'misconfigured'
}

export interface TurnstileResult {
  ok: boolean
  reason?: string
}

export async function verifyTurnstile(
  token: unknown,
  ip: string | null,
  opts: { env?: Env; fetchImpl?: typeof fetch } = {}
): Promise<TurnstileResult> {
  const env = opts.env ?? process.env
  const fetchImpl = opts.fetchImpl ?? fetch
  const mode = turnstileMode(env)

  if (mode === 'off') return { ok: true, reason: 'disabled' }
  if (mode === 'misconfigured') {
    console.error(
      'Turnstile MISCONFIGURED: set both TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY (or neither). Submissions are NOT being checked.'
    )
    return { ok: true, reason: 'misconfigured' }
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: 'missing_token' }
  }

  const form = new URLSearchParams()
  form.set('secret', env.TURNSTILE_SECRET_KEY as string)
  form.set('response', token)
  if (ip && ip !== 'unknown') form.set('remoteip', ip)

  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`)
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (data.success === true) return { ok: true }
    return { ok: false, reason: (data['error-codes'] || []).join(',') || 'rejected' }
  } catch (err) {
    // Cloudflare unreachable: let the submission through rather than lose a
    // real lead. Spam scoring still runs on the inquiry routes.
    console.error('Turnstile siteverify unavailable; allowing request:', err)
    return { ok: true, reason: 'verify_unavailable' }
  }
}

/**
 * Route guard. Reads `turnstileToken` from the parsed JSON body (it isn't part
 * of the Zod schemas, which strip unknown keys). Returns a 403 response to send
 * back, or null when the request may proceed.
 */
export async function requireTurnstile(body: unknown, request: Request) {
  const token =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).turnstileToken
      : undefined
  const result = await verifyTurnstile(token, getClientIP(request))
  if (result.ok) return null
  console.warn('Turnstile rejected submission:', {
    path: new URL(request.url).pathname,
    reason: result.reason,
  })
  return errorResponse(
    ErrorCodes.CAPTCHA_FAILED,
    'Security check failed. Please try again.',
    403
  )
}
