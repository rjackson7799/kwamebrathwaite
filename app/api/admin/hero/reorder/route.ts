import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { heroReorderSchema } from '@/lib/api/validation'
import { requireAuth, logActivity, getCurrentUserEmail } from '@/lib/api/admin'

// PUT /api/admin/hero/reorder - Bulk reorder hero slides
export async function PUT(request: NextRequest) {
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const result = heroReorderSchema.safeParse(body)

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

    // Update display_order for each hero slide
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates = ids.map((id, index) =>
      (supabase as any)
        .from('hero_slides')
        .update({ display_order: index + 1, updated_at: new Date().toISOString() })
        .eq('id', id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      console.error('Reorder errors:', results.filter((r) => r.error))
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to reorder hero slides', 500)
    }

    // Log activity
    const userEmail = await getCurrentUserEmail()
    if (userEmail) {
      await logActivity(userEmail, 'reorder', 'hero_slide', undefined, undefined, {
        slide_count: ids.length,
      })
    }

    return successResponse({ message: 'Hero slides reordered successfully', updated: ids.length })
  } catch (error) {
    console.error('Error reordering hero slides:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
