import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      // Already subscribed - return success without error
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
      .select('id')
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

    const result = data as { id: string } | null

    // Send welcome email (non-blocking)
    sendUserEmail(
      email,
      'Welcome to the Kwame Brathwaite Archive Newsletter',
      NewsletterWelcomeEmail()
    )

    // Notify admin of new subscriber (non-blocking)
    sendAdminEmail(
      `New newsletter subscriber: ${email}`,
      NewsletterAdminEmail({ email, locale })
    )

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
