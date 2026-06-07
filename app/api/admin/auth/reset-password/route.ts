import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  adminPasswordUpdateSchema,
} from '@/lib/api'

// POST /api/admin/auth/reset-password
//
// Step 2 of the admin password reset. Uses the recovery session established by
// /api/admin/auth/reset-password/verify (cookie-bound) to set the new
// password, then signs out so the short-lived recovery session can't linger —
// the admin signs in fresh with the new password.
//
// Body: { password: string }
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminPasswordUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten().fieldErrors
    )
  }

  const supabase = await createClient()

  // Require the recovery session (set by the verify step) and confirm it's an
  // admin before changing anything.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse(
      'UNAUTHORIZED',
      'Your reset session has expired. Please request a new link.',
      401
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: isAdmin, error: rpcError } = await (supabase as any).rpc(
    'is_admin',
    { uid: user.id }
  )
  if (rpcError || !isAdmin) {
    await supabase.auth.signOut()
    return errorResponse('FORBIDDEN', 'This account does not have admin access.', 403)
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (updateError) {
    return errorResponse(
      'UPDATE_FAILED',
      updateError.message || 'Could not update password. Please try again.',
      400
    )
  }

  // Drop the recovery session — force a fresh sign-in with the new password.
  await supabase.auth.signOut()

  return successResponse({ message: 'Password updated.' })
}
