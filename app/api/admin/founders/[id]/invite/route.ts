import { NextRequest } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateFounderMagicLink,
  sendFounderInvitationEmail,
} from '@/lib/auth/founders-admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/founders/[id]/invite
// Mints a fresh magic link and resends the invitation email. Used both for
// genuinely re-sending after a long delay and for the "Generate new magic
// link" admin action when a member is locked out of their email.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: { personal_note?: string } = {}
  try {
    // Body is optional. Allow empty.
    const raw = request.headers.get('content-length')
    if (raw && raw !== '0') body = (await request.json()) ?? {}
  } catch {
    // Ignore — treat as no body.
  }

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const { data: founder, error: lookupError } = await supabase
      .from('founders')
      .select('user_id, email, full_name')
      .eq('user_id', id)
      .maybeSingle()

    if (lookupError || !founder) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
    }

    const adminEmail = await getCurrentUserEmail()

    const actionLink = await generateFounderMagicLink(founder.email)
    const result = await sendFounderInvitationEmail({
      toEmail: founder.email,
      fullName: founder.full_name,
      actionLink,
      personalNote: body.personal_note ?? null,
      invitedByName: adminEmail ?? null,
    })

    if (adminEmail) {
      await logActivity(
        adminEmail,
        'update',
        'invitation',
        founder.user_id,
        founder.full_name,
        { action: 'invite_resent', email_sent: result.success }
      )
    }

    return successResponse({ sent: result.success })
  } catch (err) {
    console.error('admin/founders/[id]/invite POST error:', err)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to send invitation email',
      500
    )
  }
}
