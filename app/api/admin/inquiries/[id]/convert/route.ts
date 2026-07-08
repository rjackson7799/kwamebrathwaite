import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  ensureAuthUserForEmail,
  createFounderInviteLink,
  sendFounderInvitationEmail,
} from '@/lib/auth/founders-admin'

// Body schema: allow the admin to override the name (sometimes the inquiry
// name is a typo) and to add a personal note in the invitation email.
const convertBodySchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  personal_note: z.string().max(2000).optional().nullable(),
  preferred_locale: z.enum(['en', 'fr', 'ja']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>  // inquiries.id
}

// POST /api/admin/inquiries/[id]/convert
//
// One-call "Convert to Founder invitation" action.  Carries the inquiry's
// name/email/locale across into the founders record and sends the magic-link
// invitation in a single transaction-like sequence.
//
// Per plan §6 sequencing:
//   1. Load the inquiry.  Reject if not a founder_inquiry or already
//      converted_founder_id is set.
//   2. ensureAuthUserForEmail() — creates or reuses the auth.users row.
//   3. INSERT into founders (status='invited').  On failure, compensate by
//      deleting the auth user IF we just created it (preserves real users).
//   4. generateLink + Resend the invitation email.
//   5. Mark the inquiry: converted_founder_id, founder_status='converted'.
//   6. Activity log.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: unknown = {}
  try {
    const raw = request.headers.get('content-length')
    if (raw && raw !== '0') body = (await request.json()) ?? {}
  } catch {
    // Empty body is fine — all fields are optional.
  }

  const parsed = convertBodySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten()
    )
  }

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // 1. Load inquiry
    const { data: inquiry, error: loadError } = await supabase
      .from('inquiries')
      .select('id, name, email, source, founder_status, converted_founder_id, locale')
      .eq('id', id)
      .maybeSingle()

    if (loadError || !inquiry) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Inquiry not found', 404)
    }
    if (inquiry.source !== 'founder_inquiry') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Only founder_inquiry rows can be converted',
        400
      )
    }
    if (inquiry.converted_founder_id) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'This inquiry has already been converted',
        409
      )
    }

    const fullName = parsed.data.full_name ?? inquiry.name
    const locale = parsed.data.preferred_locale ?? (inquiry.locale || 'en')

    // 2. Provision auth.users
    let userId: string
    let createdNewAuthUser: boolean
    try {
      const result = await ensureAuthUserForEmail(inquiry.email)
      userId = result.userId
      createdNewAuthUser = result.created
    } catch (err) {
      console.error('convert: ensureAuthUserForEmail failed:', err)
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Could not provision an auth user for this email',
        500
      )
    }

    // 3. INSERT founders — with compensation on failure if we just created the auth user
    const { data: founder, error: insertError } = await supabase
      .from('founders')
      .insert({
        user_id: userId,
        email: inquiry.email.toLowerCase().trim(),
        full_name: fullName,
        status: 'invited',
        preferred_locale: locale,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('convert: founders insert failed:', insertError)
      if (createdNewAuthUser) {
        // Best-effort compensation
        try {
          await supabase.auth.admin.deleteUser(userId)
        } catch (delErr) {
          console.error('convert: compensation deleteUser failed:', delErr)
        }
      }
      return errorResponse(
        ErrorCodes.DB_ERROR,
        insertError.code === '23505'
          ? 'A founder with this email already exists — open them in /admin/founders instead'
          : 'Failed to create founder record',
        insertError.code === '23505' ? 409 : 500
      )
    }

    // 4. Send invitation email
    const adminEmail = await getCurrentUserEmail()
    let inviteEmailSent = false
    try {
      const { link: actionLink } = await createFounderInviteLink({
        userId,
        email: inquiry.email,
        locale,
        createdBy: adminEmail ?? null,
      })
      const sendResult = await sendFounderInvitationEmail({
        toEmail: inquiry.email,
        fullName,
        actionLink,
        personalNote: parsed.data.personal_note ?? null,
        invitedByName: adminEmail ?? null,
      })
      inviteEmailSent = sendResult.success
    } catch (err) {
      console.error('convert: invitation email failed:', err)
      // Non-fatal — the founder row exists; admin can resend from the UI.
    }

    // 5. Mark the inquiry
    await supabase
      .from('inquiries')
      .update({
        converted_founder_id: userId,
        founder_status: 'converted',
      })
      .eq('id', id)

    // 6. Activity log
    if (adminEmail) {
      await logActivity(
        adminEmail,
        'create',
        'invitation',
        userId,
        fullName,
        {
          inquiry_id: id,
          invite_email_sent: inviteEmailSent,
        }
      )
    }

    return successResponse(
      {
        founder,
        inviteEmailSent,
      },
      undefined,
      201
    )
  } catch (err) {
    console.error('convert POST unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
