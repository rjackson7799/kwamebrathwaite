import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { runLeadGeneration } from '@/lib/leads/run'
import { createAdminClient } from '@/lib/supabase/server'
import { LEAD_CATEGORIES, DEFAULT_LEAD_SETTINGS } from '@/lib/leads/types'

export const maxDuration = 300 // Vercel Functions: allow up to 5 min

const bodySchema = z.object({
  category: z.enum(LEAD_CATEGORIES as [string, ...string[]]).optional(),
  budget_cap_usd: z.number().min(0.01).max(100).optional(),
})

export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    /* allow empty body */
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid run payload',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  // Resolve budget cap: explicit override > settings table > default
  let budgetCap = parsed.data.budget_cap_usd
  if (budgetCap === undefined) {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('lead_settings')
      .select('value')
      .eq('key', 'budget_cap_usd')
      .single()
    budgetCap =
      typeof data?.value === 'number'
        ? data.value
        : DEFAULT_LEAD_SETTINGS.budget_cap_usd
  }

  try {
    const result = await runLeadGeneration({
      budgetCapUsd: budgetCap ?? DEFAULT_LEAD_SETTINGS.budget_cap_usd,
      triggeredBy: 'manual',
      categoryFilter: parsed.data.category as
        | (typeof LEAD_CATEGORIES)[number]
        | undefined,
    })
    return successResponse(result)
  } catch (e) {
    console.error('Lead run failed:', e)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      e instanceof Error ? e.message : 'Run failed',
      500
    )
  }
}
