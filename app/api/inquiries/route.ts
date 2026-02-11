import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
  inquirySchema,
} from '@/lib/api'
import type { InquiryInsert } from '@/lib/supabase/types'
import { sendUserEmail, sendAdminEmail } from '@/lib/email/send'
import { InquiryUserEmail, InquiryAdminEmail } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`inquiry:${clientIP}`, 5, 60000) // 5 per minute

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
    const validationResult = inquirySchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validationResult.error.flatten()
      )
    }

    const { website, ...inquiryData } = validationResult.data

    // Honeypot check - if filled, it's likely a bot
    // Return fake success to not alert the bot
    if (website) {
      return successResponse({
        message: 'Your inquiry has been submitted successfully.',
      })
    }

    // Insert into database
    const supabase = await createClient()

    const insertData: InquiryInsert = {
      name: inquiryData.name,
      email: inquiryData.email,
      phone: inquiryData.phone || null,
      subject: inquiryData.subject || null,
      message: inquiryData.message,
      inquiry_type: inquiryData.inquiry_type || null,
      artwork_id: inquiryData.artwork_id || null,
      locale: inquiryData.locale,
      status: 'new',
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert(insertData as never)
      .select('id')
      .single()

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to submit inquiry', 500)
    }

    const result = data as { id: string } | null

    // Send confirmation emails (non-blocking)
    if (result) {
      sendUserEmail(
        inquiryData.email,
        'Your inquiry has been received',
        InquiryUserEmail({
          name: inquiryData.name,
          inquiryType: inquiryData.inquiry_type || null,
          subject: inquiryData.subject || null,
        })
      )

      sendAdminEmail(
        `New ${inquiryData.inquiry_type || 'general'} inquiry from ${inquiryData.name}`,
        InquiryAdminEmail({
          name: inquiryData.name,
          email: inquiryData.email,
          phone: inquiryData.phone || null,
          subject: inquiryData.subject || null,
          message: inquiryData.message,
          inquiryType: inquiryData.inquiry_type || null,
          artworkId: inquiryData.artwork_id || null,
          locale: inquiryData.locale,
        })
      )
    }

    return successResponse(
      {
        id: result?.id,
        message: 'Your inquiry has been submitted successfully.',
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
