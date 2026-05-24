import { createClient } from '@/lib/supabase/server'
import { translatePageContent } from '@/lib/ai/translation-service'

export interface BriefingListItem {
  id: string
  title: string
  excerpt: string | null
  published_at: string
}

export interface BriefingDetail extends BriefingListItem {
  body_html: string
}

interface BriefingsRow {
  id: string
  title: string
  excerpt: string | null
  body_html: string
  published_at: string | null
}

/**
 * Portal-side: list published briefings for the current locale.
 *
 * Uses the SSR client so RLS enforces the membership gate
 * (founder_briefings_select policy in 2026-05-24-briefings.sql). Translation
 * happens lazily on read via translatePageContent — cache miss calls DeepL,
 * cache hit short-circuits.
 */
export async function getPublishedBriefings(
  locale: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<BriefingListItem[]> {
  const limit = opts.limit ?? 20
  const offset = opts.offset ?? 0
  const supabase = await createClient()

  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            range: (from: number, to: number) => Promise<{ data: BriefingsRow[] | null; error: unknown }>
          }
        }
      }
    }
  })
    .from('founder_briefings')
    .select('id, title, excerpt, body_html, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('getPublishedBriefings failed:', error)
    return []
  }

  const rows = (data ?? []).filter((r): r is BriefingsRow & { published_at: string } => Boolean(r.published_at))

  // Translate title + excerpt in parallel per-row. body_html is not fetched
  // in lists — only the detail view pulls and translates it.
  return Promise.all(
    rows.map(async (row) => {
      const [title, excerpt] = await Promise.all([
        translatePageContent(row.title, locale, 'founder_briefings', row.id, 'title'),
        row.excerpt
          ? translatePageContent(row.excerpt, locale, 'founder_briefings', row.id, 'excerpt')
          : Promise.resolve(null as string | null),
      ])
      return {
        id: row.id,
        title,
        excerpt,
        published_at: row.published_at,
      }
    })
  )
}

/**
 * Portal-side: fetch one briefing for the detail page, translated.
 *
 * Returns null if the briefing does not exist, is not published, or the
 * caller is not an active founder (all three collapse to "no row" under RLS).
 */
export async function getBriefingForReader(
  id: string,
  locale: string
): Promise<BriefingDetail | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: BriefingsRow | null; error: unknown }>
          }
        }
      }
    }
  })
    .from('founder_briefings')
    .select('id, title, excerpt, body_html, published_at')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    console.error('getBriefingForReader failed:', error)
    return null
  }
  if (!data || !data.published_at) return null

  const [title, excerpt, body_html] = await Promise.all([
    translatePageContent(data.title, locale, 'founder_briefings', data.id, 'title'),
    data.excerpt
      ? translatePageContent(data.excerpt, locale, 'founder_briefings', data.id, 'excerpt')
      : Promise.resolve(null as string | null),
    translatePageContent(data.body_html, locale, 'founder_briefings', data.id, 'body_html'),
  ])

  return {
    id: data.id,
    title,
    excerpt,
    body_html,
    published_at: data.published_at,
  }
}

/**
 * Portal-side: record that the current user has read this briefing.
 *
 * Idempotent via the composite PK on founder_briefing_reads. Uses the SSR
 * client so the founder_briefing_reads_self_insert RLS policy enforces
 * that user_id = auth.uid() AND status='active'. Errors are swallowed —
 * a failed read-receipt must never break the reading experience.
 */
export async function recordBriefingRead(briefingId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('founder_briefing_reads')
    .upsert(
      { briefing_id: briefingId, user_id: userId },
      { onConflict: 'briefing_id,user_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('recordBriefingRead failed (non-fatal):', error)
  }
}
