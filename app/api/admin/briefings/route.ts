import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminBriefingFiltersSchema,
  adminBriefingCreateSchema,
  parseSearchParams,
} from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/admin/briefings — list briefings with filters
export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const params = parseSearchParams(request.nextUrl.searchParams)
    const parsed = adminBriefingFiltersSchema.safeParse(params)
    if (!parsed.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        parsed.error.flatten().fieldErrors
      )
    }

    const { page, limit, status, q, sort, order } = parsed.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('founder_briefings')
      .select('id, title, excerpt, status, published_at, published_by, created_at, updated_at', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (q) {
      query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
    }

    query = query.order(sort || 'created_at', { ascending: order === 'asc' })
    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) {
      console.error('admin/briefings list error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch briefings', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error('admin/briefings GET unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/briefings — create a draft briefing
export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminBriefingCreateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten()
    )
  }

  const data = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: inserted, error: insertError } = await supabase
    .from('founder_briefings')
    .insert({
      title: data.title,
      excerpt: data.excerpt ?? null,
      body_html: data.body_html,
      status: 'draft',
    })
    .select('*')
    .single()

  if (insertError) {
    console.error('admin/briefings POST: insert failed:', insertError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create briefing', 500)
  }

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(adminEmail, 'create', 'briefing', inserted.id, data.title)
  }

  return successResponse({ briefing: inserted }, undefined, 201)
}
