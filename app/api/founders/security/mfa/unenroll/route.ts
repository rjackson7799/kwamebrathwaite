import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  factorId: z.string().min(1),
})

// POST /api/founders/security/mfa/unenroll
// Disables a TOTP factor. The user can re-enroll later via /enroll.
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

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'factorId required', 400)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).auth.mfa.unenroll({
    factorId: parsed.data.factorId,
  })
  if (error) {
    console.error('mfa.unenroll error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Could not disable 2FA', 500)
  }

  return successResponse({ unenrolled: true })
}
