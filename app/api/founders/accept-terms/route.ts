import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimitPersistent,
} from '@/lib/api'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { FOUNDER_TERMS_VERSION } from '@/lib/founders/terms'

// POST /api/founders/accept-terms — member accepts the Founder terms on the
// invitation page (hold-until-2036 + secondary-market contribution + donation
// acknowledgment). Records terms_version + terms_accepted_at.
//
// Same service-role + own-row + status='invited' safety pattern as decline:
// user_id from the verified session, never the body.
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
  const nowIso = new Date().toISOString()
  const { data, error } = await admin
    .from('founders')
    .update({ terms_version: FOUNDER_TERMS_VERSION, terms_accepted_at: nowIso })
    .eq('user_id', user.id)
    .eq('status', 'invited')
    .select('user_id, terms_accepted_at')
    .maybeSingle()

  if (error) {
    console.error('founders/accept-terms error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to record terms acceptance', 500)
  }

  return successResponse({
    accepted: data !== null,
    terms_accepted_at: data?.terms_accepted_at ?? null,
  })
}
