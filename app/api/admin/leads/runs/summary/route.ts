import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

interface RunRow {
  cost_usd: number | string | null
  status: string
  cost_breakdown: Record<string, number> | null
  started_at: string
}

export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lead_runs')
    .select('cost_usd, status, cost_breakdown, started_at')
    .gte('started_at', since.toISOString())

  if (error) {
    console.error('runs summary error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch run summary', 500)
  }

  const rows = (data as RunRow[]) || []
  let totalUsd = 0
  let runs = 0
  let capReached = 0
  let failed = 0
  const breakdown: Record<string, number> = {}

  for (const row of rows) {
    runs++
    totalUsd += Number(row.cost_usd ?? 0)
    if (row.status === 'cap_reached') capReached++
    if (row.status === 'failed') failed++
    for (const [provider, usd] of Object.entries(row.cost_breakdown || {})) {
      breakdown[provider] = (breakdown[provider] || 0) + Number(usd ?? 0)
    }
  }

  return successResponse({
    days: 30,
    runs,
    cap_reached: capReached,
    failed,
    total_usd: Number(totalUsd.toFixed(4)),
    breakdown,
  })
}
