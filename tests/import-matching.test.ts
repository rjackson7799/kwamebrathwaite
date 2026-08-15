import { describe, it, expect } from 'vitest'
import {
  normalizeTitle,
  canonicalizeUrl,
  datesCompatible,
  findExhibitionMatch,
  findPressMatch,
  buildMatchSummary,
  changedFields,
  type ExhibitionCandidate,
  type PressCandidate,
} from '@/lib/import/matching'
import type { ParsedExhibition, ParsedPress } from '@/lib/import/schemas'

function exhibition(over: Partial<ParsedExhibition> = {}): ParsedExhibition {
  return {
    title: 'Untitled',
    entry_kind: 'exhibition',
    venue: null,
    city: null,
    state_region: null,
    country: null,
    start_date: null,
    end_date: null,
    description: null,
    venue_url: null,
    exhibition_url: null,
    ...over,
  } as ParsedExhibition
}

function candidate(over: Partial<ExhibitionCandidate> = {}): ExhibitionCandidate {
  return {
    id: 'id-1',
    title: 'Untitled',
    venue: null,
    city: null,
    start_date: null,
    end_date: null,
    exhibition_url: null,
    updated_at: '2026-08-01T00:00:00.000Z',
    ...over,
  }
}

describe('normalizeTitle', () => {
  it('strips punctuation and case', () => {
    expect(normalizeTitle("Disco, I'm Coming Out")).toBe('disco i m coming out')
  })

  it('strips diacritics', () => {
    expect(normalizeTitle('Kunsthalle München')).toBe(normalizeTitle('Kunsthalle Munchen'))
  })

  // Guards a real bug: a malformed diacritics character class silently ate
  // digits, which would have merged "Bold & Brilliant 1930-1970" with any
  // other Bold & Brilliant.
  it('preserves digits', () => {
    expect(normalizeTitle('Bold & Brilliant: The Rise of Black Magazines 1930-1970')).toContain(
      '1930'
    )
    expect(normalizeTitle('Gallery 1957')).toBe('gallery 1957')
  })
})

describe('canonicalizeUrl', () => {
  it('normalizes host, scheme, trailing slash and fragment', () => {
    expect(canonicalizeUrl('http://WWW.Gallery.ca/whats-on/#top')).toBe('gallery.ca/whats-on')
  })

  it('strips tracking parameters', () => {
    expect(canonicalizeUrl('https://x.com/a?utm_source=news&fbclid=abc')).toBe('x.com/a')
  })

  // Non-tracking params can BE the page identity — stripping them would
  // collapse genuinely distinct exhibitions into one match.
  it('preserves non-tracking parameters', () => {
    expect(canonicalizeUrl('https://x.com/ex?id=5755')).toBe('x.com/ex?id=5755')
  })

  it('does not collapse two distinct pages that differ only by a real param', () => {
    expect(canonicalizeUrl('https://moma.org/calendar?id=5755')).not.toBe(
      canonicalizeUrl('https://moma.org/calendar?id=5756')
    )
  })

  it('is order-stable for parameters', () => {
    expect(canonicalizeUrl('https://x.com/a?b=2&a=1')).toBe(canonicalizeUrl('https://x.com/a?a=1&b=2'))
  })

  it('returns null for junk', () => {
    expect(canonicalizeUrl('not a url')).toBeNull()
    expect(canonicalizeUrl(null)).toBeNull()
  })
})

describe('datesCompatible', () => {
  it('treats overlapping ranges as compatible', () => {
    expect(datesCompatible('2026-03-15', '2026-07-05', '2026-03-15', '2026-07-12')).toBe(true)
  })

  it('treats a nearby corrected date as compatible', () => {
    expect(datesCompatible('2026-03-15', '2026-07-05', '2026-03-20', '2026-07-20')).toBe(true)
  })

  it('treats runs a year apart as incompatible', () => {
    expect(datesCompatible('2026-03-15', '2026-07-05', '2027-03-15', '2027-07-05')).toBe(false)
  })

  it('is false when either start date is missing', () => {
    expect(datesCompatible(null, '2026-07-05', '2026-03-15', '2026-07-05')).toBe(false)
  })
})

describe('findExhibitionMatch — the re-paste workflow', () => {
  it('proposes an update when title, venue and dates all corroborate', () => {
    const existing = [
      candidate({
        id: 'amon',
        title: 'Black Photojournalism',
        venue: 'Amon Carter Museum of American Art',
        city: 'Ft. Worth',
        start_date: '2026-03-15',
        end_date: '2026-07-05',
      }),
    ]
    const result = findExhibitionMatch(
      exhibition({
        title: 'Black Photojournalism',
        venue: 'Amon Carter Museum of American Art',
        city: 'Ft. Worth',
        start_date: '2026-03-15',
        end_date: '2026-07-12', // corrected end date
      }),
      existing
    )
    expect(result.action).toBe('update')
    expect(result.matchId).toBe('amon')
    expect(result.targetUpdatedAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('treats a canonical URL match as decisive even when dates moved a lot', () => {
    const existing = [
      candidate({
        id: 'moma',
        title: 'Something Else Entirely',
        exhibition_url: 'https://www.moma.org/calendar/exhibitions/5755',
        start_date: '2020-01-01',
        end_date: '2020-02-01',
      }),
    ]
    const result = findExhibitionMatch(
      exhibition({
        title: 'Ideas of Africa: Portraits and Political Imagination',
        exhibition_url: 'https://moma.org/calendar/exhibitions/5755/',
        start_date: '2025-12-14',
        end_date: '2026-04-04',
      }),
      existing
    )
    expect(result.action).toBe('update')
    expect(result.matchId).toBe('moma')
    expect(result.confidence).toBe(1)
  })
})

describe('findExhibitionMatch — touring shows must never merge', () => {
  // Both are real entries from docs/events.md.
  const sundayBest: ExhibitionCandidate[] = [
    candidate({
      id: 'ago',
      title: 'Sunday Best',
      venue: 'Art Gallery of Ontario',
      city: 'Toronto',
      start_date: '2026-10-10',
      end_date: '2027-02-28',
    }),
  ]

  it('keeps the Philadelphia run of "Sunday Best" separate from the Toronto run', () => {
    const result = findExhibitionMatch(
      exhibition({
        title: 'Sunday Best',
        venue: 'Philadelphia Museum of Art',
        city: 'Philadelphia',
        start_date: '2027-04-17',
        end_date: '2027-08-08',
      }),
      sundayBest
    )
    expect(result.action).toBe('create')
    expect(result.matchId).toBeNull()
    expect(result.warnings.join(' ')).toMatch(/different venue/i)
  })

  const disco: ExhibitionCandidate[] = [
    candidate({
      id: 'amsterdam',
      title: "Disco, I'm Coming Out",
      venue: 'Wereldmuseum',
      city: 'Amsterdam',
      start_date: '2026-10-09',
      end_date: '2027-08-22',
    }),
    candidate({
      id: 'munich',
      title: "Disco, I'm Coming Out",
      venue: 'Kunsthalle München',
      city: 'Munich',
      start_date: '2027-09-17',
      end_date: '2028-02-28',
    }),
  ]

  it('keeps the Antwerp run separate from Amsterdam and Munich', () => {
    const result = findExhibitionMatch(
      exhibition({
        title: "Disco, I'm Coming Out",
        venue: 'MAS – Museum aan de Stroom',
        city: 'Antwerp',
        start_date: '2028-03-23',
        end_date: '2028-11-05',
      }),
      disco
    )
    expect(result.action).toBe('create')
    expect(result.matchId).toBeNull()
  })

  it('still updates the Munich run when Munich is re-pasted', () => {
    const result = findExhibitionMatch(
      exhibition({
        title: "Disco, I'm Coming Out",
        venue: 'Kunsthalle München',
        city: 'Munich',
        start_date: '2027-09-17',
        end_date: '2028-03-05', // corrected
      }),
      disco
    )
    expect(result.action).toBe('update')
    expect(result.matchId).toBe('munich')
  })

  it('does not merge a recurring annual event at the same venue', () => {
    const annual = [
      candidate({
        id: '2026',
        title: 'Annual Benefit Screening',
        venue: 'Film Forum',
        city: 'New York',
        start_date: '2026-05-01',
        end_date: '2026-05-01',
      }),
    ]
    const result = findExhibitionMatch(
      exhibition({
        title: 'Annual Benefit Screening',
        venue: 'Film Forum',
        city: 'New York',
        start_date: '2027-05-01',
        end_date: '2027-05-01',
      }),
      annual
    )
    expect(result.action).toBe('create')
    expect(result.warnings.join(' ')).toMatch(/dates are far apart/i)
  })

  it('does not merge two separate screenings in the same city', () => {
    const sf = [
      candidate({
        id: 'sfmoma',
        title: 'Documentary Screening',
        venue: 'SFMOMA',
        city: 'San Francisco',
        start_date: '2026-10-04',
        end_date: '2026-10-04',
      }),
    ]
    const result = findExhibitionMatch(
      exhibition({
        title: 'Documentary Screening',
        venue: 'Yerba Buena',
        city: 'San Francisco',
        start_date: '2026-12-01',
        end_date: '2026-12-01',
      }),
      sf
    )
    expect(result.action).toBe('create')
  })
})

describe('findPressMatch', () => {
  function press(over: Partial<ParsedPress> = {}): ParsedPress {
    return {
      title: 'A Headline',
      publication: null,
      author: null,
      publish_date: null,
      url: null,
      excerpt: null,
      press_type: null,
      ...over,
    } as ParsedPress
  }

  const existing: PressCandidate[] = [
    {
      id: 'p1',
      title: 'Black Is Beautiful, Revisited',
      publication: 'The New York Times',
      author: 'A Writer',
      publish_date: '2026-02-01',
      url: 'https://www.nytimes.com/2026/02/01/arts/kwame.html',
      updated_at: '2026-08-01T00:00:00.000Z',
    },
  ]

  it('matches on canonical URL regardless of tracking params', () => {
    const r = findPressMatch(
      press({ url: 'https://nytimes.com/2026/02/01/arts/kwame.html?utm_source=twitter' }),
      existing
    )
    expect(r.action).toBe('update')
    expect(r.matchId).toBe('p1')
  })

  it('falls back to publication + title + date when there is no URL', () => {
    const r = findPressMatch(
      press({
        title: 'Black Is Beautiful, Revisited',
        publication: 'The New York Times',
        publish_date: '2026-02-01',
      }),
      existing
    )
    expect(r.action).toBe('update')
    expect(r.matchId).toBe('p1')
  })

  it('treats a bare title collision as a warning, never an update', () => {
    const r = findPressMatch(press({ title: 'Black Is Beautiful, Revisited' }), existing)
    expect(r.action).toBe('create')
    expect(r.matchId).toBeNull()
    expect(r.warnings.join(' ')).toMatch(/already exists/i)
  })
})

describe('buildMatchSummary', () => {
  it('reports only fields the parse expressed', () => {
    const summary = buildMatchSummary(
      { end_date: '2026-07-12', venue: null, title: 'Same' },
      { end_date: '2026-07-05', venue: 'Amon Carter', title: 'Same' },
      ['end_date', 'venue', 'title']
    )
    expect(Object.keys(summary).sort()).toEqual(['end_date', 'title'])
    expect(summary.end_date.changed).toBe(true)
    expect(summary.title.changed).toBe(false)
  })

  it('changedFields returns the default apply mask', () => {
    const summary = buildMatchSummary(
      { end_date: '2026-07-12', title: 'Same' },
      { end_date: '2026-07-05', title: 'Same' },
      ['end_date', 'title']
    )
    expect(changedFields(summary)).toEqual(['end_date'])
  })
})
