import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

interface AdjacentArtwork {
  id: string
  title: string
  image_thumbnail_url: string | null
  image_url: string
}

interface AdjacentResponse {
  previous: AdjacentArtwork | null
  next: AdjacentArtwork | null
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    // Get optional filter params to respect current gallery context
    const category = searchParams.get('category')
    const series = searchParams.get('series')
    const q = searchParams.get('q')

    // First, get the current artwork to find its display_order
    const { data: currentArtwork, error: currentError } = await supabase
      .from('artworks')
      .select('id, display_order')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (currentError || !currentArtwork) {
      if (currentError?.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
      }
      console.error('Database error:', currentError)
      return errorResponse(ErrorCodes.DB_ERROR, currentError?.message || 'Artwork not found', 500)
    }

    const currentOrder = (currentArtwork as { id: string; display_order: number | null }).display_order ?? 0

    // Build base query for finding adjacent artworks
    const buildQuery = (direction: 'prev' | 'next') => {
      let query = supabase
        .from('artworks')
        .select('id, title, image_thumbnail_url, image_url')
        .eq('status', 'published')
        .neq('id', id)

      // Apply filters if present (to maintain gallery context)
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      if (series) {
        query = query.eq('series', series)
      }
      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,series.ilike.%${q}%`)
      }

      // Order and filter by display_order
      if (direction === 'prev') {
        query = query
          .lt('display_order', currentOrder)
          .order('display_order', { ascending: false })
          .limit(1)
      } else {
        query = query
          .gt('display_order', currentOrder)
          .order('display_order', { ascending: true })
          .limit(1)
      }

      return query
    }

    // Fetch previous and next artworks in parallel
    const [prevResult, nextResult] = await Promise.all([
      buildQuery('prev'),
      buildQuery('next'),
    ])

    if (prevResult.error) {
      console.error('Error fetching previous artwork:', prevResult.error)
    }
    if (nextResult.error) {
      console.error('Error fetching next artwork:', nextResult.error)
    }

    const response: AdjacentResponse = {
      previous: prevResult.data?.[0] ?? null,
      next: nextResult.data?.[0] ?? null,
    }

    return successResponse(response)
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
