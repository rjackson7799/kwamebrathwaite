import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, ErrorCodes } from '@/lib/api/response'
import { requireAuth } from '@/lib/api/admin'
import type { ExhibitionReminder } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  // Check authentication
  const { errorResponse: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    const supabase = await createClient()

    // Fetch all reminders
    // Note: Type assertion needed until Supabase types are regenerated after running migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('exhibition_reminders') as any)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return errorResponse(ErrorCodes.DB_ERROR, 'Failed to fetch reminders', 500)
    }

    const reminders = (data || []) as ExhibitionReminder[]

    // CSV headers
    const headers = [
      'Name',
      'Email',
      'Reminder Type',
      'Exhibition Title',
      'Exhibition Venue',
      'Exhibition City',
      'Exhibition Country',
      'Start Date',
      'End Date',
      'Requested On',
      'Source',
      'Locale',
    ]

    // Helper to escape CSV values
    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // Escape quotes and wrap in quotes if contains special characters
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Format date for CSV
    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return ''
      try {
        return new Date(dateStr).toISOString().split('T')[0]
      } catch {
        return dateStr
      }
    }

    // Build CSV rows
    const rows = reminders.map((r) => [
      escapeCSV(r.name),
      escapeCSV(r.email),
      escapeCSV(r.reminder_type),
      escapeCSV(r.exhibition_title),
      escapeCSV(r.exhibition_venue),
      escapeCSV(r.exhibition_city),
      escapeCSV(r.exhibition_country),
      formatDate(r.exhibition_start_date),
      formatDate(r.exhibition_end_date),
      formatDate(r.created_at),
      escapeCSV(r.source),
      escapeCSV(r.locale),
    ])

    // Combine header and rows
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    // Generate filename with today's date
    const today = new Date().toISOString().split('T')[0]
    const filename = `exhibition-reminders-${today}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to export reminders',
      500
    )
  }
}
