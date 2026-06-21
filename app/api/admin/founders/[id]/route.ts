import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminFounderUpdateSchema,
} from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'
import { checkStatusTransition } from '@/lib/founders/lifecycle'
import { revokeFounderInviteLinks } from '@/lib/auth/founders-admin'

interface RouteParams {
  params: Promise<{ id: string }>  // founders.user_id (uuid)
}

// GET /api/admin/founders/[id]
// Service-role read: the founders base table has column-level SELECT revoked
// from `authenticated`, so admin reads of staff-only columns (internal_notes,
// pledge_*, etc.) must use the service-role client. Admin-gated above.
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { data, error } = await supabase
      .from('founders')
      .select('*')
      .eq('user_id', id)
      .maybeSingle()

    if (error) {
      console.error('admin/founders/[id] GET error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch founder', 500)
    }
    if (!data) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
    }

    return successResponse(data)
  } catch (err) {
    console.error('admin/founders/[id] GET unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// PATCH /api/admin/founders/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminFounderUpdateSchema.safeParse(body)
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

    // Pick only provided fields (so undefined doesn't overwrite to null).
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updateData[key] = value
    }

    // Enforce the status lifecycle server-side.
    if (typeof updateData.status === 'string') {
      const { data: current, error: curErr } = await supabase
        .from('founders')
        .select('status')
        .eq('user_id', id)
        .maybeSingle()
      if (curErr) {
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to load founder', 500)
      }
      if (!current) {
        return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
      }
      const from = current.status as string
      const to = updateData.status as string
      const verdict = checkStatusTransition(from, to)
      if (verdict === 'needs-activation') {
        return errorResponse(
          'FORBIDDEN',
          'Use “Confirm donation & activate” to activate an invited founder.',
          403
        )
      }
      if (verdict === 'forbidden') {
        return errorResponse(
          'FORBIDDEN',
          `Status change ${from} → ${to} is not allowed.`,
          403
        )
      }
    }

    const { data, error } = await supabase
      .from('founders')
      .update(updateData)
      .eq('user_id', id)
      .select('*')
      .single()

    if (error) {
      console.error('admin/founders/[id] PATCH error:', error)
      return errorResponse(
        ErrorCodes.DB_ERROR,
        error.code === 'PGRST116' ? 'Founder not found' : 'Failed to update founder',
        error.code === 'PGRST116' ? 404 : 500
      )
    }

    const adminEmail = await getCurrentUserEmail()
    if (adminEmail) {
      await logActivity(
        adminEmail,
        'update',
        'founder',
        id,
        data.full_name,
        { changed_fields: Object.keys(updateData) }
      )
    }

    return successResponse(data)
  } catch (err) {
    console.error('admin/founders/[id] PATCH unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// DELETE /api/admin/founders/[id]
// Soft-delete: sets status='archived'. We don't hard-delete because the
// row may be referenced by inquiries.converted_founder_id (with ON DELETE
// SET NULL), and an "archive" is the reversible operation an admin expects.
// True hard-delete is reserved for future Phase 4+ work if needed.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const { data, error } = await supabase
      .from('founders')
      .update({ status: 'archived' })
      .eq('user_id', id)
      .select('user_id, full_name')
      .single()

    if (error) {
      console.error('admin/founders/[id] DELETE (archive) error:', error)
      return errorResponse(
        ErrorCodes.DB_ERROR,
        error.code === 'PGRST116' ? 'Founder not found' : 'Failed to archive founder',
        error.code === 'PGRST116' ? 404 : 500
      )
    }

    // Best-effort: kill outstanding durable links on archive (hygiene; the
    // bridge also rejects archived founders).
    try {
      await revokeFounderInviteLinks(id)
    } catch (linkErr) {
      console.error('admin/founders/[id] DELETE: link cleanup failed', linkErr)
    }

    const adminEmail = await getCurrentUserEmail()
    if (adminEmail) {
      await logActivity(
        adminEmail,
        'status_change',
        'founder',
        id,
        data.full_name,
        { status: 'archived' }
      )
    }

    return successResponse({ archived: true })
  } catch (err) {
    console.error('admin/founders/[id] DELETE unexpected:', err)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}
