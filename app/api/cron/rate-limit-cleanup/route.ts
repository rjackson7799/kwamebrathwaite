/**
 * Vercel Cron entry point for rate_limit_events row cleanup.
 *
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>`. Schedule lives
 * in vercel.json. Deletes rows older than 7 days — anything older is well past
 * the longest rolling window any caller of rateLimitPersistent() uses (the
 * OTP per-email bucket is 1 day; per-IP buckets are minutes-to-hours).
 *
 * Keeps the table from growing unbounded for an attacker spraying random
 * IPs / emails.
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { createAdminClient } from '@/lib/supabase/server'

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

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
  const cutoffIso = new Date(Date.now() - MAX_AGE_MS).toISOString()

  try {
    const { data, error } = await supabase
      .from('rate_limit_events')
      .delete()
      .lt('created_at', cutoffIso)
      .select('id')

    if (error) {
      console.error('rate-limit-cleanup error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Cleanup failed', 500)
    }

    const deleted = Array.isArray(data) ? data.length : 0
    console.log(`rate-limit-cleanup deleted ${deleted} rows older than ${cutoffIso}`)
    return successResponse({ deleted, cutoff: cutoffIso })
  } catch (err) {
    console.error('rate-limit-cleanup unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
