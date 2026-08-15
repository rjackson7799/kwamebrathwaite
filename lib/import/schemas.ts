/**
 * Canonical shapes for Smart Import.
 *
 * There are three distinct shapes in this pipeline and they must not be
 * conflated:
 *
 *   ParsedExhibition / ParsedPress   <- model output ONLY. No slug, no status,
 *   (this file)                         no exhibition_type. The model is not
 *                                       allowed to decide any of those.
 *          |  toExhibitionInput() / toPressInput()   (lib/import/mapping.ts)
 *          v
 *   AdminExhibitionInput / AdminPressInput   <- existing zod schemas in
 *                                               lib/api/validation.ts, unchanged
 *          |  supabase insert / update
 *          v
 *   exhibitions / press rows
 *
 * Keeping these separate is what stops the review UI's JSON shape from
 * accidentally becoming the database write payload.
 */

import { z } from 'zod'

export const ENTRY_KINDS = ['exhibition', 'screening', 'talk', 'event'] as const
export type EntryKind = (typeof ENTRY_KINDS)[number]

/**
 * Precedence when an entry legitimately matches more than one kind — e.g.
 * "Documentary Screening at Nexus Art Week with talk with Kwame Samori" is both
 * a screening and a talk. Lower index wins, so that entry resolves to
 * 'screening' and the talk detail survives in `description`.
 *
 * A single deterministic value means every test has exactly one expected result.
 */
export const ENTRY_KIND_PRECEDENCE: readonly EntryKind[] = [
  'screening',
  'talk',
  'event',
  'exhibition',
]

export function resolveEntryKind(candidates: readonly string[]): EntryKind {
  for (const kind of ENTRY_KIND_PRECEDENCE) {
    if (candidates.includes(kind)) return kind
  }
  return 'exhibition'
}

/**
 * A real calendar date in YYYY-MM-DD form.
 *
 * Checked by round-tripping through UTC rather than a bare regex, so
 * 2026-02-30 is rejected instead of silently rolling into March. Parsed with
 * Date.UTC to avoid the local-timezone shift that `new Date('2026-01-01')`
 * variants introduce.
 */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    )
  }, 'Not a real calendar date')

/** Optional URL that tolerates the empty string the model sometimes emits. */
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must be an http(s) URL')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const optionalText = (max?: number) => {
  const base = max ? z.string().trim().max(max) : z.string().trim()
  return base
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
}

/**
 * Exhibition-shaped entry as the model reads it.
 *
 * Geography fields hold the RAW tokens from the source ("AU", "DC") — the
 * model is not asked to canonicalize, because guessing a country from a weak
 * abbreviation is exactly the failure we want visible. Canonicalization and
 * its warnings happen deterministically in mapping.ts.
 */
export const parsedExhibitionSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(255),
    entry_kind: z.enum(ENTRY_KINDS),
    venue: optionalText(255),
    city: optionalText(100),
    state_region: optionalText(100),
    country: optionalText(100),
    start_date: isoDateSchema.nullable().optional(),
    end_date: isoDateSchema.nullable().optional(),
    description: optionalText(),
    venue_url: optionalUrl,
    exhibition_url: optionalUrl,
  })
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    { message: 'end_date must not be before start_date', path: ['end_date'] }
  )

export type ParsedExhibition = z.infer<typeof parsedExhibitionSchema>

export const PRESS_TYPES = ['article', 'review', 'interview', 'feature'] as const

export const parsedPressSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  publication: optionalText(255),
  author: optionalText(255),
  publish_date: isoDateSchema.nullable().optional(),
  url: optionalUrl,
  excerpt: optionalText(),
  press_type: z.enum(PRESS_TYPES).nullable().optional(),
})

export type ParsedPress = z.infer<typeof parsedPressSchema>

/**
 * One item as returned by the model, before matching.
 *
 * `source_text` is required: it is the client's proof of what the AI was
 * looking at, shown beside every field in review, and it anchors the synthetic
 * failure row when a whole chunk fails.
 */
export const parsedItemSchema = z.discriminatedUnion('target_type', [
  z.object({
    target_type: z.literal('exhibition'),
    source_text: z.string().min(1, 'source_text is required'),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string().max(500)).default([]),
    data: parsedExhibitionSchema,
  }),
  z.object({
    target_type: z.literal('press'),
    source_text: z.string().min(1, 'source_text is required'),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string().max(500)).default([]),
    data: parsedPressSchema,
  }),
])

export type ParsedItem = z.infer<typeof parsedItemSchema>

/** Top-level envelope the model must return. */
export const parserResponseSchema = z.object({
  items: z.array(z.unknown()),
})

/**
 * Fields an admin may write on each target type.
 *
 * This is the allowlist `apply_mask` narrows — it can never widen it. Anything
 * absent here is server-owned or system metadata: ids, timestamps, slug,
 * status, display_order, and the founder-preview columns
 * (preview_starts_at / preview_notes) are all deliberately excluded, so an
 * import can never reach them.
 *
 * The publish RPC re-declares an equivalent allowlist and re-checks it, because
 * application JSON is untrusted at the database boundary.
 */
export const EXHIBITION_WRITABLE_FIELDS = [
  'title',
  'venue',
  'street_address',
  'city',
  'state_region',
  'postal_code',
  'country',
  'start_date',
  'end_date',
  'description',
  'image_url',
  'thumbnail_image_url',
  'entry_kind',
  'exhibition_type',
  'location_lat',
  'location_lng',
  'venue_url',
  'venue_description',
  'exhibition_url',
  'meta_title',
  'meta_description',
] as const

export const PRESS_WRITABLE_FIELDS = [
  'title',
  'publication',
  'author',
  'publish_date',
  'url',
  'excerpt',
  'image_url',
  'press_type',
  'is_featured',
  'meta_title',
  'meta_description',
] as const

/**
 * Fields that identify WHICH record this is. Editing any of them invalidates an
 * existing match: the diff a human approved would no longer describe the same
 * thing. Rematch is required before publish.
 */
export const EXHIBITION_IDENTITY_FIELDS = [
  'title',
  'venue',
  'city',
  'start_date',
  'end_date',
  'exhibition_url',
] as const

export const PRESS_IDENTITY_FIELDS = [
  'title',
  'publication',
  'author',
  'publish_date',
  'url',
] as const

export function writableFieldsFor(targetType: 'exhibition' | 'press'): readonly string[] {
  return targetType === 'exhibition' ? EXHIBITION_WRITABLE_FIELDS : PRESS_WRITABLE_FIELDS
}

export function identityFieldsFor(targetType: 'exhibition' | 'press'): readonly string[] {
  return targetType === 'exhibition' ? EXHIBITION_IDENTITY_FIELDS : PRESS_IDENTITY_FIELDS
}
