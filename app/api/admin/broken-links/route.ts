import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

type BrokenLinkAggregateRow = {
  path: string
  hit_count: number
  last_seen: string
  first_seen: string
  referrer_count: number
  top_referrer: string | null
}

type BrokenLinkRawRow = {
  id: string
  path: string
  referrer: string | null
  user_agent: string | null
  locale: string | null
  country: string | null
  created_at: string
}

// GET /api/admin/broken-links?view=aggregate&days=30
// GET /api/admin/broken-links?view=raw&days=30&path=/bio
export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const view = searchParams.get('view') || 'aggregate'
  const days = Math.max(1, Math.min(365, Number(searchParams.get('days')) || 30))
  const pathFilter = searchParams.get('path')

  try {
    if (view === 'aggregate') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (await createClient()) as any
      const { data, error } = await supabase.rpc('broken_links_aggregate', {
        days_back: days,
      })

      if (error) {
        console.error('broken_links_aggregate RPC error:', error)
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to load aggregates', 500)
      }

      return successResponse<BrokenLinkAggregateRow[]>(data || [], { days })
    }

    if (view === 'raw') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = (await createClient()) as any
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from('not_found_log')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500)

      if (pathFilter) {
        query = query.eq('path', pathFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('not_found_log select error:', error)
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to load raw log', 500)
      }

      return successResponse<BrokenLinkRawRow[]>(data || [], { days })
    }

    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid view parameter', 400)
  } catch (err) {
    console.error('broken-links GET unexpected error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/broken-links
// Body: { action: 'prune', daysToKeep: 90 }
// Runs manual cleanup of old log rows.
export async function POST(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const raw = (body || {}) as Record<string, unknown>
  const action = typeof raw.action === 'string' ? raw.action : null

  if (action !== 'prune') {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Unknown action', 400)
  }

  const daysToKeep = Math.max(
    1,
    Math.min(365, Number(raw.daysToKeep) || 90)
  )

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { data, error } = await supabase.rpc('prune_not_found_log', {
      days_to_keep: daysToKeep,
    })

    if (error) {
      console.error('prune_not_found_log RPC error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Prune failed', 500)
    }

    console.log(`Broken-links prune: ${data} rows deleted by ${user?.email}`)
    return successResponse({ deleted: Number(data) || 0 })
  } catch (err) {
    console.error('broken-links POST unexpected error:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
