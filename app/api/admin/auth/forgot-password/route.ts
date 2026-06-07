import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimitPersistent,
  getClientIP,
  adminPasswordResetRequestSchema,
} from '@/lib/api'
import {
  adminEmailExists,
  generateAdminPasswordResetLink,
  sendAdminPasswordResetEmail,
} from '@/lib/auth/admins-admin'

// POST /api/admin/auth/forgot-password
//
// Public-facing admin password-reset request. Returns the SAME generic
// response whether the email belongs to an admin or not (admin-enumeration
// leak prevention).
//
// Defenses (mirrors /api/founders/auth/request-otp):
//   - Honeypot field
//   - Persistent per-IP and per-email rate limits (survive Vercel cold starts)
//   - Membership check before generateLink (only real admins get an email)
const GENERIC_MESSAGE =
  'If that email belongs to an admin, a reset link is on its way.'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = adminPasswordResetRequestSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      parsed.error.flatten()
    )
  }

  const { website, email } = parsed.data

  // Honeypot — return fake success without doing anything.
  if (website) {
    return successResponse({ message: GENERIC_MESSAGE })
  }

  const normalisedEmail = email.toLowerCase().trim()
  const clientIP = getClientIP(request)

  // Rate limit — per-IP first (cheap short-circuit for abusive spray), then
  // per-email (protects a single admin from an email-bomb).
  const ipLimit = await rateLimitPersistent(
    'admin_pwreset_ip',
    `ip:${clientIP}`,
    3,
    60 * 1000 // 3 per minute per IP
  )
  if (!ipLimit.success) {
    return errorResponse(
      ErrorCodes.RATE_LIMIT,
      'Too many requests. Please try again in a minute.',
      429
    )
  }

  const emailLimit = await rateLimitPersistent(
    'admin_pwreset_email',
    `email:${normalisedEmail}`,
    5,
    60 * 60 * 1000 // 5 per hour per email
  )
  if (!emailLimit.success) {
    return errorResponse(
      ErrorCodes.RATE_LIMIT,
      'Too many requests. Please try again later.',
      429
    )
  }

  // Membership check. If false, return the same generic success WITHOUT
  // generating a link (no shadow auth.users row, no enumeration signal).
  const exists = await adminEmailExists(normalisedEmail)
  if (!exists) {
    return successResponse({ message: GENERIC_MESSAGE })
  }

  // Real admin. Generate the recovery link and send it via Resend.
  try {
    const actionLink = await generateAdminPasswordResetLink(normalisedEmail)
    await sendAdminPasswordResetEmail({
      toEmail: normalisedEmail,
      actionLink,
    })
    return successResponse({ message: GENERIC_MESSAGE })
  } catch (err) {
    console.error('admin/auth/forgot-password send failed:', err)
    // Still return the generic success — never leak failure details to a
    // public caller, and don't let a transient Resend outage confirm whether
    // an email is or isn't an admin.
    return successResponse({ message: GENERIC_MESSAGE })
  }
}
