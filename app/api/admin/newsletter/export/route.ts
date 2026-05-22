import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth, logActivity } from '@/lib/api/admin'
import { rateLimit, getClientIP } from '@/lib/api/rate-limit'

// GET /api/admin/newsletter/export - Export all subscribers as CSV
export async function GET(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  // Rate limit exports: 5 per hour per authenticated user
  const limitKey = `export:newsletter:${user?.id ?? getClientIP(request)}`
  const limitResult = rateLimit(limitKey, 5, 60 * 60 * 1000)
  if (!limitResult.success) {
    return errorResponse(
      ErrorCodes.RATE_LIMIT,
      'Too many export requests. Please try again later.',
      429
    )
  }

  try {
    const supabase = await createClient()

    // Active subscribers only: confirmed double opt-in AND not unsubscribed.
    // Pending rows are mostly bot signups; unsubscribed rows shouldn't show
    // up in an export of mailable subscribers.
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, locale, subscribed_at')
      .not('confirmed_at', 'is', null)
      .is('unsubscribed_at', null)
      .order('subscribed_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch subscribers', 500)
    }

    // Build CSV content
    const headers = ['email', 'locale', 'subscribed_at']
    const csvRows = [headers.join(',')]

    interface Subscriber {
      email: string
      locale: string | null
      subscribed_at: string | null
    }

    for (const subscriber of (data as Subscriber[]) || []) {
      const row = [
        escapeCSV(subscriber.email),
        escapeCSV(subscriber.locale || 'en'),
        escapeCSV(subscriber.subscribed_at || ''),
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `newsletter-subscribers-${timestamp}.csv`

    // Audit log the export
    if (user?.email) {
      await logActivity(
        user.email,
        'update',
        'newsletter_subscriber',
        undefined,
        `CSV export (${(data || []).length} subscribers)`
      )
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting subscribers:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, 'An error occurred', 500)
  }
}

// Helper to escape CSV values
function escapeCSV(value: string): string {
  if (!value) return ''
  // If value contains comma, newline, or double quote, wrap in quotes and escape existing quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
