import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimitPersistent,
  getClientIP,
  founderOtpRequestSchema,
} from '@/lib/api'
import {
  founderEmailExists,
} from '@/lib/auth/founders'
import {
  generateFounderMagicLink,
  sendFounderMagicLinkEmail,
} from '@/lib/auth/founders-admin'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/founders/auth/request-otp
//
// Public-facing magic-link request. Returns the SAME generic response whether
// the email is a real Founder or not (membership-leak prevention).
//
// Defenses:
//   - Honeypot
//   - Persistent per-IP and per-email rate limits (survives Vercel cold starts)
//   - Membership-existence check before generateLink (no auth.users row gets
//     silently created for unknown emails)
//   - shouldCreateUser:false on generateLink as belt-and-braces
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const parsed = founderOtpRequestSchema.safeParse(body)
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
    return successResponse({
      message:
        "If your email is on file, you'll receive a sign-in link shortly.",
    })
  }

  const normalisedEmail = email.toLowerCase().trim()
  const clientIP = getClientIP(request)

  // Rate limit — per-IP first (cheaper to short-circuit abusive spray),
  // then per-email (protects a single Founder from email-bomb attacks).
  const ipLimit = await rateLimitPersistent(
    'founder_otp_ip',
    `ip:${clientIP}`,
    3,
    60 * 1000  // 3 per minute per IP
  )
  if (!ipLimit.success) {
    return errorResponse(
      ErrorCodes.RATE_LIMIT,
      'Too many requests. Please try again in a minute.',
      429
    )
  }

  const emailLimit = await rateLimitPersistent(
    'founder_otp_email',
    `email:${normalisedEmail}`,
    5,
    60 * 60 * 1000  // 5 per hour per email
  )
  if (!emailLimit.success) {
    return errorResponse(
      ErrorCodes.RATE_LIMIT,
      'Too many requests. Please try again later.',
      429
    )
  }

  // Membership-existence check.  If false, return the same generic success
  // response WITHOUT calling generateLink (which could otherwise create a
  // shadow auth.users row even with shouldCreateUser:false in some edge cases).
  const exists = await founderEmailExists(normalisedEmail)
  if (!exists) {
    return successResponse({
      message:
        "If your email is on file, you'll receive a sign-in link shortly.",
    })
  }

  // Real Founder.  Generate the link and send it via Resend.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // Look up the full_name so the email can use it in the salutation.
    const { data: founder } = await supabase
      .from('founders')
      .select('full_name')
      .eq('email', normalisedEmail)
      .maybeSingle()

    const actionLink = await generateFounderMagicLink(normalisedEmail)
    await sendFounderMagicLinkEmail({
      toEmail: normalisedEmail,
      fullName: founder?.full_name ?? null,
      actionLink,
    })

    return successResponse({
      message:
        "If your email is on file, you'll receive a sign-in link shortly.",
    })
  } catch (err) {
    console.error('founders/auth/request-otp send failed:', err)
    // Still return the generic success message — never leak failure details
    // to a public caller, and we don't want a transient Resend outage to
    // confirm that an email IS or ISN'T on file.
    return successResponse({
      message:
        "If your email is on file, you'll receive a sign-in link shortly.",
    })
  }
}
