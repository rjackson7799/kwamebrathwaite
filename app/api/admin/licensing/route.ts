import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminLicenseRequestFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/licensing - List all license requests
export async function GET(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminLicenseRequestFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, status, license_type_id, q, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    let query = supabase
      .from('license_requests')
      .select(`
        *,
        license_type:license_types(id, name),
        artworks:license_request_artworks(
          artwork:artworks(id, title, image_thumbnail_url)
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (license_type_id) query = query.eq('license_type_id', license_type_id)
    if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,request_number.ilike.%${q}%`)

    // Apply sorting
    const sortField = sort || 'created_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch license requests', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching license requests:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
