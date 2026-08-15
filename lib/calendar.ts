/**
 * Calendar utility for generating .ics files
 * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
 */

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startDate: string // ISO date string
  /** Last day of the event. Omit for a single-day event. */
  endDate?: string | null
  url?: string
}

/**
 * Format a date for iCalendar format (YYYYMMDD).
 *
 * Deliberately string-based for date-only input. `new Date('2026-09-06')`
 * parses as UTC midnight, and reading it back with LOCAL getters shifts the
 * calendar date backwards in every negative-UTC-offset zone — a US visitor
 * exporting a 6 September screening got 20260905. Exhibition dates are UTC
 * date-only strings everywhere else in this repo (lib/exhibitions.ts,
 * api/exhibitions/route.ts, deriveExhibitionType); this matches that.
 */
function formatICSDate(dateStr: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (dateOnly) {
    return `${dateOnly[1]}${dateOnly[2]}${dateOnly[3]}`
  }
  // Non date-only input (a full timestamp in another shape): read in UTC, for
  // the same reason.
  const date = new Date(dateStr)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Add one day to a YYYYMMDD string, in UTC.
 *
 * DTEND is EXCLUSIVE for all-day events (RFC 5545 §3.8.2.2): the value names
 * the first day NOT in the event. Emitting the last day itself made every
 * export one day short, and would render a single-day screening
 * (DTSTART == DTEND) as a zero-length event that many clients drop entirely.
 */
function addOneDayICS(icsDate: string): string {
  const year = Number(icsDate.slice(0, 4))
  const month = Number(icsDate.slice(4, 6))
  const day = Number(icsDate.slice(6, 8))
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  return (
    `${next.getUTCFullYear()}` +
    `${String(next.getUTCMonth() + 1).padStart(2, '0')}` +
    `${String(next.getUTCDate()).padStart(2, '0')}`
  )
}

/**
 * Format a timestamp for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICSTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Escape special characters for iCalendar format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate an iCalendar (.ics) file content
 */
export function generateICS(event: CalendarEvent): string {
  const now = formatICSTimestamp(new Date())
  const uid = `${event.id}@kwamebrathwaite.com`

  // For all-day events, use VALUE=DATE format. endDate is optional: a
  // single-day entry (most screenings and talks) has no end_date at all.
  const startDate = formatICSDate(event.startDate)
  const lastDay = event.endDate ? formatICSDate(event.endDate) : startDate
  const endDate = addOneDayICS(lastDay)

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kwame Brathwaite Archive//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`)
  }

  if (event.url) {
    lines.push(`URL:${event.url}`)
  }

  lines.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  )

  return lines.join('\r\n')
}

/**
 * Download an .ics file
 */
export function downloadICS(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICS(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${event.title.replace(/\s+/g, '-').toLowerCase()}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.URL.revokeObjectURL(url)
}
