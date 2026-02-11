import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { licenseTypeSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/admin/licensing/types/:id - Update a license type
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const result = licenseTypeSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid license type data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const supabase = await createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('license_types')
      .update(result.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(ErrorCodes.NOT_FOUND, 'License type not found', 404)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update license type', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'update', 'license_type', data.id, data.name)
    }

    return successResponse(data)
  } catch (error) {
    console.error('Error updating license type:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/licensing/types/:id - Delete a license type
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get type info for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('license_types')
      .select('id, name')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'License type not found', 404)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('license_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete license type', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'delete', 'license_type', existing.id, existing.name)
    }

    return successResponse({ message: 'License type deleted successfully' })
  } catch (error) {
    console.error('Error deleting license type:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
