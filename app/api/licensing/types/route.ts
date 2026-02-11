import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('license_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch license types', 500)
    }

    return successResponse(data || [])
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
