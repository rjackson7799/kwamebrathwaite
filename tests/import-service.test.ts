import { describe, it, expect } from 'vitest'
import {
  deriveBatchProgress,
  buildItemRows,
  editInvalidatesMatch,
  type ItemStatus,
} from '@/lib/import/service'
import type { ParsedBatchItem } from '@/lib/ai/content-parser'
import type { ExhibitionCandidate } from '@/lib/import/matching'

describe('deriveBatchProgress — predicates must not overlap', () => {
  const cases: [string, ItemStatus[], string][] = [
    ['empty batch', [], 'not_started'],
    ['all pending', ['pending', 'pending'], 'not_started'],
    ['some published, some pending', ['published', 'pending'], 'in_progress'],
    ['some skipped, some pending', ['skipped', 'pending'], 'in_progress'],
    ['all published', ['published', 'published'], 'complete'],
    ['all skipped', ['skipped', 'skipped'], 'complete'],
    ['published + skipped', ['published', 'skipped'], 'complete'],
    ['published + parse_failed', ['published', 'parse_failed'], 'complete_with_parse_errors'],
    ['only parse failures', ['parse_failed'], 'complete_with_parse_errors'],
    ['any failure outranks everything', ['published', 'skipped', 'failed'], 'needs_attention'],
    ['failure plus pending', ['pending', 'failed'], 'needs_attention'],
    ['stuck publishing', ['publishing', 'pending'], 'needs_attention'],
    ['failure plus parse errors', ['failed', 'parse_failed'], 'needs_attention'],
  ]

  for (const [name, statuses, expected] of cases) {
    it(`${name} -> ${expected}`, () => {
      expect(deriveBatchProgress(statuses)).toBe(expected)
    })
  }

  it('assigns exactly one bucket to every combination', () => {
    const all: ItemStatus[] = [
      'pending',
      'publishing',
      'published',
      'failed',
      'skipped',
      'parse_failed',
    ]
    // Every non-empty subset resolves, and never throws or returns undefined.
    for (let mask = 1; mask < 1 << all.length; mask++) {
      const subset = all.filter((_, i) => mask & (1 << i))
      const result = deriveBatchProgress(subset)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })
})

describe('buildItemRows', () => {
  const candidates: ExhibitionCandidate[] = [
    {
      id: 'live-1',
      title: 'Black Photojournalism',
      venue: 'Amon Carter Museum',
      city: 'Ft. Worth',
      start_date: '2026-03-15',
      end_date: '2026-07-05',
      exhibition_url: null,
      updated_at: '2026-08-01T00:00:00.000Z',
      status: 'published',
    },
    {
      id: 'draft-1',
      title: 'Draft Show',
      venue: 'Some Gallery',
      city: 'Boston',
      start_date: '2026-03-15',
      end_date: '2026-07-05',
      exhibition_url: null,
      updated_at: '2026-08-01T00:00:00.000Z',
      status: 'draft',
    },
  ]

  function entry(title: string, endDate: string, venue: string, city: string): ParsedBatchItem {
    return {
      sourceIndex: 0,
      sourceText: 'raw',
      parseError: null,
      item: {
        target_type: 'exhibition',
        source_text: 'raw',
        confidence: 0.9,
        warnings: [],
        data: {
          title,
          entry_kind: 'exhibition',
          venue,
          city,
          state_region: null,
          country: null,
          start_date: '2026-03-15',
          end_date: endDate,
          description: null,
          venue_url: null,
          exhibition_url: null,
        },
      },
    } as ParsedBatchItem
  }

  it('leaves the apply mask EMPTY when the match is a live record', () => {
    const rows = buildItemRows({
      importId: 'imp',
      parsed: [entry('Black Photojournalism', '2026-07-12', 'Amon Carter Museum', 'Ft. Worth')],
      exhibitions: candidates,
      press: [],
    })
    expect(rows[0].action).toBe('update')
    expect(rows[0].match_exhibition_id).toBe('live-1')
    // Pre-checking a live change would make "approved field-by-field" false:
    // an admin could bulk-publish without ever opening the card.
    expect(rows[0].apply_mask).toEqual([])
  })

  it('pre-checks changed fields when the match is a draft', () => {
    const rows = buildItemRows({
      importId: 'imp',
      parsed: [entry('Draft Show', '2026-07-12', 'Some Gallery', 'Boston')],
      exhibitions: candidates,
      press: [],
    })
    expect(rows[0].action).toBe('update')
    expect(rows[0].apply_mask).toContain('end_date')
  })

  it('turns an unparseable entry into a visible parse_failed row', () => {
    const rows = buildItemRows({
      importId: 'imp',
      parsed: [
        { sourceIndex: 3, sourceText: 'garbled', item: null, parseError: 'title: required' },
      ],
      exhibitions: candidates,
      press: [],
    })
    expect(rows[0].status).toBe('parse_failed')
    expect(rows[0].source_text).toBe('garbled')
    expect(rows[0].error_message).toBe('title: required')
    expect(rows[0].source_index).toBe(3)
  })

  it('carries matcher warnings through to the row', () => {
    const rows = buildItemRows({
      importId: 'imp',
      parsed: [entry('Black Photojournalism', '2026-07-12', 'A Different Gallery', 'Chicago')],
      exhibitions: candidates,
      press: [],
    })
    expect(rows[0].action).toBe('create')
    expect((rows[0].warnings as string[]).join(' ')).toMatch(/different venue/i)
  })
})

describe('editInvalidatesMatch', () => {
  it('flags an edit to an identity field', () => {
    expect(
      editInvalidatesMatch('exhibition', { title: 'A', venue: 'V' }, { title: 'B' })
    ).toBe(true)
    expect(
      editInvalidatesMatch('exhibition', { start_date: '2026-01-01' }, { start_date: '2027-01-01' })
    ).toBe(true)
  })

  it('ignores an edit to a descriptive field', () => {
    expect(
      editInvalidatesMatch('exhibition', { description: 'x' }, { description: 'y' })
    ).toBe(false)
  })

  it('ignores an edit that changes nothing', () => {
    expect(editInvalidatesMatch('exhibition', { title: 'A' }, { title: 'A' })).toBe(false)
  })

  it('uses press identity fields for press items', () => {
    expect(editInvalidatesMatch('press', { url: 'a' }, { url: 'b' })).toBe(true)
    expect(editInvalidatesMatch('press', { excerpt: 'a' }, { excerpt: 'b' })).toBe(false)
  })
})
