import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  createFounderInviteLink,
  revokeFounderInviteLinks,
} from '@/lib/auth/founders-admin'
import { isLinkEligibleStatus } from '@/lib/founders/invite-links'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/founders/[id]/invite-link
// Mints a durable, copyable invite/sign-in link (30-day) the admin can paste
// into their own email when delivery fails. This does NOT send an email and does
// NOT touch last_invited_at — copying is not sending, so the stale-invite cron
// stays accurate. Multiple links may coexist; each call mints a new one.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const { data: founder, error: lookupError } = await supabase
      .from('founders')
      .select('user_id, email, full_name, preferred_locale, status')
      .eq('user_id', id)
      .maybeSingle()

    if (lookupError || !founder) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
    }

    // A copyable link only leads somewhere for invited (review + donate) and
    // active (portal). paused/declined hit the closed screen; archived is
    // revoked. For those, the link would dead-end, so we don't mint one.
    if (!isLinkEligibleStatus(founder.status)) {
      return errorResponse(
        'CONFLICT',
        `A sign-in link isn't available for a ${founder.status} founder. Set status to Invited first to re-invite.`,
        409
      )
    }

    const adminEmail = await getCurrentUserEmail()

    const { link, expiresAt } = await createFounderInviteLink({
      userId: founder.user_id,
      email: founder.email,
      locale: founder.preferred_locale ?? 'en',
      createdBy: adminEmail ?? null,
    })

    if (adminEmail) {
      await logActivity(
        adminEmail,
        'update',
        'invitation',
        founder.user_id,
        founder.full_name,
        { action: 'invite_link_generated' }
      )
    }

    return successResponse({ link, expires_at: expiresAt })
  } catch (err) {
    console.error('admin/founders/[id]/invite-link POST error:', err)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to generate invite link',
      500
    )
  }
}

// DELETE /api/admin/founders/[id]/invite-link
// Revokes ALL outstanding durable links for this founder (the manual kill
// switch for a link that was shared too widely or sent in error).
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    const count = await revokeFounderInviteLinks(id)

    const adminEmail = await getCurrentUserEmail()
    if (adminEmail) {
      await logActivity(
        adminEmail,
        'update',
        'invitation',
        id,
        undefined,
        { action: 'invite_links_revoked', count }
      )
    }

    return successResponse({ revoked: count })
  } catch (err) {
    console.error('admin/founders/[id]/invite-link DELETE error:', err)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to revoke invite links',
      500
    )
  }
}
