import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminArtworkSchema, artworkQuickUpdateSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import type { Database } from '@/lib/supabase/types'

type ArtworkUpdate = Database['public']['Tables']['artworks']['Update']

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/artworks/:id - Get single artwork
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch artwork', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching artwork:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PUT /api/admin/artworks/:id - Update artwork
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = adminArtworkSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid artwork data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // Check if artwork exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('artworks')
      .select('id, title, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
    }

    // Update artwork
    const updateData: ArtworkUpdate = {
      title: result.data.title,
      year: result.data.year,
      medium: result.data.medium,
      dimensions: result.data.dimensions,
      dimensions_cm: result.data.dimensions_cm,
      description: result.data.description,
      short_description: result.data.short_description,
      seo_title: result.data.seo_title,
      alt_text: result.data.alt_text,
      image_url: result.data.image_url,
      image_thumbnail_url: result.data.image_thumbnail_url,
      category: result.data.category,
      series: result.data.series,
      edition: result.data.edition,
      archive_reference: result.data.archive_reference,
      availability_status: result.data.availability_status,
      is_featured: result.data.is_featured,
      display_order: result.data.display_order,
      related_artwork_ids: result.data.related_artwork_ids,
      status: result.data.status,
      meta_title: result.data.meta_title,
      meta_description: result.data.meta_description,
      updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('artworks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update artwork', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      const action = existing.status !== result.data.status ? 'status_change' : 'update'
      await logActivity(userEmail, action, 'artwork', data.id, data.title, {
        previous_status: existing.status,
        new_status: result.data.status,
      })
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating artwork:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PATCH /api/admin/artworks/:id - Quick update (status, availability, featured)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = artworkQuickUpdateSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid update data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // Check if artwork exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('artworks')
      .select('id, title, status, availability_status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
    }

    const updateData: ArtworkUpdate = {
      ...result.data,
      updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('artworks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update artwork', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      const statusChanged = result.data.status && existing.status !== result.data.status
      const action = statusChanged ? 'status_change' : 'update'
      await logActivity(userEmail, action, 'artwork', data.id, data.title, {
        previous_status: existing.status,
        new_status: result.data.status || existing.status,
        previous_availability: existing.availability_status,
        new_availability: result.data.availability_status || existing.availability_status,
      })
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating artwork:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/artworks/:id - Delete artwork
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get artwork info for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('artworks')
      .select('id, title')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Artwork not found', 404)
    }

    // Delete artwork
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('artworks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete artwork', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'delete', 'artwork', existing.id, existing.title)
    }

    return successResponse({ message: 'Artwork deleted successfully' })
  } catch (error) {
    console.error('Error deleting artwork:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
