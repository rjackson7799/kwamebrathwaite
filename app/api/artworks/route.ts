import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  getPaginationParams,
  createPaginationMetadata,
  artworkFiltersSchema,
  parseSearchParams,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const params = parseSearchParams(searchParams)

    // Validate and parse query parameters
    const validationResult = artworkFiltersSchema.safeParse(params)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validationResult.error.flatten()
      )
    }

    const { page, limit, category, series, availability, year, q } = validationResult.data
    const offset = (page - 1) * limit

    // Build query - featured artworks appear first, then ordered by display_order
    let query = supabase
      .from('artworks')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    if (series) {
      query = query.eq('series', series)
    }
    if (availability) {
      query = query.eq('availability_status', availability)
    }
    if (year) {
      query = query.eq('year', year)
    }
    if (q) {
      // Search in title and description
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, error.message, 500)
    }

    return successResponse(data || [], createPaginationMetadata(page, limit, count || 0))
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
