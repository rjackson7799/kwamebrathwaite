import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminNewsletterFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/newsletter - List all newsletter subscribers
export async function GET(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminNewsletterFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, locale, q, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })

    // Apply filters
    if (locale) query = query.eq('locale', locale)
    if (q) query = query.ilike('email', `%${q}%`)

    // Apply sorting
    const sortField = sort || 'subscribed_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch subscribers', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching subscribers:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
