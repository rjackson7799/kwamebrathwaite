import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  founderProfileUpdateSchema,
} from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { MEMBER_FOUNDER_COLUMNS } from '@/lib/auth/founders'

// GET /api/founders/profile — read the current Founder's row.
// Uses the SSR client + RLS (founders_select policy allows the row owner).
// Projects MEMBER_FOUNDER_COLUMNS only — staff-only columns have column-level
// SELECT revoked from the member role, so select('*') would error.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('founders')
    .select(MEMBER_FOUNDER_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('founders/profile GET error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to load profile', 500)
  }
  if (!data) {
    return errorResponse(ErrorCodes.NOT_FOUND, 'No founder record for this user', 404)
  }
  return successResponse(data)
}

// PATCH /api/founders/profile — member self-update.
//
// Two layers of defense:
//   1. founderProfileUpdateSchema is a narrow whitelist (no tier/pledge/
//      status/internal_notes/relationship_owner_email/email).
//   2. founders_guard_admin_only_columns() BEFORE UPDATE trigger in the DB
//      RAISES on any non-admin attempt to mutate those columns. So even a
//      malicious client bypassing this route can't escalate.
//
// We use the SSR client (RLS-enforced) — the row update happens as the user's
// session, so RLS founders_update policy gates it on user_id=auth.uid().
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = founderProfileUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten()
    )
  }

  // Build update payload from provided fields only (so undefined never
  // overwrites to null).
  const updateData: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updateData[k] = v
  }

  if (Object.keys(updateData).length === 0) {
    return successResponse({ message: 'No changes to save' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('founders')
    .update(updateData)
    .eq('user_id', user.id)
    .select(MEMBER_FOUNDER_COLUMNS)
    .single()

  if (error) {
    console.error('founders/profile PATCH error:', error)
    // The column-guard trigger raises with messages like "admin-only: tier".
    // Surface that distinctly so the UI can show the user a clear error.
    if (error.message?.includes('admin-only:')) {
      return errorResponse(
        'FORBIDDEN',
        'That field can only be changed by an administrator.',
        403
      )
    }
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to update profile', 500)
  }

  return successResponse(data)
}
