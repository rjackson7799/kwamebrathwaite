import { createClient } from '@/lib/supabase/server'
import type { PageSettings } from '@/lib/supabase/types'

export async function getPageSettings(slug: string): Promise<PageSettings | null> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('page_settings')
      .select('*')
      .eq('page_slug', slug)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch {
    // During static generation, cookies() is unavailable — return null to use defaults
    return null
  }
}

export async function getShowTitle(slug: string): Promise<boolean> {
  const settings = await getPageSettings(slug)
  // Default to true if no settings exist
  return settings?.show_title ?? true
}

export async function getSectionVisibility(
  slug: string,
  section: string
): Promise<boolean> {
  const settings = await getPageSettings(slug)
  if (!settings?.metadata || typeof settings.metadata !== 'object' || Array.isArray(settings.metadata)) {
    return false
  }
  const meta = settings.metadata as Record<string, unknown>
  return meta[`show_${section}`] === true
}
