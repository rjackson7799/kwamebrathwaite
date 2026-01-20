import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  getPaginationParams,
  createPaginationMetadata,
  exhibitionFiltersSchema,
  parseSearchParams,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const params = parseSearchParams(searchParams)
    const { page, limit, offset } = getPaginationParams(searchParams)

    // Validate filter parameters
    const validationResult = exhibitionFiltersSchema.safeParse(params)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validationResult.error.flatten()
      )
    }

    const { type } = validationResult.data
    const today = new Date().toISOString().split('T')[0]

    // Build query
    let query = supabase
      .from('exhibitions')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('start_date', { ascending: false, nullsFirst: false })

    // Apply type filter based on dates
    if (type === 'past') {
      query = query.lt('end_date', today)
    } else if (type === 'current') {
      query = query.lte('start_date', today).gte('end_date', today)
    } else if (type === 'upcoming') {
      query = query.gt('start_date', today)
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
