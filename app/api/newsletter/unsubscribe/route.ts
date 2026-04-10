import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  rateLimit,
  getClientIP,
} from '@/lib/api'

const unsubscribeSchema = z.object({
  token: z.string().uuid(),
  locale: z.enum(['en', 'fr', 'ja']).optional().default('en'),
})

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateLimitResult = rateLimit(`newsletter-unsub:${clientIP}`, 10, 60000)
    if (!rateLimitResult.success) {
      return errorResponse(
        ErrorCodes.RATE_LIMIT,
        'Too many requests. Please try again later.',
        429
      )
    }

    // Accept both JSON and form-encoded bodies (the confirmation page posts a form)
    const contentType = request.headers.get('content-type') || ''
    let raw: unknown
    if (contentType.includes('application/json')) {
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

    const parsed = unsubscribeSchema.safeParse(raw)
    if (!parsed.success) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid or missing unsubscribe token',
        400
      )
    }

    const { token, locale } = parsed.data
    const supabase = createAdminClient()

    const { data: row } = await supabase
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at')
      .eq('unsubscribe_token', token)
      .single()

    const existingRow = row as { id: string; unsubscribed_at: string | null } | null

    if (!existingRow) {
      // Unknown token — return generic success to avoid leaking whether the token
      // exists, but the form action will still redirect to the confirmation page.
      return maybeRedirect(request, locale)
    }

    if (!existingRow.unsubscribed_at) {
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({ unsubscribed_at: new Date().toISOString() } as never)
        .eq('id', existingRow.id)

      if (updateError) {
        console.error('Unsubscribe update error:', updateError)
        return errorResponse(ErrorCodes.DB_ERROR, 'Failed to unsubscribe', 500)
      }
    }

    return maybeRedirect(request, locale)
  } catch (error) {
    console.error('Unsubscribe API error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    )
  }
}

/**
 * Form posts redirect to the localized confirmation page; JSON callers get JSON back.
 */
function maybeRedirect(request: NextRequest, locale: string) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return successResponse({ message: 'Unsubscribed successfully' })
  }

  const localePrefix = locale === 'en' ? '' : `/${locale}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return NextResponse.redirect(
    `${siteUrl}${localePrefix}/newsletter/unsubscribed`,
    { status: 303 }
  )
}
