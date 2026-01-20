import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminInquiryFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/inquiries - List all inquiries
export async function GET(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminInquiryFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, status, type, q, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query with optional artwork join
    let query = supabase
      .from('inquiries')
      .select(`
        *,
        artwork:artworks(id, title, image_thumbnail_url)
      `, { count: 'exact' })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (type) query = query.eq('inquiry_type', type)
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,subject.ilike.%${q}%`)

    // Apply sorting
    const sortField = sort || 'created_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch inquiries', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching inquiries:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
