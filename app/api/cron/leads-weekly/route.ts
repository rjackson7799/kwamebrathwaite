/**
 * Vercel Cron entry point for the weekly lead sweep.
 *
 * Vercel calls this with `Authorization: Bearer <CRON_SECRET>`. Schedule lives
 * in vercel.json at `0 22 * * 0` (Sundays 22:00 UTC).
 *
 * Flow:
 *   1. Verify auth header.
 *   2. Resolve budget cap + deep-research toggle from settings.
 *   3. runLeadGeneration({ triggeredBy: 'cron' }).
 *   4. sendLeadDigest({ runId }) so the email reflects only this run.
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { runLeadGeneration } from '@/lib/leads/run'
import { sendLeadDigest } from '@/lib/leads/digest'
import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_LEAD_SETTINGS } from '@/lib/leads/types'

export const maxDuration = 300

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

  // Resolve settings.
  let budgetCap = DEFAULT_LEAD_SETTINGS.budget_cap_usd
  let deepResearchEnabled = DEFAULT_LEAD_SETTINGS.deep_research_enabled
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('lead_settings')
      .select('key, value')
      .in('key', ['budget_cap_usd', 'deep_research_enabled'])
    for (const row of (data as Array<{ key: string; value: unknown }>) || []) {
      if (row.key === 'budget_cap_usd' && typeof row.value === 'number') {
        budgetCap = row.value
      } else if (row.key === 'deep_research_enabled' && typeof row.value === 'boolean') {
        deepResearchEnabled = row.value
      }
    }
  } catch (e) {
    console.error('cron settings load error:', e)
  }

  // Run sweep.
  let runResult
  try {
    runResult = await runLeadGeneration({
      budgetCapUsd: budgetCap,
      triggeredBy: 'cron',
      deepResearchEnabled,
    })
  } catch (e) {
    console.error('cron run failed:', e)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error ? e.message : 'Run failed',
      500
    )
  }

  // Send digest scoped to this run.
  let digestResult
  try {
    digestResult = await sendLeadDigest({ runId: runResult.runId, windowDays: 7 })
  } catch (e) {
    console.error('cron digest send failed:', e)
    digestResult = {
      sent: false,
      recipient: null,
      leadCount: runResult.leadsNew,
      skippedReason: e instanceof Error ? e.message : String(e),
    }
  }

  return successResponse({
    run: runResult,
    digest: digestResult,
  })
}
