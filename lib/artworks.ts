import { createClient } from '@/lib/supabase/server'

export interface FeaturedArtwork {
  id: string
  title: string
  year: number | null
  image_url: string
  image_thumbnail_url: string | null
  medium: string | null
  availability_status: string
  display_order: number | null
}

/**
 * Get featured, published artworks for the public homepage
 * Returns artworks ordered by display_order ascending, then by created_at descending
 * @param limit Maximum number of artworks to return (default: 8)
 */
export async function getFeaturedArtworks(limit: number = 8): Promise<FeaturedArtwork[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, year, image_url, image_thumbnail_url, medium, availability_status, display_order')
    .eq('status', 'published')
    .eq('is_featured', true)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured artworks:', error)
    return []
  }

  return data || []
}

/**
 * Get all published artworks with featured ones first
 * Used for the Works page
 * @param options Filter and pagination options
 */
export async function getPublishedArtworks(options: {
  category?: string
  q?: string
  limit?: number
  offset?: number
} = {}): Promise<{ artworks: FeaturedArtwork[]; total: number }> {
  const supabase = await createClient()
  const { category, q, limit = 50, offset = 0 } = options

  let query = supabase
    .from('artworks')
    .select('id, title, year, image_url, image_thumbnail_url, medium, availability_status, display_order, is_featured', { count: 'exact' })
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching published artworks:', error)
    return { artworks: [], total: 0 }
  }

  return { artworks: data || [], total: count || 0 }
}
