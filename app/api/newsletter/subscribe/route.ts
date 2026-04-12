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
import { sendUserEmail, sendAdminEmail } from '@/lib/email/send'
import { NewsletterWelcomeEmail, NewsletterAdminEmail } from '@/lib/email/templates'

interface NewsletterInsert {
  email: string
  locale: string
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`newsletter:${clientIP}`, 3, 60000) // 3 per minute

    if (!rateLimitResult.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
    }

    // Validate with Zod
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

    // Honeypot check - if filled, it's likely a bot
    if (website) {
      return successResponse({
        message: 'Thank you for subscribing to our newsletter!',
        alreadySubscribed: false,
      })
    }

    const supabase = createAdminClient()

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at, unsubscribe_token')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      const existingRow = existing as {
        id: string
        unsubscribed_at: string | null
        unsubscribe_token: string
      }

      // Previously unsubscribed — reactivate the subscription
      if (existingRow.unsubscribed_at) {
        const { error: reactivateError } = await supabase
          .from('newsletter_subscribers')
          .update({ unsubscribed_at: null, locale } as never)
          .eq('id', existingRow.id)

        if (reactivateError) {
          console.error('Reactivation error:', reactivateError)
          return errorResponse(ErrorCodes.DB_ERROR, 'Failed to subscribe', 500)
        }

        return successResponse({
          id: existingRow.id,
          message: 'Welcome back — your subscription has been reactivated.',
          alreadySubscribed: false,
        })
      }

      // Still actively subscribed - return success without error
      return successResponse({
        message: 'You are already subscribed to our newsletter.',
        alreadySubscribed: true,
      })
    }

    // Insert new subscriber
    const insertData: NewsletterInsert = {
      email: email.toLowerCase(),
      locale,
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert(insertData as never)
      .select('id, unsubscribe_token')
      .single()

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return successResponse({
          message: 'You are already subscribed to our newsletter.',
          alreadySubscribed: true,
        })
      }
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to subscribe', 500)
    }

    const result = data as { id: string; unsubscribe_token: string } | null

    // Build localized unsubscribe URL for the welcome email footer
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
    const localePrefix = locale === 'en' ? '' : `/${locale}`
    const unsubscribeUrl = result
      ? `${siteUrl}${localePrefix}/newsletter/unsubscribe?token=${result.unsubscribe_token}`
      : `${siteUrl}${localePrefix}/newsletter/unsubscribe`

    const [userResult, adminResult] = await Promise.all([
      sendUserEmail(
        email,
        'Welcome to the Kwame Brathwaite Archive Newsletter',
        NewsletterWelcomeEmail({ unsubscribeUrl })
      ),
      sendAdminEmail(
        `New newsletter subscriber: ${email}`,
        NewsletterAdminEmail({ email, locale })
      ),
    ])

    if (!userResult.success || !adminResult.success) {
      console.error('Newsletter email send incomplete:', {
        subscriberEmail: email,
        userEmail: userResult.success,
        adminEmail: adminResult.success,
      })
    }

    return successResponse(
      {
        id: result?.id,
        message: 'Thank you for subscribing to our newsletter!',
        alreadySubscribed: false,
      },
      undefined,
      201
    )
  } catch (error) {
    console.error('API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    )
  }
}
