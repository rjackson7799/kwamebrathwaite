/**
 * Vercel Cron entry point for founder invitations that were never accepted.
 *
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>`. Schedule lives
 * in vercel.json.
 *
 * Conservative behavior — does NOT delete. Surfaces a count of founder rows
 * that have been in status='invited' for more than 30 days (no activated_at).
 * The team can then decide case-by-case whether to follow up, resend, or
 * archive them; we don't want a cron silently dropping invitations that the
 * stewardship team might still be cultivating.
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

const STALE_AFTER_DAYS = 30

export const maxDuration = 60

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}

async function handle(request: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'CRON_SECRET is not configured',
      500
    )
  }
  const auth = request.headers.get('authorization') || ''
  const got = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null
  if (got !== expected) {
    return errorResponse('UNAUTHORIZED', 'Invalid cron secret', 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const cutoffIso = new Date(
    Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  try {
    const { data, error, count } = await supabase
      .from('founders')
      .select('user_id, email, full_name, invited_at', { count: 'exact' })
      .eq('status', 'invited')
      .is('activated_at', null)
      .lt('invited_at', cutoffIso)

    if (error) {
      console.error('founders-stale-invites query error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Query failed', 500)
    }

    const total = count ?? (Array.isArray(data) ? data.length : 0)
    console.log(`founders-stale-invites: ${total} invitations older than ${STALE_AFTER_DAYS} days`)
    return successResponse({ stale_count: total, stale_after_days: STALE_AFTER_DAYS, cutoff: cutoffIso, examples: (data ?? []).slice(0, 10) })
  } catch (err) {
    console.error('founders-stale-invites unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
