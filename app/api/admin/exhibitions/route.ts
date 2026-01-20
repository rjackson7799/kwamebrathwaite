import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminExhibitionSchema, adminExhibitionFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/exhibitions - List all exhibitions (including drafts)
export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminExhibitionFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, type, status, q, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('exhibitions')
      .select('*', { count: 'exact' })

    // Apply filters
    if (type) query = query.eq('exhibition_type', type)
    if (status) query = query.eq('status', status)
    if (q) {
      // Search in title and venue
      query = query.or(`title.ilike.%${q}%,venue.ilike.%${q}%`)
    }

    // Apply sorting
    const sortField = sort || 'created_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch exhibitions', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching exhibitions:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/exhibitions - Create new exhibition
export async function POST(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = adminExhibitionSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid exhibition data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    // Clean up empty strings to null for URL fields
    const cleanedData = {
      ...result.data,
      image_url: result.data.image_url || null,
      venue_url: result.data.venue_url || null,
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('exhibitions')
      .insert(cleanedData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create exhibition', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail && data) {
      await logActivity(userEmail, 'create', 'exhibition', data.id, data.title)
    }

    return successResponse(data, undefined, 201)
  } catch (error) {
    console.error('Error creating exhibition:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
