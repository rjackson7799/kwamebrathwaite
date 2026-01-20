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
  endDate: string // ISO date string
  url?: string
}

/**
 * Format a date for iCalendar format (YYYYMMDD)
 */
function formatICSDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
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

  // For all-day events, use VALUE=DATE format
  const startDate = formatICSDate(event.startDate)
  const endDate = formatICSDate(event.endDate)

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
