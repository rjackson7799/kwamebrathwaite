import { describe, it, expect } from 'vitest'
import { generateICS } from '@/lib/calendar'

/**
 * Smart Import creates single-day screenings and talks, which have a start_date
 * and no end_date. That combination previously disabled the Add to Calendar
 * button outright, and the underlying ICS generator had two date bugs that only
 * became visible at that volume. Pinned here.
 */

function field(ics: string, name: string): string | undefined {
  const line = ics.split(/\r?\n/).find((l) => l.startsWith(`${name}:`))
  return line?.slice(name.length + 1)
}

const base = {
  id: 'abc-123',
  title: 'Documentary Screening for African Film Festival Australia',
}

describe('generateICS — all-day date handling', () => {
  it('emits an exclusive DTEND for a single-day event', () => {
    // RFC 5545 §3.8.2.2: for VALUE=DATE, DTEND is the first day NOT in the
    // event. DTSTART == DTEND would be a zero-length event that many clients
    // silently drop.
    const ics = generateICS({ ...base, startDate: '2026-09-06' })

    expect(field(ics, 'DTSTART;VALUE=DATE')).toBe('20260906')
    expect(field(ics, 'DTEND;VALUE=DATE')).toBe('20260907')
  })

  it('treats a null end date as single-day rather than throwing', () => {
    const ics = generateICS({ ...base, startDate: '2026-09-06', endDate: null })

    expect(field(ics, 'DTSTART;VALUE=DATE')).toBe('20260906')
    expect(field(ics, 'DTEND;VALUE=DATE')).toBe('20260907')
  })

  it('emits an exclusive DTEND for a date range', () => {
    // Oct 1–31 inclusive means DTEND is Nov 1. Emitting 20261031 made every
    // exported exhibition one day short.
    const ics = generateICS({ ...base, startDate: '2026-10-01', endDate: '2026-10-31' })

    expect(field(ics, 'DTSTART;VALUE=DATE')).toBe('20261001')
    expect(field(ics, 'DTEND;VALUE=DATE')).toBe('20261101')
  })

  it('rolls over month and year boundaries in UTC', () => {
    const ics = generateICS({ ...base, startDate: '2026-12-31' })
    expect(field(ics, 'DTEND;VALUE=DATE')).toBe('20270101')
  })

  it('handles a leap day', () => {
    const ics = generateICS({ ...base, startDate: '2028-02-28', endDate: '2028-02-29' })
    expect(field(ics, 'DTEND;VALUE=DATE')).toBe('20280301')
  })

  it('does not shift the calendar date in negative-UTC-offset timezones', () => {
    // `new Date('2026-09-06')` is UTC midnight; reading it back with LOCAL
    // getters yields 5 September anywhere west of Greenwich. Exhibition dates
    // are UTC date-only strings everywhere else in this repo, so the ICS date
    // must be derived from the string, not round-tripped through local time.
    const ics = generateICS({ ...base, startDate: '2026-09-06' })
    expect(field(ics, 'DTSTART;VALUE=DATE')).toBe('20260906')
  })

  it('accepts a full ISO timestamp and reads it in UTC', () => {
    const ics = generateICS({ ...base, startDate: '2026-09-06T00:00:00.000Z' })
    expect(field(ics, 'DTSTART;VALUE=DATE')).toBe('20260906')
  })
})
