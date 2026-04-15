/**
 * Inbound webhook for forwarded Google Alerts emails.
 *
 * Configure your inbound email provider (Resend Inbound, Postmark, SendGrid Inbound
 * Parse, etc.) to POST JSON to this endpoint with a body containing `html` (or
 * `text`) and `subject`. The endpoint extracts article URLs from the email body
 * and inserts them as `mention`-category leads with source_type='google_alerts'.
 *
 * Auth: pass `?secret=<LEADS_INBOUND_SECRET>` or `Authorization: Bearer <secret>`.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { parseGoogleAlertsHtml, AlertItem } from '@/lib/leads/sources/alerts-inbox'
import { filterNewUrls } from '@/lib/leads/dedup'

export const maxDuration = 30

function extractSecret(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return req.nextUrl.searchParams.get('secret')
}

interface InboundBody {
  html?: string
  text?: string
  body_html?: string // some providers
  HtmlBody?: string // postmark
  TextBody?: string
  subject?: string
  Subject?: string
}

export async function POST(request: NextRequest) {
  const expected = process.env.LEADS_INBOUND_SECRET
  if (!expected) {
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'LEADS_INBOUND_SECRET is not configured',
      500
    )
  }
  const got = extractSecret(request)
  if (got !== expected) {
    return errorResponse('UNAUTHORIZED', 'Invalid inbound secret', 401)
  }

  let body: InboundBody
  try {
    body = (await request.json()) as InboundBody
  } catch {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
  }

  const html = body.html || body.body_html || body.HtmlBody || ''
  if (!html) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, 'No HTML body to parse', 400)
  }

  const items: AlertItem[] = parseGoogleAlertsHtml(html)
  if (items.length === 0) {
    return successResponse({ inserted: 0, parsed: 0 })
  }

  const supabase = createAdminClient()
  const newUrls = await filterNewUrls(
    supabase,
    items.map((i) => i.url)
  )
  const fresh = items.filter((i) => newUrls.has(i.url))
  if (fresh.length === 0) {
    return successResponse({ inserted: 0, parsed: items.length })
  }

  const rows = fresh.map((item) => ({
    status: 'new',
    category: 'mention',
    region: 'other',
    language: 'en',
    title: item.title.slice(0, 500),
    summary_en: item.snippet,
    source_url: item.url,
    source_type: 'google_alerts',
    score: 60, // default: alerts mention Brathwaite by name, so they're worth seeing
    raw: { subject: body.subject || body.Subject || null },
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('leads')
    .insert(rows)
    .select('id')

  if (error && error.code !== '23505') {
    console.error('alerts insert error:', error)
    return errorResponse(ErrorCodes.DB_ERROR, 'Failed to insert leads', 500)
  }

  return successResponse({
    inserted: (data as Array<{ id: string }>)?.length ?? 0,
    parsed: items.length,
  })
}
