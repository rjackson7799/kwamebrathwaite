import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreInquiry, looksLikeRandomMixedCase } from '@/lib/api/spam'

const SPAM_THRESHOLD = 3

// Chainable stub: every query builder method returns the builder, and awaiting
// it resolves to "no prior rows", so the repeat-sender signals stay quiet.
function emptySupabase(): SupabaseClient {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'gte', 'ilike', 'limit']) builder[m] = () => builder
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
  return { from: () => builder } as unknown as SupabaseClient
}

const NOW = 1_700_000_000_000
const humanTiming = { renderedAt: NOW - 60_000, now: NOW }

describe('looksLikeRandomMixedCase', () => {
  it.each(['IRzCAJgxymBsHaso', 'ctHidsmbDISUMOewuvACOod', 'xQwErTyUiOpAsDf'])(
    'flags bot-generated string %s',
    (value) => {
      expect(looksLikeRandomMixedCase(value)).toBe(true)
    }
  )

  it.each([
    'McDonald',
    'DeShawn',
    'LaToya',
    'MacArthur',
    'McDonaldMacArthur',
    'Jean-Michel Basquiat',
    'Kwame Brathwaite',
    'PURCHASE',
    'iPhone',
    'ブラスウェイト',
    'Exhibition loan request',
  ])('does not flag real-world value %s', (value) => {
    expect(looksLikeRandomMixedCase(value)).toBe(false)
  })
})

describe('scoreInquiry', () => {
  it('flags the 2026-11-19 spam submission that slipped through', async () => {
    const { score, reasons } = await scoreInquiry(
      {
        name: 'IRzCAJgxymBsHaso',
        email: 'andreschlueter@web.de',
        subject: 'ctHidsmbDISUMOewuvACOod',
        message: 'qWeRtYuIoPaSdFgHjKl zXcVbNm',
      },
      { ...humanTiming, supabase: emptySupabase() }
    )
    expect(reasons).toContain('gibberish_name')
    expect(score).toBeGreaterThanOrEqual(SPAM_THRESHOLD)
  })

  it('lets a normal inquiry through', async () => {
    const { score, reasons } = await scoreInquiry(
      {
        name: 'Aiko Tanaka',
        email: 'aiko@example.org',
        subject: 'Print availability',
        message: 'Hello, I would like to know whether the 1964 Grandassa print is available.',
      },
      { ...humanTiming, supabase: emptySupabase() }
    )
    expect(reasons).toEqual([])
    expect(score).toBe(0)
  })

  it('counts a missing render timestamp (direct API post) as a signal, not a verdict', async () => {
    const { score, reasons } = await scoreInquiry(
      {
        name: 'Aiko Tanaka',
        email: 'aiko@example.org',
        message: 'Hello, I would like to know whether the 1964 Grandassa print is available.',
      },
      { now: NOW, supabase: emptySupabase() }
    )
    expect(reasons).toEqual(['missing_render_timestamp'])
    expect(score).toBeLessThan(SPAM_THRESHOLD)
  })
})
