import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import {
  LEAD_CATEGORIES,
  LEAD_REGIONS,
  LEAD_STATUSES,
} from '@/lib/leads/types'

const filterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  category: z.enum(LEAD_CATEGORIES as [string, ...string[]]).optional(),
  region: z.enum(LEAD_REGIONS as [string, ...string[]]).optional(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]).optional(),
  q: z.string().max(200).optional(),
})

export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  const sp = request.nextUrl.searchParams
  const parsed = filterSchema.safeParse({
    page: sp.get('page') ?? undefined,
    limit: sp.get('limit') ?? undefined,
    category: sp.get('category') ?? undefined,
    region: sp.get('region') ?? undefined,
    status: sp.get('status') ?? undefined,
    q: sp.get('q') ?? undefined,
  })
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid filter',
      400,
      parsed.error.flatten().fieldErrors
    )
  }
  const { page, limit, category, region, status, q } = parsed.data

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('leads')
    .select('*', { count: 'exact' })

  if (category) query = query.eq('category', category)
  if (region) query = query.eq('region', region)
  if (status) query = query.eq('status', status)
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,summary_en.ilike.%${q}%,organization.ilike.%${q}%`
    )
  }

  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('leads list error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch leads', 500)
  }

  return successResponse(data || [], {
    page,
    pageSize: limit,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
