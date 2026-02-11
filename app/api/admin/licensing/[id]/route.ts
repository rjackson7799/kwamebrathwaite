import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminLicenseRequestUpdateSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/licensing/:id - Get single license request
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('license_requests')
      .select(`
        *,
        license_type:license_types(id, name, description),
        artworks:license_request_artworks(
          artwork:artworks(id, title, image_url, image_thumbnail_url, year, medium)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'License request not found', 404)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch license request', 500)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error fetching license request:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PUT /api/admin/licensing/:id - Update license request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = adminLicenseRequestUpdateSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // Check if request exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('license_requests')
      .select('id, request_number, name, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'License request not found', 404)
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (result.data.status !== undefined) updateData.status = result.data.status
    if (result.data.admin_notes !== undefined) updateData.admin_notes = result.data.admin_notes
    if (result.data.quoted_price !== undefined) updateData.quoted_price = result.data.quoted_price
    if (result.data.quoted_at !== undefined) updateData.quoted_at = result.data.quoted_at
    if (result.data.approved_at !== undefined) updateData.approved_at = result.data.approved_at
    if (result.data.expires_at !== undefined) updateData.expires_at = result.data.expires_at

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('license_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update license request', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      const action = existing.status !== result.data.status ? 'status_change' : 'update'
      await logActivity(
        userEmail,
        action,
        'license_request',
        data.id,
        `${existing.request_number} - ${existing.name}`,
        {
          previous_status: existing.status,
          new_status: result.data.status,
        }
      )
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating license request:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/licensing/:id - Delete license request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get request info for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('license_requests')
      .select('id, request_number, name')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'License request not found', 404)
    }

    // Delete (cascade will remove artwork associations)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('license_requests')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete license request', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'delete', 'license_request', existing.id, `${existing.request_number} - ${existing.name}`)
    }

    return successResponse({ message: 'License request deleted successfully' })
  } catch (error) {
    console.error('Error deleting license request:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
