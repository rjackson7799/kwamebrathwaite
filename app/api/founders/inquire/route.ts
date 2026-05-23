import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
  founderInquirySchema,
} from '@/lib/api'
import { sendUserEmail, sendAdminEmail } from '@/lib/email/send'
import {
  FounderInquiryAckEmail,
  FounderInquiryAdminEmail,
} from '@/lib/email/templates'
import { scoreInquiry } from '@/lib/api/spam'

const SPAM_THRESHOLD = 3

/**
 * POST /api/founders/inquire
 *
 * Public Founder's Circle inquiry submission. Reuses the existing inquiries
 * table with source='founder_inquiry' so admins manage all inquiries in
 * one place, but with founder_status (richer SLA lifecycle) instead of the
 * legacy status enum.
 *
 * Defenses (in order): honeypot, in-memory IP rate limit, server-side spam
 * scoring. The in-memory limit is adequate here because spam scoring is the
 * real check — for security-critical flows (OTP) Phase 1C uses
 * rateLimitPersistent().
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`founder_inquiry:${clientIP}`, 5, 60000)

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

    const validation = founderInquirySchema.safeParse(body)
    if (!validation.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        validation.error.flatten()
      )
    }

    const { website, renderedAt, ...data } = validation.data

    // Honeypot: filled by bots, never by humans. Return fake success so the
    // bot doesn't get a signal to retry with a different shape.
    if (website) {
      return successResponse({
        message: 'Your inquiry has been submitted successfully.',
      })
    }

    // Service-role client: the inquiries table has a public-insert RLS policy,
    // but the spam-scoring path also reads from inquiries to detect repeat
    // submitters, so we use the admin client (matches /api/inquiries pattern).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const { score, reasons } = await scoreInquiry(
      {
        name: data.name,
        email: data.email,
        subject: null,
        message: data.message,
      },
      { renderedAt, now: Date.now(), supabase }
    )
    const isSpam = score >= SPAM_THRESHOLD

    // Spam goes straight to archived. Non-spam founder inquiries start at
    // founder_status='new' so they surface on the admin SLA dashboard.
    const insertRow = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: null,
      message: data.message,
      inquiry_type: null,
      artwork_id: null,
      locale: data.locale,
      source: 'founder_inquiry',
      // The check constraint requires founder_status NOT NULL when
      // source='founder_inquiry'. Use 'archived' for spam, 'new' otherwise.
      // (Legacy `status` column is also set so the existing /admin/inquiries
      // table still renders a meaningful badge for these rows.)
      status: isSpam ? 'archived' : 'new',
      founder_status: isSpam ? 'archived' : 'new',
      admin_notes: isSpam
        ? `SPAM (score ${score}): ${reasons.join(', ')}`
        : null,
    }

    const { data: inserted, error } = await supabase
      .from('inquiries')
      .insert(insertRow)
      .select('id')
      .single()

    if (error) {
      console.error('Founder inquiry insert failed:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to submit inquiry', 500)
    }

    const result = inserted as { id: string } | null

    if (result) {
      const emailTasks: Array<Promise<{ success: boolean }>> = [
        sendUserEmail(
          data.email,
          'We received your Founder’s Circle inquiry',
          FounderInquiryAckEmail({ name: data.name })
        ),
      ]

      if (!isSpam) {
        emailTasks.push(
          sendAdminEmail(
            `Founder’s Circle inquiry from ${data.name} — 24–48h SLA`,
            FounderInquiryAdminEmail({
              name: data.name,
              email: data.email,
              phone: data.phone || null,
              message: data.message,
              locale: data.locale,
            })
          )
        )
      } else {
        console.warn('Founder inquiry flagged as spam; admin email skipped', {
          inquiryId: result.id,
          score,
          reasons,
        })
      }

      const results = await Promise.all(emailTasks)
      if (results.some((r) => !r.success)) {
        console.error('Founder inquiry email send incomplete:', {
          inquiryId: result.id,
          results: results.map((r) => r.success),
        })
      }
    }

    return successResponse(
      {
        id: result?.id,
        message: 'Your inquiry has been submitted successfully.',
      },
      undefined,
      201
    )
  } catch (err) {
    console.error('Founder inquiry route error:', err)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    )
  }
}
