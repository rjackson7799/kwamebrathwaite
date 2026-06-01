import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminPrintFulfillmentSchema,
} from '@/lib/api'
import { requireAdmin, logActivity, getCurrentUserEmail } from '@/lib/api/admin'
import { createAdminClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/founders/[id]/print-fulfillment
// Returns the full row (including internal_notes) for the admin panel.
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data, error } = await supabase
    .from('founder_print_fulfillments')
    .select('*')
    .eq('user_id', id)
    .maybeSingle()

  if (error) {
    console.error('admin print-fulfillment GET error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to read fulfillment', 500)
  }

  return successResponse({ fulfillment: data ?? null })
}

// POST /api/admin/founders/[id]/print-fulfillment
// Upsert: creates the row if absent, updates if present.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminPrintFulfillmentSchema.safeParse(body)
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

  // Look up the founder's name + existing row (for activity diff + COA date).
  const [{ data: founder }, { data: existing }] = await Promise.all([
    supabase
      .from('founders')
      .select('full_name, recognition_name')
      .eq('user_id', id)
      .maybeSingle(),
    supabase
      .from('founder_print_fulfillments')
      .select('edition_number, status, coa_issued_at')
      .eq('user_id', id)
      .maybeSingle(),
  ])

  if (!founder) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'Founder not found', 404)
  }

  // The COA issuance date is persisted (never render-time) and stamped the
  // first time an edition number is assigned; preserved thereafter (upsert
  // replaces the whole row, so we must carry it forward explicitly).
  const coaIssuedAt =
    data.edition_number != null
      ? existing?.coa_issued_at ?? new Date().toISOString()
      : existing?.coa_issued_at ?? null

  const row = {
    user_id: id,
    edition_number: data.edition_number ?? null,
    is_ap: data.is_ap ?? false,
    status: data.status,
    shipped_at: data.shipped_at || null,
    delivered_at: data.delivered_at || null,
    tracking_url: data.tracking_url || null,
    internal_notes: data.internal_notes ?? null,
    coa_issued_at: coaIssuedAt,
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('founder_print_fulfillments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (upsertError) {
    console.error('admin print-fulfillment POST error:', upsertError)
    if (upsertError.code === '23505') {
      // Unique-index violation on edition_number (scoped per numbered/AP group).
      return errorResponse(
        ErrorCodes.DUPLICATE_ENTRY,
        `${data.is_ap ? "Artist's Proof" : 'Edition'} ${data.edition_number} is already assigned to another founder.`,
        409
      )
    }
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to save fulfillment', 500)
  }

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    const wasCreate = !existing
    const statusChanged = Boolean(existing && existing.status !== data.status)
    const action = wasCreate
      ? 'create'
      : statusChanged
      ? 'status_change'
      : 'update'
    await logActivity(
      adminEmail,
      action,
      'founder_print_fulfillment',
      id,
      founder.recognition_name || founder.full_name,
      {
        edition_number: data.edition_number,
        status: data.status,
        previous_status: existing?.status ?? null,
      }
    )
  }

  return successResponse({ fulfillment: upserted })
}

// DELETE /api/admin/founders/[id]/print-fulfillment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { errorResponse: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: founder } = await supabase
    .from('founders')
    .select('full_name, recognition_name')
    .eq('user_id', id)
    .maybeSingle()

  const { error: deleteError } = await supabase
    .from('founder_print_fulfillments')
    .delete()
    .eq('user_id', id)

  if (deleteError) {
    console.error('admin print-fulfillment DELETE error:', deleteError)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to delete fulfillment', 500)
  }

  const adminEmail = await getCurrentUserEmail()
  if (adminEmail) {
    await logActivity(
      adminEmail,
      'delete',
      'founder_print_fulfillment',
      id,
      founder?.recognition_name || founder?.full_name || null
    )
  }

  return successResponse({ deleted: true })
}
