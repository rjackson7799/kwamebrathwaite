import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { exhibitionArtworksSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/exhibitions/:id/artworks - Get linked artworks
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    // Get artwork IDs linked to this exhibition
    const { data, error } = await supabase
      .from('exhibition_artworks')
      .select('artwork_id, display_order')
      .eq('exhibition_id', id)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch linked artworks', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching linked artworks:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/exhibitions/:id/artworks - Link artworks to exhibition
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = exhibitionArtworksSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid artwork IDs',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const { artworkIds } = result.data
    const supabase = await createAdminClient()

    // Verify exhibition exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: exhibition, error: exhibitionError } = await (supabase as any)
      .from('exhibitions')
      .select('id, title')
      .eq('id', id)
      .single()

    if (exhibitionError || !exhibition) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
    }

    // Delete existing links
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('exhibition_artworks')
      .delete()
      .eq('exhibition_id', id)

    // Insert new links with display order
    if (artworkIds.length > 0) {
      const links = artworkIds.map((artworkId, index) => ({
        exhibition_id: id,
        artwork_id: artworkId,
        display_order: index,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('exhibition_artworks')
        .insert(links)

      if (insertError) {
        console.error('Database error:', insertError)
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to link artworks', 500)
      }
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'update', 'exhibition', id, exhibition.title, {
        action: 'linked_artworks',
        artwork_count: artworkIds.length,
      })
    }

    return successResponse({
      message: 'Artworks linked successfully',
      linked_count: artworkIds.length
    })
  } catch (error) {
    console.error('Error linking artworks:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
