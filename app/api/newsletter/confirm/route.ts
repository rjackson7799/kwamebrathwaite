import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
} from '@/lib/api'
import { sendUserEmail, sendAdminEmail } from '@/lib/email/send'
import { NewsletterWelcomeEmail, NewsletterAdminEmail } from '@/lib/email/templates'

const confirmSchema = z.object({
  token: z.string().uuid(),
  locale: z.enum(['en', 'fr', 'ja']).optional().default('en'),
})

function confirmedPageUrl(
  request: NextRequest,
  locale: string,
  status?: 'invalid'
): string {
  const localePrefix = locale === 'en' ? '' : `/${locale}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const query = status ? `?status=${status}` : ''
  return `${siteUrl}${localePrefix}/newsletter/confirmed${query}`
}

function buildUnsubscribeUrl(request: NextRequest, locale: string, token: string): string {
  const localePrefix = locale === 'en' ? '' : `/${locale}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return `${siteUrl}${localePrefix}/newsletter/unsubscribe?token=${token}`
}

function isJsonRequest(request: NextRequest): boolean {
  return (request.headers.get('content-type') || '').includes('application/json')
}

function finalize(
  request: NextRequest,
  locale: string,
  status?: 'invalid'
): NextResponse {
  if (isJsonRequest(request)) {
    if (status === 'invalid') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid or expired confirmation token', 400)
    }
    return successResponse({ message: 'Subscription confirmed' })
  }
  return NextResponse.redirect(confirmedPageUrl(request, locale, status), {
    status: 303,
  })
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`newsletter-confirm:${clientIP}`, 10, 60000)
    if (!rateLimitResult.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    // Accept both JSON (programmatic) and form-encoded bodies (form POST from
    // the localized confirmation page).
    let raw: unknown
    if (isJsonRequest(request)) {
      try {
        raw = await request.json()
      } catch {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
      }
    } else {
      const formData = await request.formData()
      raw = {
        token: formData.get('token'),
        locale: formData.get('locale') || 'en',
      }
    }

    const parsed = confirmSchema.safeParse(raw)
    if (!parsed.success) {
      return finalize(request, 'en', 'invalid')
    }

    const { token, locale } = parsed.data
    const supabase = createAdminClient()

    // Atomic confirm: only flips the row if it's still pending. The
    // confirmed_at IS NULL predicate is what makes this safe against the
    // check-then-act race — only one concurrent request can win the update,
    // so welcome/admin emails fire exactly once.
    const { data: confirmed } = await supabase
      .from('newsletter_subscribers')
      .update({ confirmed_at: new Date().toISOString() } as never)
      .eq('confirmation_token', token)
      .is('confirmed_at', null)
      .select('id, email, locale, unsubscribe_token')
      .single()

    const confirmedRow = confirmed as {
      id: string
      email: string
      locale: string
      unsubscribe_token: string
    } | null

    if (confirmedRow) {
      const subscriberLocale = confirmedRow.locale || locale
      const unsubscribeUrl = buildUnsubscribeUrl(
        request,
        subscriberLocale,
        confirmedRow.unsubscribe_token
      )
      const [userResult, adminResult] = await Promise.all([
        sendUserEmail(
          confirmedRow.email,
          'Welcome to the Kwame Brathwaite Archive Newsletter',
          NewsletterWelcomeEmail({ unsubscribeUrl })
        ),
        sendAdminEmail(
          `New newsletter subscriber: ${confirmedRow.email}`,
          NewsletterAdminEmail({
            email: confirmedRow.email,
            locale: subscriberLocale,
          })
        ),
      ])

      if (!userResult.success || !adminResult.success) {
        console.error('Newsletter post-confirm email send incomplete:', {
          subscriberEmail: confirmedRow.email,
          userEmail: userResult.success,
          adminEmail: adminResult.success,
        })
      }

      return finalize(request, subscriberLocale)
    }

    // Update affected zero rows. Disambiguate: token doesn't exist (invalid)
    // vs. token exists but is already confirmed (idempotent success).
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('locale, confirmed_at')
      .eq('confirmation_token', token)
      .single()

    const existingRow = existing as {
      locale: string
      confirmed_at: string | null
    } | null

    if (existingRow?.confirmed_at) {
      return finalize(request, existingRow.locale || locale)
    }

    return finalize(request, locale, 'invalid')
  } catch (error) {
    console.error('Confirm API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    )
  }
}
