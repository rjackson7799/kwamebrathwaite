import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

// GET /api/founders/security/mfa/factors
// Lists the current user's MFA factors. Used by the Security page to decide
// whether to show "Enable 2FA" or "2FA enabled — Disable" UI.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).auth.mfa.listFactors()
  if (error) {
    console.error('mfa.listFactors error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to list factors', 500)
  }

  // data: { all, totp, phone }. We only care about totp + a verified flag.
  const totp = (data?.totp ?? []).map(
    (f: { id: string; friendly_name: string | null; status: string; created_at: string }) => ({
      id: f.id,
      friendly_name: f.friendly_name,
      status: f.status,        // 'unverified' | 'verified'
      created_at: f.created_at,
    })
  )
  const verified = totp.some((f: { status: string }) => f.status === 'verified')

  return successResponse({ totp, verified })
}
