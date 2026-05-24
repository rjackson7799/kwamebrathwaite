import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/admin/briefings/[id]/publish
// Transition draft → published. Sets published_at + published_by atomically.
// Idempotent: re-publishing a published briefing is a no-op on the columns
// but still updates updated_at via the trigger.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: existing, error: readError } = await supabase
    .from('founder_briefings')
    .select('id, title, status, published_at')
    .eq('id', id)
    .maybeSingle()

  if (readError) {
    console.error('briefings/publish: read failed', readError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to read briefing', 500)
  }
  if (!existing) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Briefing not found', 404)
  }
  if (existing.status === 'archived') {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Cannot publish an archived briefing',
      400
    )
  }

  const update: Record<string, unknown> = {
    status: 'published',
    published_by: user!.id,
  }
  if (!existing.published_at) {
    update.published_at = new Date().toISOString()
  }

  const { data: updated, error: updateError } = await supabase
    .from('founder_briefings')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    console.error('briefings/publish: update failed', updateError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to publish briefing', 500)
  }

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(adminEmail, 'status_change', 'briefing', id, existing.title, {
      to: 'published',
    })
  }

  return successResponse({ briefing: updated })
}
