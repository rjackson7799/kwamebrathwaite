/**
 * Deterministic mapping: ParsedExhibition / ParsedPress -> admin write payload.
 *
 * Everything the model is NOT allowed to decide is decided here instead:
 * slug, status, exhibition_type, canonical geography, and date normalization.
 * The model's own value for any of these is ignored outright.
 */

import { adminExhibitionSchema, adminPressSchema } from '@/lib/api/validation'
import { resolveGeography } from './geography'
import {
  EXHIBITION_WRITABLE_FIELDS,
  PRESS_WRITABLE_FIELDS,
  type ParsedExhibition,
  type ParsedPress,
} from './schemas'

export type ExhibitionTemporalType = 'past' | 'current' | 'upcoming'
export type TargetType = 'exhibition' | 'press'

/**
 * Today as a UTC date-only string.
 *
 * MUST match how the rest of the codebase computes "today" — lib/exhibitions.ts,
 * app/api/exhibitions/route.ts and app/api/exhibitions/current/route.ts all use
 * `new Date().toISOString().split('T')[0]`. If import used local time instead,
 * the same row could be classified 'current' at publish while the public query
 * called it 'upcoming' on the same day.
 *
 * There is no timezone configuration anywhere in this repo; changing the
 * site-wide convention is deliberately out of scope for Smart Import.
 */
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().split('T')[0]
}

/**
 * Temporal classification, derived from dates — never from the model, because
 * the correct answer changes with time.
 *
 * Dates are compared as ISO strings so no local-timezone parsing can shift the
 * calendar date. Returns null only when start_date is missing, which callers
 * treat as "cannot publish" rather than writing a null temporal type.
 */
export function deriveExhibitionType(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  today: string = todayUTC()
): ExhibitionTemporalType | null {
  if (!startDate) return null

  // Open-ended run: it is current once it has started, upcoming until then.
  if (!endDate) return startDate <= today ? 'current' : 'upcoming'

  if (endDate < today) return 'past'
  if (startDate > today) return 'upcoming'
  return 'current'
}

export interface BuildPayloadResult {
  /** Flat, allowlisted payload ready for publish_import_item(). */
  payload: Record<string, unknown>
  /** Field names actually being written (the effective apply mask). */
  fields: string[]
  /** Non-blocking notes for the reviewer. */
  warnings: string[]
  /** Blocking problems. Non-empty means do not publish. */
  errors: string[]
}

export interface BuildExhibitionPayloadOptions {
  parsed: ParsedExhibition
  action: 'create' | 'update'
  /** Current target row, required for updates. */
  existing?: Record<string, unknown> | null
  /** Field names the admin approved. Ignored for creates. */
  applyMask?: readonly string[]
  /** Server-generated slug. Required for creates; never used for updates. */
  slug?: string
  /** Geocoded coordinates, if resolution succeeded. */
  coords?: { lat: number; lng: number } | null
  today?: string
}

/**
 * Build the exhibition write payload.
 *
 * For updates this returns ONLY mask-approved fields plus any server-derived
 * field whose inputs changed — never a full-record overwrite, so parser
 * omissions can't blank out populated columns.
 */
export function buildExhibitionPayload(
  opts: BuildExhibitionPayloadOptions
): BuildPayloadResult {
  const { parsed, action, existing, applyMask, slug, coords } = opts
  const today = opts.today ?? todayUTC()
  const warnings: string[] = []
  const errors: string[] = []

  const geo = resolveGeography(parsed.city, parsed.state_region, parsed.country)
  warnings.push(...geo.warnings)

  // Publication requires a start date: exhibition_type feeds object lookups and
  // i18n keys across cards, map markers, filters, sort order, calendar export,
  // reminders and structured data. A null there is not safe for all of them.
  if (!parsed.start_date) {
    errors.push('A start date is required before this can be published.')
  }

  const exhibitionType = deriveExhibitionType(parsed.start_date, parsed.end_date, today)

  // Every content field this parse can express, pre-mask.
  const candidate: Record<string, unknown> = {
    title: parsed.title,
    venue: parsed.venue ?? null,
    city: geo.city,
    state_region: geo.state_region,
    country: geo.country,
    start_date: parsed.start_date ?? null,
    end_date: parsed.end_date ?? null,
    description: parsed.description ?? null,
    entry_kind: parsed.entry_kind,
    exhibition_type: exhibitionType,
    venue_url: parsed.venue_url ?? null,
    exhibition_url: parsed.exhibition_url ?? null,
  }

  if (coords) {
    candidate.location_lat = coords.lat
    candidate.location_lng = coords.lng
  }

  let payload: Record<string, unknown>
  let fields: string[]

  if (action === 'create') {
    if (!slug) errors.push('Could not generate a URL slug from this title.')

    // Creates always land as draft, regardless of anything in the parse.
    payload = { ...stripUndefined(candidate), slug, status: 'draft' }
    fields = Object.keys(payload)
  } else {
    if (!existing) {
      errors.push('Cannot build an update without the current record.')
      return { payload: {}, fields: [], warnings, errors }
    }

    const mask = new Set(applyMask ?? [])
    payload = {}

    for (const field of EXHIBITION_WRITABLE_FIELDS) {
      if (!mask.has(field)) continue
      if (!(field in candidate)) continue
      payload[field] = candidate[field]
    }

    // exhibition_type is server-owned: if either date is being written, the
    // temporal type must be recomputed alongside it or the row goes stale
    // immediately. Recomputed from the RESULTING dates, not the parsed ones.
    if (mask.has('start_date') || mask.has('end_date')) {
      const nextStart = (mask.has('start_date') ? parsed.start_date : existing.start_date) as
        | string
        | null
      const nextEnd = (mask.has('end_date') ? parsed.end_date : existing.end_date) as
        | string
        | null
      const nextType = deriveExhibitionType(nextStart, nextEnd, today)
      if (nextType) payload.exhibition_type = nextType
    }

    fields = Object.keys(payload)
    if (fields.length === 0) {
      errors.push('No fields are selected to apply.')
    }
  }

  // Validate the WHOLE resulting record, not the partial payload:
  // adminExhibitionSchema requires title and slug, so an end_date-only update
  // must be checked as the complete row it will produce.
  const merged = { ...(existing ?? {}), ...payload }
  const validation = adminExhibitionSchema.safeParse(merged)
  if (!validation.success) {
    for (const [field, messages] of Object.entries(
      validation.error.flatten().fieldErrors
    )) {
      if (messages?.length) errors.push(`${field}: ${messages[0]}`)
    }
  }

  return { payload, fields, warnings, errors }
}

export interface BuildPressPayloadOptions {
  parsed: ParsedPress
  action: 'create' | 'update'
  existing?: Record<string, unknown> | null
  applyMask?: readonly string[]
  slug?: string
}

export function buildPressPayload(opts: BuildPressPayloadOptions): BuildPayloadResult {
  const { parsed, action, existing, applyMask, slug } = opts
  const warnings: string[] = []
  const errors: string[] = []

  const candidate: Record<string, unknown> = {
    title: parsed.title,
    publication: parsed.publication ?? null,
    author: parsed.author ?? null,
    publish_date: parsed.publish_date ?? null,
    url: parsed.url ?? null,
    excerpt: parsed.excerpt ?? null,
    press_type: parsed.press_type ?? null,
  }

  let payload: Record<string, unknown>
  let fields: string[]

  if (action === 'create') {
    if (!slug) errors.push('Could not generate a URL slug from this title.')
    payload = { ...stripUndefined(candidate), slug, status: 'draft' }
    fields = Object.keys(payload)
  } else {
    if (!existing) {
      errors.push('Cannot build an update without the current record.')
      return { payload: {}, fields: [], warnings, errors }
    }

    const mask = new Set(applyMask ?? [])
    payload = {}
    for (const field of PRESS_WRITABLE_FIELDS) {
      if (!mask.has(field)) continue
      if (!(field in candidate)) continue
      payload[field] = candidate[field]
    }

    fields = Object.keys(payload)
    if (fields.length === 0) errors.push('No fields are selected to apply.')
  }

  const merged = { ...(existing ?? {}), ...payload }
  const validation = adminPressSchema.safeParse(merged)
  if (!validation.success) {
    for (const [field, messages] of Object.entries(
      validation.error.flatten().fieldErrors
    )) {
      if (messages?.length) errors.push(`${field}: ${messages[0]}`)
    }
  }

  return { payload, fields, warnings, errors }
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}
