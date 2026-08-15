/**
 * Smart Import service layer.
 *
 * Everything the API routes need that is not HTTP: matching newly parsed items
 * against existing content, shaping rows for insert, deriving batch progress,
 * and preparing a publish payload for the atomic RPC.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'
import type { ParsedBatchItem } from '@/lib/ai/content-parser'
import {
  findExhibitionMatch,
  findPressMatch,
  buildMatchSummary,
  changedFields,
  type ExhibitionCandidate,
  type PressCandidate,
} from './matching'
import { buildExhibitionPayload, buildPressPayload } from './mapping'
import {
  writableFieldsFor,
  identityFieldsFor,
  type ParsedExhibition,
  type ParsedPress,
} from './schemas'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export type TargetType = 'exhibition' | 'press'
export type ItemStatus =
  | 'pending'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'skipped'
  | 'parse_failed'

export interface ImportItemRow {
  id: string
  import_id: string
  source_index: number
  source_text: string
  target_type: TargetType
  entry_kind: string | null
  parsed_data: Record<string, unknown>
  edited_data: Record<string, unknown> | null
  apply_mask: string[]
  reviewed_at: string | null
  confidence: number | null
  warnings: string[]
  match_exhibition_id: string | null
  match_press_id: string | null
  match_target_updated_at: string | null
  match_confidence: number | null
  match_summary: Record<string, unknown> | null
  match_snapshot: Record<string, unknown> | null
  action: 'create' | 'update' | 'skip'
  status: ItemStatus
  error_message: string | null
  published_exhibition_id: string | null
  published_press_id: string | null
  published_snapshot: Record<string, unknown> | null
}

/**
 * Publish progress, DERIVED from item states rather than stored, so it cannot
 * drift from reality. Predicates are evaluated in order and do not overlap.
 */
export type BatchProgress =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'complete_with_parse_errors'
  | 'needs_attention'

export function deriveBatchProgress(statuses: readonly ItemStatus[]): BatchProgress {
  if (statuses.length === 0) return 'not_started'

  const has = (s: ItemStatus) => statuses.includes(s)
  const count = (s: ItemStatus) => statuses.filter((x) => x === s).length

  // 1. Anything needing a human decision outranks everything else.
  if (has('failed') || has('publishing')) return 'needs_attention'

  const actionable = count('pending')

  // 2/3. Nothing left to do.
  if (actionable === 0) {
    return has('parse_failed') ? 'complete_with_parse_errors' : 'complete'
  }

  // 4. Partially worked through.
  if (has('published') || has('skipped')) return 'in_progress'

  // 5. Untouched.
  return 'not_started'
}

// ---------------------------------------------------------------------------
// Candidate loading
// ---------------------------------------------------------------------------

export async function loadExhibitionCandidates(
  client: AnyClient
): Promise<ExhibitionCandidate[]> {
  const { data, error } = await client
    .from('exhibitions')
    .select('id, title, venue, city, start_date, end_date, exhibition_url, updated_at, status')
  if (error) throw new Error(`Failed to load exhibitions: ${error.message}`)
  return (data ?? []) as ExhibitionCandidate[]
}

export async function loadPressCandidates(client: AnyClient): Promise<PressCandidate[]> {
  const { data, error } = await client
    .from('press')
    .select('id, title, publication, author, publish_date, url, updated_at, status')
  if (error) throw new Error(`Failed to load press: ${error.message}`)
  return (data ?? []) as PressCandidate[]
}

// ---------------------------------------------------------------------------
// Row building
// ---------------------------------------------------------------------------

export interface BuildRowsOptions {
  importId: string
  parsed: readonly ParsedBatchItem[]
  exhibitions: readonly ExhibitionCandidate[]
  press: readonly PressCandidate[]
}

/**
 * Turn parser output into insertable rows, matched against existing content.
 *
 * Items that failed validation become `parse_failed` rows rather than being
 * dropped, so the client can see what the AI produced that we could not use.
 */
export function buildItemRows(opts: BuildRowsOptions): Record<string, unknown>[] {
  const { importId, parsed, exhibitions, press } = opts

  return parsed.map((entry) => {
    if (!entry.item) {
      return {
        import_id: importId,
        source_index: entry.sourceIndex,
        source_text: entry.sourceText,
        target_type: 'exhibition',
        entry_kind: 'exhibition',
        parsed_data: {},
        warnings: [],
        action: 'skip',
        status: 'parse_failed',
        error_message: entry.parseError,
      }
    }

    const { target_type, data, confidence, warnings, source_text } = entry.item

    if (target_type === 'exhibition') {
      const parsedEx = data as ParsedExhibition
      const match = findExhibitionMatch(parsedEx, exhibitions)
      const matched = match.matchId
        ? exhibitions.find((c) => c.id === match.matchId) ?? null
        : null

      const summary = matched
        ? buildMatchSummary(
            parsedEx as unknown as Record<string, unknown>,
            matched as unknown as Record<string, unknown>,
            writableFieldsFor('exhibition')
          )
        : null

      return {
        import_id: importId,
        source_index: entry.sourceIndex,
        source_text,
        target_type: 'exhibition',
        entry_kind: parsedEx.entry_kind,
        parsed_data: parsedEx,
        confidence,
        warnings: [...warnings, ...match.warnings],
        match_exhibition_id: match.matchId,
        match_target_updated_at: match.targetUpdatedAt,
        match_confidence: match.confidence,
        match_summary: summary,
        match_snapshot: matched
          ? { id: matched.id, type: 'exhibition', title: matched.title, status: matched.status ?? null }
          : null,
        // Fields are pre-checked ONLY for drafts. A live target starts with an
        // empty mask so nothing can be written without a human ticking it.
        apply_mask:
          summary && matched?.status !== 'published' ? changedFields(summary) : [],
        action: match.action,
        status: 'pending',
      }
    }

    const parsedPress = data as ParsedPress
    const match = findPressMatch(parsedPress, press)
    const matched = match.matchId ? press.find((c) => c.id === match.matchId) ?? null : null

    const summary = matched
      ? buildMatchSummary(
          parsedPress as unknown as Record<string, unknown>,
          matched as unknown as Record<string, unknown>,
          writableFieldsFor('press')
        )
      : null

    return {
      import_id: importId,
      source_index: entry.sourceIndex,
      source_text,
      target_type: 'press',
      entry_kind: null,
      parsed_data: parsedPress,
      confidence,
      warnings: [...warnings, ...match.warnings],
      match_press_id: match.matchId,
      match_target_updated_at: match.targetUpdatedAt,
      match_confidence: match.confidence,
      match_summary: summary,
      match_snapshot: matched
        ? { id: matched.id, type: 'press', title: matched.title, status: matched.status ?? null }
        : null,
      apply_mask: summary && matched?.status !== 'published' ? changedFields(summary) : [],
      action: match.action,
      status: 'pending',
    }
  })
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * Unique slug generation with in-request reservation.
 *
 * `reserved` carries slugs already handed out during THIS publish call, which
 * a plain database read cannot know about. The RPC still surfaces a 23505 if
 * two requests race; callers retry once with a fresh suffix.
 */
export async function generateUniqueSlugFor(
  client: AnyClient,
  table: 'exhibitions' | 'press',
  title: string,
  reserved: Set<string>
): Promise<string | null> {
  const base = generateSlug(title)
  if (!base) return null // e.g. a title of only punctuation

  const { data } = await client.from(table).select('slug').like('slug', `${base}%`)
  const taken = new Set<string>(
    ((data ?? []) as { slug: string | null }[]).map((r) => r.slug).filter(Boolean) as string[]
  )
  reserved.forEach((s) => taken.add(s))

  if (!taken.has(base)) {
    reserved.add(base)
    return base
  }

  let n = 1
  while (taken.has(`${base}-${n}`)) n += 1
  const slug = `${base}-${n}`
  reserved.add(slug)
  return slug
}

// ---------------------------------------------------------------------------
// Publish preparation
// ---------------------------------------------------------------------------

export interface PreparedPublish {
  ok: boolean
  errors: string[]
  warnings: string[]
  targetType: TargetType
  expectedUpdatedAt: string | null
  payload: Record<string, unknown>
  applyMask: string[]
}

/**
 * Everything that must happen in TypeScript before the atomic RPC: merge the
 * approved fields over the current record, derive server-owned values, and
 * validate the WHOLE resulting row.
 *
 * A Postgres function cannot call zod, generateSlug, or the geocoder — this is
 * that half of the boundary.
 */
export async function preparePublish(
  client: AnyClient,
  item: ImportItemRow,
  reservedSlugs: Set<string>
): Promise<PreparedPublish> {
  const targetType = item.target_type
  const effective = { ...(item.parsed_data ?? {}), ...(item.edited_data ?? {}) }

  if (item.action === 'skip') {
    return empty(targetType, ['This item is marked to skip.'])
  }

  let existing: Record<string, unknown> | null = null
  let expectedUpdatedAt: string | null = null

  if (item.action === 'update') {
    const table = targetType === 'exhibition' ? 'exhibitions' : 'press'
    const id = targetType === 'exhibition' ? item.match_exhibition_id : item.match_press_id
    if (!id) return empty(targetType, ['This item has no matched record to update.'])

    const { data, error } = await client.from(table).select('*').eq('id', id).single()
    if (error || !data) return empty(targetType, ['The matched record no longer exists.'])

    existing = data as Record<string, unknown>
    expectedUpdatedAt = (existing.updated_at as string) ?? null

    // The diff the human approved was computed against a specific version.
    if (item.match_target_updated_at && expectedUpdatedAt !== item.match_target_updated_at) {
      return empty(targetType, [
        'This record changed after it was matched. Refresh the match and review the new differences.',
      ])
    }
    // Send the version we actually just read, so the RPC's in-transaction
    // check compares against a value from this same request.
    expectedUpdatedAt = item.match_target_updated_at
  }

  let slug: string | undefined
  if (item.action === 'create') {
    const table = targetType === 'exhibition' ? 'exhibitions' : 'press'
    const title = (effective.title as string) ?? ''
    slug = (await generateUniqueSlugFor(client, table, title, reservedSlugs)) ?? undefined
  }

  const built =
    targetType === 'exhibition'
      ? buildExhibitionPayload({
          parsed: effective as unknown as ParsedExhibition,
          action: item.action as 'create' | 'update',
          existing,
          applyMask: item.apply_mask,
          slug,
        })
      : buildPressPayload({
          parsed: effective as unknown as ParsedPress,
          action: item.action as 'create' | 'update',
          existing,
          applyMask: item.apply_mask,
          slug,
        })

  return {
    ok: built.errors.length === 0,
    errors: built.errors,
    warnings: built.warnings,
    targetType,
    expectedUpdatedAt,
    payload: built.payload,
    applyMask: built.fields,
  }
}

function empty(targetType: TargetType, errors: string[]): PreparedPublish {
  return {
    ok: false,
    errors,
    warnings: [],
    targetType,
    expectedUpdatedAt: null,
    payload: {},
    applyMask: [],
  }
}

// ---------------------------------------------------------------------------
// Match invalidation
// ---------------------------------------------------------------------------

/**
 * True when an edit touched a field that identifies WHICH record this is.
 *
 * Editing a title, venue, date or URL means the approved diff may no longer
 * describe the same thing, so the match must be recomputed before publish.
 */
export function editInvalidatesMatch(
  targetType: TargetType,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): boolean {
  return identityFieldsFor(targetType).some(
    (field) => field in after && String(after[field] ?? '') !== String(before[field] ?? '')
  )
}

export function adminClient(): AnyClient {
  return createAdminClient()
}
