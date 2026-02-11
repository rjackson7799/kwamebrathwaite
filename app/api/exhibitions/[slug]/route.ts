import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import type { Artwork, Exhibition } from '@/lib/supabase/types'

type RouteParams = {
  params: Promise<{ slug: string }>
}

interface ExhibitionArtworkJoin {
  display_order: number
  artworks: Artwork | null
}

interface ExhibitionWithArtworks extends Exhibition {
  exhibition_artworks: ExhibitionArtworkJoin[] | null
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // Fetch exhibition with linked artworks by slug
    const { data, error } = await supabase
      .from('exhibitions')
      .select(
        `
        *,
        exhibition_artworks (
          display_order,
          artworks (*)
        )
      `
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, error.message, 500)
    }

    // Cast to our known type
    const exhibitionData = data as unknown as ExhibitionWithArtworks

    // Transform the response to flatten artworks and sort by display_order
    const artworks = exhibitionData.exhibition_artworks
      ?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((ea) => ea.artworks)
      .filter((artwork): artwork is Artwork => artwork !== null)

    const { exhibition_artworks, ...exhibitionWithoutJoin } = exhibitionData
    const response = {
      ...exhibitionWithoutJoin,
      artworks: artworks || [],
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
