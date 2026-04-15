import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export function urlHash(url: string): string {
  return createHash('md5').update(url).digest('hex')
}

/**
 * Returns the subset of URLs that have NOT yet been recorded in the leads table.
 */
export async function filterNewUrls(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  urls: string[]
): Promise<Set<string>> {
  if (urls.length === 0) return new Set()

  const hashes = urls.map(urlHash)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('leads')
    .select('source_url_hash')
    .in('source_url_hash', hashes)

  if (error) {
    console.error('dedup query error:', error)
    return new Set(urls) // fail-open: treat all as new, dedup index will catch true dupes
  }

  const existing = new Set<string>(
    ((data as Array<{ source_url_hash: string }>) || []).map((r) => r.source_url_hash)
  )

  const newUrls = new Set<string>()
  for (const url of urls) {
    if (!existing.has(urlHash(url))) {
      newUrls.add(url)
    }
  }
  return newUrls
}
