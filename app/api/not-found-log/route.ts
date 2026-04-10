import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit, getClientIP } from '@/lib/api/rate-limit'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

// Public endpoint. Called from the NotFoundLogger client component on the
// branded 404 page. Fire-and-forget — the client doesn't care about the
// response. We still rate-limit per IP so a misbehaving bot can't flood the
// table.
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const { success } = rateLimit(`nf-log:${ip}`, 30, 60_000)
  if (!success) {
    return errorResponse(ErrorCodes.RATE_LIMIT, 'Too many requests', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  if (!body || typeof body !== 'object') {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid body', 400)
  }

  const raw = body as Record<string, unknown>
  const path = typeof raw.path === 'string' ? raw.path.slice(0, 2000) : null
  const referrer =
    typeof raw.referrer === 'string' && raw.referrer.length > 0
      ? raw.referrer.slice(0, 2000)
      : null
  const locale =
    typeof raw.locale === 'string' && raw.locale.length > 0
      ? raw.locale.slice(0, 5)
      : null

  if (!path) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing path', 400)
  }

  const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null
  const country = request.headers.get('x-vercel-ip-country')?.slice(0, 2) || null

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('not_found_log').insert({
      path,
      referrer,
      user_agent: userAgent,
      locale,
      country,
    })

    if (error) {
      console.error('not_found_log insert failed:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to log', 500)
    }

    return successResponse({ logged: true })
  } catch (err) {
    console.error('not_found_log unexpected error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
