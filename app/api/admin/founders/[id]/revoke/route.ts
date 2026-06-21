import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  revokeFounderSessions,
  revokeFounderInviteLinks,
} from '@/lib/auth/founders-admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/founders/[id]/revoke
// Sets the founder row to status='archived' AND revokes all active sessions
// for the underlying auth.users row. The membership check in middleware /
// founders RLS will then reject all subsequent access; the session revoke
// also closes the door on any active tab the member may have open.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const { data: founder, error: lookupError } = await supabase
      .from('founders')
      .select('user_id, full_name, status')
      .eq('user_id', id)
      .maybeSingle()

    if (lookupError || !founder) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
    }

    if (founder.status !== 'archived') {
      await supabase
        .from('founders')
        .update({ status: 'archived' })
        .eq('user_id', id)
    }

    // Best-effort: revoke active sessions. Continues even on failure since
    // status='archived' is the primary effect that closes the door.
    await revokeFounderSessions(id)

    // Best-effort: kill any outstanding durable invite/sign-in links so a
    // previously copied link can't re-admit a revoked member. (The bridge also
    // rejects archived founders, so this is hygiene, not the primary guard.)
    try {
      await revokeFounderInviteLinks(id)
    } catch (linkErr) {
      console.error('admin/founders/[id]/revoke: link cleanup failed', linkErr)
    }

    const adminEmail = await getCurrentUserEmail()
    if (adminEmail) {
      await logActivity(
        adminEmail,
        'status_change',
        'founder',
        id,
        founder.full_name,
        { action: 'invite_revoked', new_status: 'archived' }
      )
    }

    return successResponse({ revoked: true })
  } catch (err) {
    console.error('admin/founders/[id]/revoke POST error:', err)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to revoke access',
      500
    )
  }
}
