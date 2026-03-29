import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { adminReorderSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

// PUT /api/admin/press/reorder - Bulk reorder press items
export async function PUT(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = adminReorderSchema.safeParse(body)

    if (!result.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid reorder data',
        400,
        result.error.flatten().fieldErrors
      )
    }

    const { ids } = result.data
    const supabase = await createAdminClient()

    // Update display_order for each press item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates = ids.map((id, index) =>
      (supabase as any)
        .from('press')
        .update({ display_order: index + 1, updated_at: new Date().toISOString() })
        .eq('id', id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      console.error('Reorder errors:', results.filter((r) => r.error))
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to reorder press items', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'reorder', 'press', undefined, undefined, {
        press_count: ids.length,
      })
    }

    return successResponse({ message: 'Press items reordered successfully' })
  } catch (error) {
    console.error('Error reordering press items:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
