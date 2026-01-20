import { createClient } from '@/lib/supabase/server'
import type { HeroSlide } from '@/lib/supabase/types'

export interface PublicHeroSlide {
  id: string
  image_url: string
  overlay_opacity: number
  display_order: number
}

/**
 * Get active, published hero slides for the public homepage
 * Returns slides ordered by display_order ascending
 */
export async function getHeroSlides(): Promise<PublicHeroSlide[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hero_slides')
    .select('id, image_url, overlay_opacity, display_order')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching hero slides:', error)
    return []
  }

  return data || []
}

/**
 * Get all hero slides for admin panel
 * Returns all slides regardless of status, ordered by display_order
 */
export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching admin hero slides:', error)
    return []
  }

  return data || []
}

/**
 * Get a single hero slide by ID for admin editing
 */
export async function getAdminHeroSlideById(id: string): Promise<HeroSlide | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching hero slide:', error)
    return null
  }

  return data
}
