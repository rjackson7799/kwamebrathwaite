import { createClient } from '@/lib/supabase/server'
import { translatePageContent } from '@/lib/ai/translation-service'

export interface PreviewExhibitionListItem {
  id: string
  slug: string
  title: string
  venue: string | null
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  thumbnail_image_url: string | null
  preview_starts_at: string
}

export interface PreviewExhibitionDetail extends PreviewExhibitionListItem {
  description: string | null
  preview_notes: string | null
  venue_url: string | null
  exhibition_url: string | null
}

interface ExhibitionRow {
  id: string
  slug: string
  title: string
  venue: string | null
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  thumbnail_image_url: string | null
  description: string | null
  preview_starts_at: string | null
  preview_notes: string | null
  venue_url: string | null
  exhibition_url: string | null
}

/**
 * Portal-side: list exhibitions currently inside their founder preview window.
 *
 * RLS gate (founders_read_exhibition_previews policy in
 * 2026-05-25-exhibition-previews.sql) returns only rows where:
 *   - is_current_founder() = true
 *   - preview_starts_at IS NOT NULL AND preview_starts_at <= now()
 *   - status = 'draft'
 *
 * No app-level status filter is needed (and would be wrong — the policy IS
 * the gate). The other policies on exhibitions (public + admin) OR together
 * with this one, but those won't match for a founder reading via the SSR
 * client unless they happen to also be an admin.
 *
 * The list view does not translate `preview_notes` — that field is only
 * shown on the detail page. Title stays in source language since exhibitions
 * have no existing translation wiring (out of Phase 2B scope).
 */
export async function getActivePreviews(
  _locale: string,
  opts: { limit?: number } = {}
): Promise<PreviewExhibitionListItem[]> {
  const limit = opts.limit ?? 50
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('exhibitions')
    .select(
      'id, slug, title, venue, city, country, start_date, end_date, image_url, thumbnail_image_url, preview_starts_at'
    )
    .order('preview_starts_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getActivePreviews failed:', error)
    return []
  }

  const rows = ((data ?? []) as ExhibitionRow[]).filter(
    (r): r is ExhibitionRow & { preview_starts_at: string } =>
      Boolean(r.preview_starts_at)
  )

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    venue: row.venue,
    city: row.city,
    country: row.country,
    start_date: row.start_date,
    end_date: row.end_date,
    image_url: row.image_url,
    thumbnail_image_url: row.thumbnail_image_url,
    preview_starts_at: row.preview_starts_at,
  }))
}

/**
 * Portal-side: fetch one preview exhibition for the detail page, with
 * `preview_notes` translated. Returns null if the row does not exist,
 * the preview window is in the future, the row is no longer draft, or the
 * caller is not an active founder (all collapse to "no row" under RLS).
 *
 * Phase 2B explicitly translates only preview_notes. title/description
 * stay in source language pending a future exhibition-wide translation
 * pass on the public surface.
 */
export async function getPreviewExhibition(
  id: string,
  locale: string
): Promise<PreviewExhibitionDetail | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('exhibitions')
    .select(
      'id, slug, title, venue, city, country, start_date, end_date, ' +
        'image_url, thumbnail_image_url, description, preview_starts_at, ' +
        'preview_notes, venue_url, exhibition_url'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('getPreviewExhibition failed:', error)
    return null
  }
  if (!data) return null
  const row = data as ExhibitionRow
  if (!row.preview_starts_at) return null

  const preview_notes = row.preview_notes
    ? await translatePageContent(
        row.preview_notes,
        locale,
        'exhibitions',
        row.id,
        'preview_notes'
      )
    : null

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    venue: row.venue,
    city: row.city,
    country: row.country,
    start_date: row.start_date,
    end_date: row.end_date,
    image_url: row.image_url,
    thumbnail_image_url: row.thumbnail_image_url,
    description: row.description,
    preview_notes,
    preview_starts_at: row.preview_starts_at,
    venue_url: row.venue_url,
    exhibition_url: row.exhibition_url,
  }
}
