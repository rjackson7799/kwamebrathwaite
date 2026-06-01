import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimitPersistent,
} from '@/lib/api'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/founders/decline — member self-declines their invitation.
//
// The founders column-guard trigger blocks a member from changing their own
// `status` via the SSR client, so this uses the service-role client. Security
// is provided by:
//   1. user_id is derived from the verified session — NEVER from the body.
//   2. the .eq('status','invited') predicate — this can ONLY move a pending
//      invitation to 'declined'; it can never touch an active/paused/archived
//      member. Re-running is a benign no-op.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  const limit = await rateLimitPersistent(
    'founder_self_action',
    `user:${user.id}`,
    10,
    60 * 60 * 1000
  )
  if (!limit.success) {
    return errorResponse(ErrorCodes.RATE_LIMIT, 'Too many requests. Try again later.', 429)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from('founders')
    .update({ status: 'declined' })
    .eq('user_id', user.id)
    .eq('status', 'invited')
    .select('user_id')
    .maybeSingle()

  if (error) {
    console.error('founders/decline error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to decline invitation', 500)
  }

  return successResponse({ declined: data !== null })
}
