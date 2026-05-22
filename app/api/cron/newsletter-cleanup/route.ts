/**
 * Vercel Cron entry point for newsletter pending-row cleanup.
 *
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>`. Schedule lives
 * in vercel.json. Deletes any double opt-in pending rows older than 7 days —
 * these are overwhelmingly bot signups that never clicked the confirm link.
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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
  const got = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : null
  if (got !== expected) {
    return errorResponse('UNAUTHORIZED', 'Invalid cron secret', 401)
  }

  const supabase = createAdminClient()
  const cutoffIso = new Date(Date.now() - PENDING_MAX_AGE_MS).toISOString()

  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .is('confirmed_at', null)
      .lt('subscribed_at', cutoffIso)
      .select('id')

    if (error) {
      console.error('Newsletter cleanup error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Cleanup failed', 500)
    }

    const deleted = Array.isArray(data) ? data.length : 0
    console.log(
      `Newsletter cleanup: deleted ${deleted} pending rows older than ${cutoffIso}`
    )

    return successResponse({
      deleted,
      cutoff: cutoffIso,
    })
  } catch (e) {
    console.error('Newsletter cleanup unexpected error:', e)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error ? e.message : 'Cleanup failed',
      500
    )
  }
}
