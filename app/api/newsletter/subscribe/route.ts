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

    const { email, locale } = validationResult.data

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
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    )
  }
}
