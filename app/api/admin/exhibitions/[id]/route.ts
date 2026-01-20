import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminExhibitionSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import type { Database } from '@/lib/supabase/types'

type ExhibitionUpdate = Database['public']['Tables']['exhibitions']['Update']

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/exhibitions/:id - Get single exhibition
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('exhibitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch exhibition', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching exhibition:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PUT /api/admin/exhibitions/:id - Update exhibition
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = adminExhibitionSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid exhibition data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // Check if exhibition exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('exhibitions')
      .select('id, title, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
    }

    // Update exhibition
    const updateData: ExhibitionUpdate = {
      title: result.data.title,
      venue: result.data.venue,
      street_address: result.data.street_address,
      city: result.data.city,
      state_region: result.data.state_region,
      postal_code: result.data.postal_code,
      country: result.data.country,
      start_date: result.data.start_date,
      end_date: result.data.end_date,
      description: result.data.description,
      image_url: result.data.image_url || null,
      exhibition_type: result.data.exhibition_type,
      location_lat: result.data.location_lat,
      location_lng: result.data.location_lng,
      venue_url: result.data.venue_url || null,
      display_order: result.data.display_order,
      status: result.data.status,
      meta_title: result.data.meta_title,
      meta_description: result.data.meta_description,
      updated_at: new Date().toISOString(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('exhibitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update exhibition', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      const action = existing.status !== result.data.status ? 'status_change' : 'update'
      await logActivity(userEmail, action, 'exhibition', data.id, data.title, {
        previous_status: existing.status,
        new_status: result.data.status,
      })
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating exhibition:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/exhibitions/:id - Delete exhibition
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get exhibition info for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('exhibitions')
      .select('id, title')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Exhibition not found', 404)
    }

    // Delete exhibition (cascade will handle junction table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('exhibitions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete exhibition', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'delete', 'exhibition', existing.id, existing.title)
    }

    return successResponse({ message: 'Exhibition deleted successfully' })
  } catch (error) {
    console.error('Error deleting exhibition:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
