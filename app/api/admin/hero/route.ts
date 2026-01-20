import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminHeroSlideSchema, adminHeroFiltersSchema, parseSearchParams } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'

// GET /api/admin/hero - List all hero slides (including drafts)
export async function GET(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)
    const filters = adminHeroFiltersSchema.safeParse(params)

    if (!filters.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        filters.error.flatten().fieldErrors
      )
    }

    const { page, limit, status, active, sort, order } = filters.data
    const { from, to } = getPagination(page, limit)

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('hero_slides')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (active !== undefined) query = query.eq('is_active', active)

    // Apply sorting
    const sortField = sort || 'display_order'
    const sortOrder = order || 'asc'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch hero slides', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Error fetching hero slides:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/hero - Create new hero slide
export async function POST(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = adminHeroSlideSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid hero slide data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('hero_slides')
      .insert(result.data)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to create hero slide', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail && data) {
      await logActivity(userEmail, 'create', 'hero_slide', data.id, `Hero Slide ${data.display_order}`)
    }

    return successResponse(data, undefined, 201)
  } catch (error) {
    console.error('Error creating hero slide:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
