import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

const verifySchema = z.object({
  factorId: z.string().min(1),
  code: z.string().min(6).max(6).regex(/^\d{6}$/, 'Enter a 6-digit code'),
})

// POST /api/founders/security/mfa/verify
// Confirms an unverified TOTP factor by accepting the 6-digit code from the
// authenticator app. On success the factor flips to 'verified' and the user
// has 2FA enabled.
//
// Note for Phase 1D: enrolling here gives the user a verified factor but
// does NOT yet enforce a step-up challenge at next sign-in (that would
// require a 2FA prompt UI between verifyOtp and reaching the portal —
// scheduled as later polish). For now the factor is recorded and can be
// disabled cleanly; sign-in enforcement is a deliberate Phase 4 follow-on.
export async function POST(request: NextRequest) {
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

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Enter the 6-digit code from your authenticator app.',
      400,
      parsed.error.flatten()
    )
  }

  const { factorId, code } = parsed.data

  // The MFA verify flow needs a challenge → verify sequence.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: challenge, error: challengeError } = await (supabase as any).auth.mfa.challenge({
    factorId,
  })
  if (challengeError || !challenge?.id) {
    console.error('mfa.challenge error:', challengeError)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Could not start verification', 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: verifyError } = await (supabase as any).auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })
  if (verifyError) {
    // The most common case: wrong code or stale (TOTP windows are 30s).
    return errorResponse(
      'INVALID_CODE',
      verifyError.message ?? 'That code did not match. Try the next one your app shows.',
      400
    )
  }

  return successResponse({ verified: true })
}
