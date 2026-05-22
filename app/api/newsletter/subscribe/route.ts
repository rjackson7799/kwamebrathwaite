import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
  newsletterSchema,
} from '@/lib/api'
import { sendUserEmail } from '@/lib/email/send'
import { NewsletterConfirmEmail } from '@/lib/email/templates'

// Per-email throttling for confirmation emails.
// Defeats the email-bomb vector where an attacker rotates IPs (in-memory rate
// limit isn't durable) to spam confirmation emails at a victim's address.
const CONFIRM_RESEND_COOLDOWN_MS = 15 * 60 * 1000 // 15 minutes between sends
const CONFIRM_RESEND_MAX = 5                       // hard cap per address

interface NewsletterInsert {
  email: string
  locale: string
  confirmed_at: null
  confirmation_sent_at: string
  confirmation_send_count: number
}

const GENERIC_PENDING_RESPONSE = {
  message: 'Thanks — check your inbox to confirm your subscription.',
  alreadySubscribed: false,
}

function buildConfirmUrl(locale: string, token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const localePrefix = locale === 'en' ? '' : `/${locale}`
  // Scanner-safe: link points to a page that requires a button click + form POST
  // to actually confirm. Email scanners (Defender / Outlook Safe Links /
  // Proofpoint / Mimecast) will prefetch the link, but the page is read-only.
  return `${siteUrl}${localePrefix}/newsletter/confirm?token=${token}`
}

async function sendConfirmation(email: string, locale: string, token: string) {
  const confirmUrl = buildConfirmUrl(locale, token)
  const result = await sendUserEmail(
    email,
    'Please confirm your newsletter subscription',
    NewsletterConfirmEmail({ confirmUrl })
  )
  if (!result.success) {
    console.error('Newsletter confirmation email send failed:', {
      subscriberEmail: email,
      error: result.error,
    })
  }
  return result
}

function isWithinCooldown(sentAt: string | null): boolean {
  if (!sentAt) return false
  return Date.now() - new Date(sentAt).getTime() < CONFIRM_RESEND_COOLDOWN_MS
}

export async function POST(request: NextRequest) {
  try {
    // Coarse per-IP rate limiting (in-memory, single-instance — second line of
    // defense; per-email throttling below is the durable one).
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`newsletter:${clientIP}`, 3, 60000)
    if (!rateLimitResult.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
    }

    const validationResult = newsletterSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validationResult.error.flatten()
      )
    }

    const { website, ...subscribeData } = validationResult.data
    const { email, locale } = subscribeData
    const normalizedEmail = email.toLowerCase()

    // Honeypot — bots fill hidden fields. Return generic success so they don't
    // learn anything from the response.
    if (website) {
      return successResponse(GENERIC_PENDING_RESPONSE)
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select(
        'id, unsubscribed_at, confirmed_at, confirmation_token, confirmation_sent_at, confirmation_send_count'
      )
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      const existingRow = existing as {
        id: string
        unsubscribed_at: string | null
        confirmed_at: string | null
        confirmation_token: string
        confirmation_sent_at: string | null
        confirmation_send_count: number
      }

      // Previously unsubscribed — reactivate as pending, rotate the token (so
      // any previously emitted confirm link can't be replayed), and reset the
      // send counter.
      if (existingRow.unsubscribed_at) {
        const nowIso = new Date().toISOString()
        const { data: reactivated, error: reactivateError } = await supabase
          .from('newsletter_subscribers')
          .update({
            unsubscribed_at: null,
            confirmed_at: null,
            confirmation_token: crypto.randomUUID(),
            confirmation_sent_at: nowIso,
            confirmation_send_count: 1,
            locale,
          } as never)
          .eq('id', existingRow.id)
          .select('confirmation_token')
          .single()

        if (reactivateError) {
          console.error('Reactivation error:', reactivateError)
          return errorResponse(ErrorCodes.DB_ERROR, 'Failed to subscribe', 500)
        }

        const token = (reactivated as { confirmation_token: string } | null)
          ?.confirmation_token
        if (token) {
          await sendConfirmation(normalizedEmail, locale, token)
        }

        return successResponse({ ...GENERIC_PENDING_RESPONSE, id: existingRow.id })
      }

      // Already confirmed and active — no email sent.
      if (existingRow.confirmed_at) {
        return successResponse({
          message: 'You are already subscribed to our newsletter.',
          alreadySubscribed: true,
        })
      }

      // Pending — re-send the confirmation if the per-email throttle allows.
      // Throttle anchors: confirmation_send_count (hard cap) +
      // confirmation_sent_at (cooldown window). The conditional update acts as
      // an optimistic compare-and-swap against concurrent re-send attempts.
      const withinCooldown = isWithinCooldown(existingRow.confirmation_sent_at)
      const atCap = existingRow.confirmation_send_count >= CONFIRM_RESEND_MAX

      if (!withinCooldown && !atCap) {
        const { data: bumped } = await supabase
          .from('newsletter_subscribers')
          .update({
            confirmation_send_count: existingRow.confirmation_send_count + 1,
            confirmation_sent_at: new Date().toISOString(),
          } as never)
          .eq('id', existingRow.id)
          .eq('confirmation_send_count', existingRow.confirmation_send_count)
          .select('confirmation_token')
          .single()

        const bumpedRow = bumped as { confirmation_token: string } | null
        if (bumpedRow) {
          await sendConfirmation(normalizedEmail, locale, bumpedRow.confirmation_token)
        }
        // If no row was updated, another concurrent request just incremented
        // first — silently skip our send. Either way, return the same response.
      }

      return successResponse(GENERIC_PENDING_RESPONSE)
    }

    // Brand new subscriber — insert pending row and send first confirmation.
    const insertData: NewsletterInsert = {
      email: normalizedEmail,
      locale,
      confirmed_at: null,
      confirmation_sent_at: new Date().toISOString(),
      confirmation_send_count: 1,
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert(insertData as never)
      .select('id, confirmation_token')
      .single()

    if (error) {
      // Unique constraint hit by a concurrent insert — treat as pending re-send.
      if (error.code === '23505') {
        return successResponse(GENERIC_PENDING_RESPONSE)
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to subscribe', 500)
    }

    const result = data as { id: string; confirmation_token: string } | null
    if (result) {
      await sendConfirmation(normalizedEmail, locale, result.confirmation_token)
    }

    return successResponse({ ...GENERIC_PENDING_RESPONSE, id: result?.id }, undefined, 201)
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    )
  }
}
