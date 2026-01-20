import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  getPaginationParams,
  createPaginationMetadata,
  pressFiltersSchema,
  parseSearchParams,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const params = parseSearchParams(searchParams)
    const { page, limit, offset } = getPaginationParams(searchParams)

    // Validate filter parameters
    const validationResult = pressFiltersSchema.safeParse(params)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validationResult.error.flatten()
      )
    }

    const { type, featured } = validationResult.data

    // Build query
    let query = supabase
      .from('press')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('publish_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (type) {
      query = query.eq('press_type', type)
    }
    if (featured !== undefined) {
      query = query.eq('is_featured', featured)
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
