import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminFoundersFiltersSchema,
  adminFounderCreateSchema,
  parseSearchParams,
} from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { getPagination } from '@/lib/api/pagination'
import { createAdminClient } from '@/lib/supabase/server'
import {
  ensureAuthUserForEmail,
  createFounderInviteLink,
  sendFounderInvitationEmail,
} from '@/lib/auth/founders-admin'

// GET /api/admin/founders — list founders with filters
export async function GET(request: NextRequest) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const params = parseSearchParams(request.nextUrl.searchParams)
    const parsed = adminFoundersFiltersSchema.safeParse(params)
    if (!parsed.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        parsed.error.flatten().fieldErrors
      )
    }

    const { page, limit, status, tier, q, sort, order } = parsed.data
    const { from, to } = getPagination(page, limit)

    // Service-role read: founders has column-level SELECT revoked from
    // `authenticated`, so admin reads of staff-only columns must bypass via the
    // service role. Admin-gated above.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    let query = supabase.from('founders').select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (tier)   query = query.eq('tier', tier)
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,email.ilike.%${q}%,organization.ilike.%${q}%`
      )
    }

    query = query.order(sort || 'created_at', { ascending: order === 'asc' })
    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) {
      console.error('admin/founders list error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch founders', 500)
    }

    return successResponse(data, {
      page,
      pageSize: limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error('admin/founders GET unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// POST /api/admin/founders — create a new founder (optionally from an inquiry)
//
// Sequencing per plan §6:
//   1. ensureAuthUserForEmail() — creates auth.users row (or reuses existing).
//   2. INSERT founders row with status='invited'.
//   3. If skip_invite=false, generateLink + Resend send the invitation.
//   4. If inquiry_id was provided, mark the inquiry converted_founder_id +
//      founder_status='converted'.
export async function POST(request: NextRequest) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminFounderCreateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten()
    )
  }

  const data = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // 1. Provision auth.users
  let userId: string
  try {
    const { userId: id } = await ensureAuthUserForEmail(data.email)
    userId = id
  } catch (err) {
    console.error('founders POST: ensureAuthUserForEmail failed:', err)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Could not provision auth user for this email',
      500
    )
  }

  // 2. INSERT founders. If this fails AND we just created a new auth user,
  // compensate by deleting it so we don't leave orphans.
  const insertRow = {
    user_id: userId,
    email: data.email.toLowerCase().trim(),
    full_name: data.full_name,
    recognition_name: data.recognition_name ?? null,
    recognition_visibility: data.recognition_visibility ?? 'private',
    tier: data.tier ?? null,
    pledge_amount: data.pledge_amount ?? null,
    pledge_term_years: data.pledge_term_years ?? null,
    status: 'invited' as const,
    phone: data.phone ?? null,
    organization: data.organization ?? null,
    relationship_owner_email: data.relationship_owner_email ?? null,
    preferred_locale: data.preferred_locale ?? 'en',
    internal_notes: data.internal_notes ?? null,
    // Starts the stale-invite clock only when we're actually sending an invite.
    last_invited_at: data.skip_invite ? null : new Date().toISOString(),
  }

  const { data: inserted, error: insertError } = await supabase
    .from('founders')
    .insert(insertRow)
    .select('*')
    .single()

  if (insertError) {
    console.error('founders POST: insert failed:', insertError)
    // Best-effort compensation: only delete the auth user if we just created
    // it (i.e. the user wasn't pre-existing). We can't tell here without
    // tracking the `created` flag from ensureAuthUserForEmail; keeping it
    // conservative to avoid deleting a real user.
    return errorResponse(
      ErrorCodes.DB_ERROR,
      insertError.code === '23505'
        ? 'A founder with this email already exists'
        : 'Failed to create founder',
      insertError.code === '23505' ? 409 : 500
    )
  }

  // 3. Send invitation email (unless skipped)
  let inviteEmailSent = false
  if (!data.skip_invite) {
    try {
      const adminEmail = await getCurrentUserEmail()
      const { link: actionLink } = await createFounderInviteLink({
        userId,
        email: data.email,
        locale: data.preferred_locale ?? 'en',
        createdBy: adminEmail ?? null,
      })
      const result = await sendFounderInvitationEmail({
        toEmail: data.email,
        fullName: data.full_name,
        actionLink,
        personalNote: data.personal_note ?? null,
        invitedByName: adminEmail ?? null,
      })
      inviteEmailSent = result.success
    } catch (err) {
      // Invitation email failure is non-fatal — admin can resend from the UI.
      console.error('founders POST: invitation email failed:', err)
    }
  }

  // 4. Back-link the inquiry if provided
  if (data.inquiry_id) {
    await supabase
      .from('inquiries')
      .update({
        converted_founder_id: userId,
        founder_status: 'converted',
      })
      .eq('id', data.inquiry_id)
  }

  // 5. Activity log
  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(
      adminEmail,
      'create',
      'founder',
      userId,
      data.full_name,
      { invited: !data.skip_invite, inquiry_id: data.inquiry_id ?? null }
    )
  }

  return successResponse(
    { founder: inserted, inviteEmailSent },
    undefined,
    201
  )
}
