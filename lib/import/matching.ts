/**
 * Duplicate detection for Smart Import.
 *
 * The client's schedule document is a LIVING document — they re-paste the whole
 * thing whenever it changes. Getting this right is what makes that safe.
 *
 * Design: hard gates, not tuned weights. A weighted title score falsely merges
 * touring shows, and the archive's own document proves it — "Sunday Best" runs
 * at AGO Toronto AND Philadelphia Museum of Art; "Disco, I'm Coming Out" runs
 * at Amsterdam, Munich AND Antwerp. Title similarity alone must never trigger
 * an update. Fuzzy scoring here only ranks WARNINGS; it never decides one.
 */

import type { ParsedExhibition, ParsedPress } from './schemas'

export type MatchAction = 'create' | 'update'

export interface MatchResult {
  /** The record to update, if an update is justified. */
  matchId: string | null
  /** Confidence in the match, 0..1. Null when there is no match. */
  confidence: number | null
  action: MatchAction
  /** Why this resolved the way it did — surfaced in review. */
  warnings: string[]
  /** updated_at of the matched target at match time, for the staleness guard. */
  targetUpdatedAt: string | null
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalized title. Matching uses EXACT equality on this value — deliberately
 * not fuzzy similarity, so the gate is unambiguous.
 */
export function normalizeTitle(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Venue/city normalization, plus the honorifics that vary between listings. */
export function normalizePlace(value: string | null | undefined): string {
  if (!value) return ''
  return normalizeTitle(value)
    .replace(/\b(the|museum of|gallery|galleries|center|centre|art)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Query parameters that carry no page identity. Everything NOT on this list is
 * preserved — many sites use query strings as the actual article or exhibition
 * identifier, so stripping all parameters would collapse distinct pages.
 */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_cid$/i,
  /^mc_eid$/i,
  /^igshid$/i,
  /^ref$/i,
  /^source$/i,
]

/**
 * Syntactic URL canonicalization. Redirects are deliberately NOT followed:
 * that would put network latency and new failure modes inside matching.
 */
export function canonicalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (!/^https?:$/i.test(url.protocol)) return null

  url.hash = ''
  url.protocol = 'https:'
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')

  const kept: [string, string][] = []
  url.searchParams.forEach((value, key) => {
    if (!TRACKING_PARAMS.some((re) => re.test(key))) kept.push([key, value])
  })
  // Sorted so parameter order can't produce two "different" canonical forms.
  kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))

  const search = kept.length
    ? '?' + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : ''

  const path = url.pathname.replace(/\/+$/, '') || '/'
  return `${url.hostname}${path}${search}`
}

// ---------------------------------------------------------------------------
// Date compatibility
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000
/** A re-paste correcting dates can shift them; a touring return is far larger. */
const ADJACENT_DAY_TOLERANCE = 45

function toUtc(date: string | null | undefined): number | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

/**
 * True when two date ranges overlap, or sit close enough that one is plausibly
 * a correction of the other rather than a separate run.
 */
export function datesCompatible(
  aStart: string | null | undefined,
  aEnd: string | null | undefined,
  bStart: string | null | undefined,
  bEnd: string | null | undefined
): boolean {
  const s1 = toUtc(aStart)
  const s2 = toUtc(bStart)
  if (s1 === null || s2 === null) return false

  const e1 = toUtc(aEnd) ?? s1
  const e2 = toUtc(bEnd) ?? s2

  // Overlapping
  if (s1 <= e2 && s2 <= e1) return true

  // Adjacent within tolerance
  const gap = s1 > e2 ? s1 - e2 : s2 - e1
  return gap / DAY_MS <= ADJACENT_DAY_TOLERANCE
}

// ---------------------------------------------------------------------------
// Candidate shapes
// ---------------------------------------------------------------------------

export interface ExhibitionCandidate {
  id: string
  title: string
  venue: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  exhibition_url: string | null
  updated_at: string | null
  status?: string | null
}

export interface PressCandidate {
  id: string
  title: string
  publication: string | null
  author: string | null
  publish_date: string | null
  url: string | null
  updated_at: string | null
  status?: string | null
}

// ---------------------------------------------------------------------------
// Exhibition matching
// ---------------------------------------------------------------------------

/**
 * @param parsed      the incoming entry
 * @param candidates  ALL exhibitions. Phase 1 (URL) deliberately scans every
 *                    record with no date window: correcting a wrong date is a
 *                    primary reason to re-import, so a date-scoped query would
 *                    hide exactly the record that needs updating.
 */
export function findExhibitionMatch(
  parsed: ParsedExhibition,
  candidates: readonly ExhibitionCandidate[]
): MatchResult {
  const warnings: string[] = []

  // --- Phase 1: canonical URL is decisive on its own, across all records ---
  const parsedUrl = canonicalizeUrl(parsed.exhibition_url)
  if (parsedUrl) {
    const hit = candidates.find((c) => canonicalizeUrl(c.exhibition_url) === parsedUrl)
    if (hit) {
      return {
        matchId: hit.id,
        confidence: 1,
        action: 'update',
        warnings,
        targetUpdatedAt: hit.updated_at,
      }
    }
  }

  // --- Phase 2: exact normalized title, then two independent signals -------
  const title = normalizeTitle(parsed.title)
  if (!title) return noMatch(warnings)

  const sameTitle = candidates.filter((c) => normalizeTitle(c.title) === title)
  if (sameTitle.length === 0) return noMatch(warnings)

  const parsedVenue = normalizePlace(parsed.venue)
  const parsedCity = normalizePlace(parsed.city)

  const scored = sameTitle.map((candidate) => {
    const candVenue = normalizePlace(candidate.venue)
    const candCity = normalizePlace(candidate.city)

    // ONE place signal, not two. Venue and city are correlated — counting them
    // separately would let a recurring annual event at the same venue satisfy
    // "two signals" on location alone and auto-update the wrong year.
    const placeMatch = parsedVenue && candVenue
      ? parsedVenue === candVenue
      : Boolean(parsedCity && candCity && parsedCity === candCity)

    const dateMatch = datesCompatible(
      parsed.start_date,
      parsed.end_date,
      candidate.start_date,
      candidate.end_date
    )

    return { candidate, placeMatch, dateMatch }
  })

  // Auto-update requires BOTH remaining signals: same place AND compatible
  // dates. Title+place alone merges a recurring annual event or a touring
  // return; title+dates alone merges two institutions running concurrently.
  const confident = scored.find((s) => s.placeMatch && s.dateMatch)
  if (confident) {
    return {
      matchId: confident.candidate.id,
      confidence: 0.95,
      action: 'update',
      warnings,
      targetUpdatedAt: confident.candidate.updated_at,
    }
  }

  // Same title, insufficient corroboration — almost always a touring show.
  const near = scored[0]
  warnings.push(
    near.placeMatch
      ? `Same title and venue as an existing entry, but the dates are far apart — treated as a separate run. Check it is not a duplicate.`
      : `"${parsed.title}" already exists at a different venue (${near.candidate.venue ?? 'unknown venue'}). Treated as a separate entry — this archive tours the same show to multiple venues.`
  )

  return { matchId: null, confidence: null, action: 'create', warnings, targetUpdatedAt: null }
}

// ---------------------------------------------------------------------------
// Press matching
// ---------------------------------------------------------------------------

export function findPressMatch(
  parsed: ParsedPress,
  candidates: readonly PressCandidate[]
): MatchResult {
  const warnings: string[] = []

  // --- Strongest: canonical URL --------------------------------------------
  const parsedUrl = canonicalizeUrl(parsed.url)
  if (parsedUrl) {
    const hit = candidates.find((c) => canonicalizeUrl(c.url) === parsedUrl)
    if (hit) {
      return {
        matchId: hit.id,
        confidence: 1,
        action: 'update',
        warnings,
        targetUpdatedAt: hit.updated_at,
      }
    }
  }

  const title = normalizeTitle(parsed.title)
  if (!title) return noMatch(warnings)

  // --- No URL: publication + title + publish_date ---------------------------
  if (parsed.publication && parsed.publish_date) {
    const pub = normalizePlace(parsed.publication)
    const hit = candidates.find(
      (c) =>
        normalizeTitle(c.title) === title &&
        normalizePlace(c.publication) === pub &&
        c.publish_date === parsed.publish_date
    )
    if (hit) {
      return {
        matchId: hit.id,
        confidence: 0.9,
        action: 'update',
        warnings,
        targetUpdatedAt: hit.updated_at,
      }
    }
  }

  // --- Weakest: title/author similarity is a WARNING only, never an update --
  const similar = candidates.find((c) => normalizeTitle(c.title) === title)
  if (similar) {
    warnings.push(
      `An article titled "${similar.title}" already exists${
        similar.publication ? ` in ${similar.publication}` : ''
      }. Treated as new — confirm it is not a duplicate.`
    )
  }

  return { matchId: null, confidence: null, action: 'create', warnings, targetUpdatedAt: null }
}

function noMatch(warnings: string[]): MatchResult {
  return { matchId: null, confidence: null, action: 'create', warnings, targetUpdatedAt: null }
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

export interface FieldDiff {
  from: unknown
  to: unknown
  changed: boolean
}

/**
 * Field-level diff driving both the review UI and the DEFAULT apply mask.
 *
 * Only fields the parse actually expressed are compared — a field the parser
 * omitted is not a proposal to blank the existing value.
 */
export function buildMatchSummary(
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
  fields: readonly string[]
): Record<string, FieldDiff> {
  const summary: Record<string, FieldDiff> = {}

  for (const field of fields) {
    if (!(field in incoming)) continue
    const to = incoming[field]
    if (to === null || to === undefined || to === '') continue

    const from = existing[field] ?? null
    summary[field] = { from, to, changed: !valuesEqual(from, to) }
  }

  return summary
}

/** Fields that actually differ — the default set of checkboxes to offer. */
export function changedFields(summary: Record<string, FieldDiff>): string[] {
  return Object.entries(summary)
    .filter(([, diff]) => diff.changed)
    .map(([field]) => field)
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || a === undefined) return b === null || b === undefined || b === ''
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b)
  return String(a).trim() === String(b).trim()
}
