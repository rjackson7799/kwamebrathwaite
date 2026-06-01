import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminFounderActivateSchema,
} from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>  // founders.user_id (uuid)
}

// POST /api/admin/founders/[id]/activate
//
// The deliberate "confirm donation & activate" money gate. Distinct from the
// status dropdown (PATCH) so activation is intentional and audited. Only an
// `invited` founder can be activated here; this records the donation, stamps
// activated_at/activated_by, and flips status to 'active' (which unlocks the
// portal). Uses the service-role client (admin-gated above) so it can write
// the admin-only columns past the column guard.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminFounderActivateSchema.safeParse(body)
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

    const { data: current, error: lookupError } = await supabase
      .from('founders')
      .select('user_id, status, activated_at, full_name')
      .eq('user_id', id)
      .maybeSingle()

    if (lookupError) {
      console.error('admin/founders/[id]/activate lookup error:', lookupError)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to load founder', 500)
    }
    if (!current) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
    }
    if (current.status !== 'invited') {
      return errorResponse(
        'CONFLICT',
        `Only an invited founder can be activated here (current status: ${current.status}).`,
        409
      )
    }

    const adminEmail = await getCurrentUserEmail()
    const nowIso = new Date().toISOString()

    const update: Record<string, unknown> = {
      status: 'active',
      donation_confirmed_at: nowIso,
      activated_by: adminEmail ?? null,
      // Stamp activated_at only on first activation.
      activated_at: current.activated_at ?? nowIso,
    }
    if (parsed.data.donation_amount !== undefined) update.donation_amount = parsed.data.donation_amount
    if (parsed.data.payment_reference !== undefined) update.payment_reference = parsed.data.payment_reference
    if (parsed.data.terms_version !== undefined) update.terms_version = parsed.data.terms_version

    const { data, error } = await supabase
      .from('founders')
      .update(update)
      .eq('user_id', id)
      // Guard against a race: only flip while still invited.
      .eq('status', 'invited')
      .select('user_id, full_name, status')
      .maybeSingle()

    if (error) {
      console.error('admin/founders/[id]/activate update error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to activate founder', 500)
    }
    if (!data) {
      return errorResponse('CONFLICT', 'Founder is no longer invited', 409)
    }

    if (adminEmail) {
      await logActivity(adminEmail, 'status_change', 'founder', id, current.full_name, {
        status: 'active',
        donation_confirmed: true,
        payment_reference: parsed.data.payment_reference ?? null,
      })
    }

    return successResponse({ activated: true })
  } catch (err) {
    console.error('admin/founders/[id]/activate unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
