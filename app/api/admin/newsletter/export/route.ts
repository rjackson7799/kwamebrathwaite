import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'

// GET /api/admin/newsletter/export - Export all subscribers as CSV
export async function GET(request: NextRequest) {
  // Check authentication
  const { user, errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    // Fetch all subscribers ordered by subscription date
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, locale, subscribed_at')
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
