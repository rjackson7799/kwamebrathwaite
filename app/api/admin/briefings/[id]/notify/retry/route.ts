import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { sendQueuedBatch } from '../route'

interface FounderRow {
  user_id: string
  email: string
  full_name: string
  recognition_name: string | null
  preferred_locale: string
  comms_prefs: Record<string, unknown> | null
}

// POST /api/admin/briefings/[id]/notify/retry
//
// Re-attempts notification only for rows currently in status='failed'.
// Bumps each retried row back to 'queued' before re-sending so the helper
// function path is unchanged. Never touches 'sent' or 'skipped' rows.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id: briefingId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: briefing, error: briefingError } = await supabase
    .from('founder_briefings')
    .select('id, title, excerpt, status')
    .eq('id', briefingId)
    .maybeSingle()

  if (briefingError) {
    console.error('briefings/notify/retry: read briefing failed', briefingError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to read briefing', 500)
  }
  if (!briefing) return errorResponse(ErrorCodes.NOT_FOUND, 'Briefing not found', 404)
  if (briefing.status !== 'published') {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Can only notify on published briefings',
      400
    )
  }

  // Find failed user_ids
  const { data: failed, error: failedError } = await supabase
    .from('founder_briefing_notifications')
    .select('user_id')
    .eq('briefing_id', briefingId)
    .eq('status', 'failed')

  if (failedError) {
    console.error('briefings/notify/retry: list failed rows error', failedError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to read failed rows', 500)
  }

  const failedIds = ((failed ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)
  if (failedIds.length === 0) {
    return successResponse({ briefing_id: briefingId, retried: 0, sent: 0, failed: 0 })
  }

  // Reset to queued so the per-row update path is consistent.
  await supabase
    .from('founder_briefing_notifications')
    .update({ status: 'queued', error: null })
    .eq('briefing_id', briefingId)
    .in('user_id', failedIds)

  // Load founder details for the retry batch.
  const { data: founders } = await supabase
    .from('founders')
    .select('user_id, email, full_name, recognition_name, preferred_locale, comms_prefs')
    .in('user_id', failedIds)
    .eq('status', 'active')

  const founderRows = (founders ?? []) as FounderRow[]
  const counts = await sendQueuedBatch(supabase, briefing, founderRows, briefingId)

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(adminEmail, 'update', 'briefing_notification', briefingId, briefing.title, {
      retried: failedIds.length,
      ...counts,
    })
  }

  return successResponse({ briefing_id: briefingId, retried: failedIds.length, ...counts })
}
