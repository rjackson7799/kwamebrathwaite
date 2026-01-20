import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes, MapMetadata } from '@/lib/api/response'
import { exhibitionMapFiltersSchema, parseSearchParams } from '@/lib/api/validation'

export interface MapExhibition {
  id: string
  title: string
  venue: string | null
  city: string | null
  country: string | null
  location_lat: number
  location_lng: number
  exhibition_type: 'current' | 'upcoming' | 'past'
  start_date: string | null
  end_date: string | null
  image_url: string | null
  venue_url: string | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const params = parseSearchParams(searchParams)

    // Validate query parameters
    const validationResult = exhibitionMapFiltersSchema.safeParse(params)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validationResult.error.flatten()
      )
    }

    const { type, geo, user_lat, user_lng, radius } = validationResult.data
    const supabase = await createClient()

    // Build base query - only published exhibitions with coordinates
    let query = supabase
      .from('exhibitions')
      .select(
        'id, title, venue, city, country, location_lat, location_lng, exhibition_type, start_date, end_date, image_url, venue_url'
      )
      .eq('status', 'published')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)

    // Filter by exhibition type
    if (type !== 'all') {
      query = query.eq('exhibition_type', type)
    }

    // Geographic filtering
    if (geo === 'us') {
      // Filter to United States only
      query = query.eq('country', 'United States')
    } else if (geo === 'near_me' && user_lat !== undefined && user_lng !== undefined) {
      // Bounding box approximation for "near me"
      // 1 degree latitude ~ 69 miles
      // 1 degree longitude ~ 69 * cos(latitude) miles
      const latDelta = radius / 69
      const lngDelta = radius / (69 * Math.cos((user_lat * Math.PI) / 180))

      query = query
        .gte('location_lat', user_lat - latDelta)
        .lte('location_lat', user_lat + latDelta)
        .gte('location_lng', user_lng - lngDelta)
        .lte('location_lng', user_lng + lngDelta)
    }

    // Order by start_date descending (newest first)
    query = query.order('start_date', { ascending: false, nullsFirst: false })

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, error.message, 500)
    }

    // Determine map center and zoom based on geographic filter
    let center = { lat: 20, lng: 0 } // Global view - centered on Atlantic
    let zoom = 2

    if (geo === 'us') {
      center = { lat: 39.8283, lng: -98.5795 } // Geographic center of US
      zoom = 4
    } else if (geo === 'near_me' && user_lat !== undefined && user_lng !== undefined) {
      center = { lat: user_lat, lng: user_lng }
      zoom = 10
    }

    const metadata: MapMetadata = {
      total: data?.length || 0,
      filtered: data?.length || 0,
      center,
      zoom,
    }

    return successResponse(data || [], metadata)
  } catch (error) {
    console.error('Map API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
