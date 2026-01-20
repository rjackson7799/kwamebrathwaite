import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  getPaginationParams,
  createPaginationMetadata,
} from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const { page, limit, offset } = getPaginationParams(searchParams)

    const { data, error, count } = await supabase
      .from('artworks')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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
