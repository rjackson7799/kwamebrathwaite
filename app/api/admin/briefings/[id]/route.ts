import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminBriefingUpdateSchema,
} from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/admin/briefings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('founder_briefings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('admin/briefings GET error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch briefing', 500)
  }
  if (!data) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Briefing not found', 404)
  }

  // Also fetch notification + read counts for the detail-view sidebar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: notifs }, { count: readCount }] = await Promise.all([
    (supabase as any)
      .from('founder_briefing_notifications')
      .select('user_id, status, sent_at, error')
      .eq('briefing_id', id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('founder_briefing_reads')
      .select('user_id', { count: 'exact', head: true })
      .eq('briefing_id', id),
  ])

  return successResponse({
    briefing: data,
    notifications: notifs ?? [],
    read_count: readCount ?? 0,
  })
}

// PATCH /api/admin/briefings/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminBriefingUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten()
    )
  }

  // Disallow transitioning to 'published' through PATCH — use the dedicated
  // publish route so we set published_at + published_by atomically.
  if (parsed.data.status === 'published') {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Use POST /api/admin/briefings/[id]/publish to publish',
      400
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: updated, error: updateError } = await supabase
    .from('founder_briefings')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    console.error('admin/briefings PATCH error:', updateError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update briefing', 500)
  }

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    const action = parsed.data.status === 'archived' ? 'status_change' : 'update'
    await logActivity(adminEmail, action, 'briefing', id, updated.title, parsed.data as Record<string, unknown>)
  }

  return successResponse({ briefing: updated })
}

// DELETE /api/admin/briefings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Capture title for the activity log before delete cascades.
  const { data: briefing } = await supabase
    .from('founder_briefings')
    .select('title')
    .eq('id', id)
    .maybeSingle()

  const { error: deleteError } = await supabase
    .from('founder_briefings')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('admin/briefings DELETE error:', deleteError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete briefing', 500)
  }

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(adminEmail, 'delete', 'briefing', id, briefing?.title ?? null)
  }

  return successResponse({ deleted: true })
}
