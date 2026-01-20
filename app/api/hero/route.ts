import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/hero
 * Public endpoint to fetch active, published hero slides
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('hero_slides')
      .select('id, image_url, overlay_opacity, display_order')
      .eq('status', 'published')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching hero slides:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch hero slides')
    }

    return successResponse(data || [])
  } catch (error) {
    console.error('Hero slides fetch error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
  }
}
