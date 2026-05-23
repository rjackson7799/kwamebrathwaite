import { successResponse, errorResponse, ErrorCodes } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

// POST /api/founders/security/mfa/enroll
// Starts a TOTP enrollment. Returns the QR code (SVG data URI) and the
// secret so the user can either scan or type into their authenticator app.
// The factor is created in 'unverified' state — completed only after a
// successful POST to /verify with the 6-digit code.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  // If the user already has a verified TOTP factor, refuse — they should
  // disable and re-enroll if they want a new device.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: factors } = await (supabase as any).auth.mfa.listFactors()
  const existingVerified = (factors?.totp ?? []).find(
    (f: { status: string }) => f.status === 'verified'
  )
  if (existingVerified) {
    return errorResponse(
      'ALREADY_ENROLLED',
      'Two-factor authentication is already enabled. Disable it first to re-enroll.',
      409
    )
  }

  // Clean up any leftover unverified factor from a prior abandoned attempt
  // so we don't pile them up.
  for (const f of (factors?.totp ?? []) as Array<{ id: string; status: string }>) {
    if (f.status === 'unverified') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).auth.mfa.unenroll({ factorId: f.id })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Founder's Circle (${new Date().toISOString().slice(0, 10)})`,
    issuer: 'Kwame Brathwaite Archive',
  })
  if (error || !data) {
    console.error('mfa.enroll error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Could not start enrollment', 500)
  }

  return successResponse({
    factorId: data.id,
    qrCode: data.totp.qr_code,        // SVG data URI
    secret: data.totp.secret,         // base32 secret for manual entry
    uri: data.totp.uri,               // otpauth:// URI
  })
}
