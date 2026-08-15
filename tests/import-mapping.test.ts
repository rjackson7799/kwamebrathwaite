import { describe, it, expect } from 'vitest'
import { deriveExhibitionType, todayUTC, buildExhibitionPayload } from '@/lib/import/mapping'
import { resolveGeography, splitLocationLine } from '@/lib/import/geography'
import { isoDateSchema, resolveEntryKind, parsedItemSchema } from '@/lib/import/schemas'

describe('deriveExhibitionType', () => {
  const today = '2026-08-14'

  it('classifies a finished run as past', () => {
    expect(deriveExhibitionType('2025-01-01', '2025-12-31', today)).toBe('past')
  })

  it('classifies a running show as current', () => {
    expect(deriveExhibitionType('2026-01-01', '2026-12-31', today)).toBe('current')
  })

  it('classifies a future show as upcoming', () => {
    expect(deriveExhibitionType('2026-10-01', '2026-10-31', today)).toBe('upcoming')
  })

  it('treats the end date as inclusive', () => {
    expect(deriveExhibitionType('2026-01-01', today, today)).toBe('current')
  })

  it('treats the start date as inclusive', () => {
    expect(deriveExhibitionType(today, '2026-12-31', today)).toBe('current')
  })

  it('flips to past the day after the end date', () => {
    expect(deriveExhibitionType('2026-01-01', '2026-08-13', today)).toBe('past')
  })

  // Single-day screenings are the common Smart Import case.
  it('handles a single-day event today as current', () => {
    expect(deriveExhibitionType(today, today, today)).toBe('current')
  })

  it('handles a single-day event in the future as upcoming', () => {
    expect(deriveExhibitionType('2026-09-06', '2026-09-06', today)).toBe('upcoming')
  })

  it('handles a single-day event in the past as past', () => {
    expect(deriveExhibitionType('2026-08-13', '2026-08-13', today)).toBe('past')
  })

  it('treats a missing end date as open-ended', () => {
    expect(deriveExhibitionType('2026-01-01', null, today)).toBe('current')
    expect(deriveExhibitionType('2026-12-01', null, today)).toBe('upcoming')
  })

  it('returns null when the start date is missing', () => {
    expect(deriveExhibitionType(null, '2026-12-31', today)).toBeNull()
  })
})

describe('todayUTC matches the codebase convention', () => {
  // lib/exhibitions.ts, api/exhibitions/route.ts and api/exhibitions/current
  // all compute "today" this exact way. Import must agree or the same row gets
  // classified differently by import and by the public query on the same day.
  it('produces the same string as new Date().toISOString().split(T)[0]', () => {
    const now = new Date('2026-08-14T23:59:00.000Z')
    expect(todayUTC(now)).toBe(now.toISOString().split('T')[0])
    expect(todayUTC(now)).toBe('2026-08-14')
  })

  it('does not shift the calendar date near the UTC boundary', () => {
    expect(todayUTC(new Date('2026-08-14T00:00:00.000Z'))).toBe('2026-08-14')
    expect(todayUTC(new Date('2026-08-14T23:59:59.999Z'))).toBe('2026-08-14')
    expect(todayUTC(new Date('2026-08-15T00:00:00.000Z'))).toBe('2026-08-15')
  })
})

describe('isoDateSchema', () => {
  it('accepts a real date', () => {
    expect(isoDateSchema.safeParse('2026-09-06').success).toBe(true)
  })

  it('rejects a non-existent calendar date instead of rolling it over', () => {
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false)
    expect(isoDateSchema.safeParse('2026-13-01').success).toBe(false)
  })

  it('rejects non-ISO formats', () => {
    expect(isoDateSchema.safeParse('September 6, 2026').success).toBe(false)
    expect(isoDateSchema.safeParse('09/06/2026').success).toBe(false)
  })
})

describe('resolveEntryKind precedence', () => {
  // "Documentary Screening at Nexus Art Week with talk with Kwame Samori" is
  // both. Precedence gives every test exactly one expected value.
  it('prefers screening over talk', () => {
    expect(resolveEntryKind(['talk', 'screening'])).toBe('screening')
  })

  it('prefers talk over event', () => {
    expect(resolveEntryKind(['event', 'talk'])).toBe('talk')
  })

  it('falls back to exhibition', () => {
    expect(resolveEntryKind([])).toBe('exhibition')
  })
})

describe('resolveGeography', () => {
  it('reads "Washington, DC" as a US state, not a country', () => {
    const r = resolveGeography('Washington', 'DC', null)
    expect(r.city).toBe('Washington')
    expect(r.state_region).toBe('DC')
    expect(r.country).toBe('United States')
  })

  it('reads "Parramatta, AU" as Australia', () => {
    const r = resolveGeography('Parramatta', null, 'AU')
    expect(r.city).toBe('Parramatta')
    expect(r.country).toBe('Australia')
    expect(r.state_region).toBeNull()
  })

  it('stores state as the 2-letter code and country as the full name, matching seed data', () => {
    const r = resolveGeography('Los Angeles', 'CA', null)
    expect(r.state_region).toBe('CA')
    expect(r.country).toBe('United States')
  })

  it('warns on a code that is both a US state and a country', () => {
    const r = resolveGeography('Los Angeles', 'CA', null)
    expect(r.warnings.join(' ')).toMatch(/both a US state/i)
  })

  it('never guesses a country from an unknown token', () => {
    const r = resolveGeography('Nowhere', null, 'ZZ')
    expect(r.country).toBeNull()
    expect(r.warnings.join(' ')).toMatch(/could not resolve country/i)
  })

  it('canonicalizes full-name aliases', () => {
    expect(resolveGeography(null, null, 'USA').country).toBe('United States')
    expect(resolveGeography(null, null, 'FRANCE').country).toBe('France')
    expect(resolveGeography(null, null, 'Holland').country).toBe('Netherlands')
  })

  it('resolves Canadian provinces', () => {
    const r = resolveGeography('Toronto', 'ON', null)
    expect(r.state_region).toBe('ON')
    expect(r.country).toBe('Canada')
  })
})

describe('splitLocationLine', () => {
  it('splits venue, city and state', () => {
    expect(splitLocationLine('Philip Martin Gallery, Los Angeles, CA')).toEqual({
      venue: 'Philip Martin Gallery',
      city: 'Los Angeles',
      region: 'CA',
    })
  })

  it('splits city and country code with no venue', () => {
    expect(splitLocationLine('Parramatta, AU')).toEqual({
      venue: null,
      city: 'Parramatta',
      region: 'AU',
    })
  })

  it('handles a bare city', () => {
    expect(splitLocationLine('Brussels')).toEqual({
      venue: null,
      city: 'Brussels',
      region: null,
    })
  })
})

describe('parsedItemSchema trust boundary', () => {
  const valid = {
    target_type: 'exhibition' as const,
    source_text: 'You and I\nPhilip Martin Gallery, Los Angeles, CA',
    confidence: 0.9,
    warnings: [],
    data: {
      title: 'You and I',
      entry_kind: 'exhibition' as const,
      start_date: '2026-10-01',
      end_date: '2026-10-31',
    },
  }

  it('accepts a well-formed item', () => {
    expect(parsedItemSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects an item with no source_text', () => {
    expect(parsedItemSchema.safeParse({ ...valid, source_text: '' }).success).toBe(false)
  })

  it('rejects an end date before the start date', () => {
    const bad = { ...valid, data: { ...valid.data, end_date: '2026-09-01' } }
    expect(parsedItemSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects confidence outside 0..1', () => {
    expect(parsedItemSchema.safeParse({ ...valid, confidence: 1.5 }).success).toBe(false)
  })

  it('rejects an unknown entry_kind', () => {
    const bad = { ...valid, data: { ...valid.data, entry_kind: 'concert' } }
    expect(parsedItemSchema.safeParse(bad).success).toBe(false)
  })
})

describe('buildExhibitionPayload — server owns slug/status/type', () => {
  const parsed = {
    title: 'You and I',
    entry_kind: 'exhibition' as const,
    venue: 'Philip Martin Gallery',
    city: 'Los Angeles',
    state_region: 'CA',
    country: null,
    start_date: '2026-10-01',
    end_date: '2026-10-31',
    description: null,
    venue_url: null,
    exhibition_url: null,
  }

  it('forces status=draft on create regardless of the parse', () => {
    const r = buildExhibitionPayload({
      parsed,
      action: 'create',
      slug: 'you-and-i',
      today: '2026-08-14',
    })
    expect(r.payload.status).toBe('draft')
    expect(r.payload.slug).toBe('you-and-i')
    expect(r.payload.exhibition_type).toBe('upcoming')
    expect(r.errors).toEqual([])
  })

  it('blocks publication when no start date is present', () => {
    const r = buildExhibitionPayload({
      parsed: { ...parsed, start_date: null },
      action: 'create',
      slug: 'you-and-i',
      today: '2026-08-14',
    })
    expect(r.errors.join(' ')).toMatch(/start date is required/i)
  })

  it('writes only mask-approved fields on update', () => {
    const existing = {
      id: 'x',
      slug: 'black-photojournalism',
      title: 'Black Photojournalism',
      status: 'published',
      venue: 'Amon Carter Museum',
      start_date: '2026-03-15',
      end_date: '2026-07-05',
    }
    const r = buildExhibitionPayload({
      parsed: { ...parsed, title: 'Black Photojournalism', end_date: '2026-07-12' },
      action: 'update',
      existing,
      applyMask: ['end_date'],
      today: '2026-08-14',
    })
    expect(Object.keys(r.payload).sort()).toEqual(['end_date', 'exhibition_type'])
    expect(r.payload.end_date).toBe('2026-07-12')
    // never touched:
    expect(r.payload).not.toHaveProperty('status')
    expect(r.payload).not.toHaveProperty('slug')
    expect(r.payload).not.toHaveProperty('title')
  })

  it('recomputes exhibition_type when a date is written', () => {
    const existing = {
      id: 'x',
      slug: 's',
      title: 'T',
      status: 'published',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    }
    const r = buildExhibitionPayload({
      parsed: { ...parsed, title: 'T', start_date: '2026-01-01', end_date: '2026-08-01' },
      action: 'update',
      existing,
      applyMask: ['end_date'],
      today: '2026-08-14',
    })
    expect(r.payload.exhibition_type).toBe('past')
  })

  it('errors when the mask selects nothing', () => {
    const existing = { id: 'x', slug: 's', title: 'T', status: 'published' }
    const r = buildExhibitionPayload({
      parsed: { ...parsed, title: 'T' },
      action: 'update',
      existing,
      applyMask: [],
      today: '2026-08-14',
    })
    expect(r.errors.join(' ')).toMatch(/no fields are selected/i)
  })
})
