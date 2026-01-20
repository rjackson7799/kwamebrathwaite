import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminArtworkSchema, adminArtworkFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/artworks - List all artworks (including drafts)
export async function GET(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminArtworkFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, category, series, availability, status, year, q, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('artworks')
      .select('*', { count: 'exact' })

    // Apply filters
    if (category) query = query.eq('category', category)
    if (series) query = query.eq('series', series)
    if (availability) query = query.eq('availability_status', availability)
    if (status) query = query.eq('status', status)
    if (year) query = query.eq('year', year)
    if (q) query = query.ilike('title', `%${q}%`)

    // Apply sorting
    const sortField = sort || 'created_at'
    const sortOrder = order || 'desc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch artworks', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching artworks:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/artworks - Create new artwork
export async function POST(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = adminArtworkSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid artwork data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('artworks')
      .insert(result.data)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create artwork', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail && data) {
      await logActivity(userEmail, 'create', 'artwork', data.id, data.title)
    }

    return successResponse(data, undefined, 201)
  } catch (error) {
    console.error('Error creating artwork:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
