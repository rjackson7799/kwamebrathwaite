import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminActivityFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/activity - List activity log entries
export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminActivityFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, action, entity_type, user, q, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })

    // Apply filters
    if (action) query = query.eq('action', action)
    if (entity_type) query = query.eq('entity_type', entity_type)
    if (user) query = query.ilike('user_email', `%${user}%`)
    if (q) query = query.ilike('entity_title', `%${q}%`)

    // Apply sorting (default: newest first)
    const sortField = sort || 'created_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch activity log', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching activity log:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

