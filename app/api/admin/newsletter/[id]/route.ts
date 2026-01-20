import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/newsletter/:id - Delete a subscriber
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Get subscriber info for logging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('newsletter_subscribers')
      .select('id, email')
      .eq('id', id)
      .single()

    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Subscriber not found', 404)
    }

    // Delete subscriber
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete subscriber', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'delete', 'newsletter_subscriber', existing.id, existing.email)
    }

    return successResponse({ message: 'Subscriber deleted successfully' })
  } catch (error) {
    console.error('Error deleting subscriber:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
