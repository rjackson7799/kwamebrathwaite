import { createClient } from '@/lib/supabase/server'

export interface PublicExhibition {
  id: string
  slug: string
  title: string
  venue: string | null
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  image_url: string | null
  exhibition_type: 'past' | 'current' | 'upcoming'
  /** Kind of entry. Separate from exhibition_type, which is temporal. */
  entry_kind?: 'exhibition' | 'screening' | 'talk' | 'event' | null
}

// Type for the raw database response
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
  entry_kind: 'exhibition' | 'screening' | 'talk' | 'event' | null
}

/**
 * Get current exhibitions for the public homepage
 * Returns exhibitions that are currently running (start_date <= today <= end_date)
 * @param limit Maximum number of exhibitions to return (default: 4)
 */
export async function getCurrentExhibitions(limit: number = 4): Promise<PublicExhibition[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('exhibitions')
    .select('id, slug, title, venue, city, country, start_date, end_date, image_url, entry_kind')
    .eq('status', 'published')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching current exhibitions:', error)
    return []
  }

  // Add exhibition_type to match the Exhibition interface
  return (data as ExhibitionRow[] || []).map((e): PublicExhibition => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    venue: e.venue,
    city: e.city,
    country: e.country,
    start_date: e.start_date,
    end_date: e.end_date,
    image_url: e.image_url,
    entry_kind: e.entry_kind,
    exhibition_type: 'current'
  }))
}

/**
 * Get upcoming exhibitions
 * Returns exhibitions that haven't started yet (start_date > today)
 * @param limit Maximum number of exhibitions to return (default: 4)
 */
export async function getUpcomingExhibitions(limit: number = 4): Promise<PublicExhibition[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('exhibitions')
    .select('id, slug, title, venue, city, country, start_date, end_date, image_url, entry_kind')
    .eq('status', 'published')
    .gt('start_date', today)
    .order('start_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching upcoming exhibitions:', error)
    return []
  }

  return (data as ExhibitionRow[] || []).map((e): PublicExhibition => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    venue: e.venue,
    city: e.city,
    country: e.country,
    start_date: e.start_date,
    end_date: e.end_date,
    image_url: e.image_url,
    entry_kind: e.entry_kind,
    exhibition_type: 'upcoming'
  }))
}
