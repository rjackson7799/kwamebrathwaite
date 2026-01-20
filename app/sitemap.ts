import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const locales = ['en', 'fr', 'ja'] as const
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
  { path: '/works', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/exhibitions', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/press', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/archive', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
]

function getLocalizedUrl(path: string, locale: string): string {
  // English has no prefix, other locales have prefix
  if (locale === 'en') {
    return `${baseUrl}${path}`
  }
  return `${baseUrl}/${locale}${path}`
}

function generateAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {
    'x-default': getLocalizedUrl(path, 'en'),
  }

  locales.forEach((locale) => {
    alternates[locale] = getLocalizedUrl(path, locale)
  })

  return alternates
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const sitemapEntries: MetadataRoute.Sitemap = []

  // Add static pages for all locales
  staticPages.forEach((page) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: getLocalizedUrl(page.path, locale),
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: generateAlternates(page.path),
        },
      })
    })
  })

  // Type definitions for sitemap data
  interface SitemapItem {
    id: string
    updated_at: string | null
  }

  // Fetch published artworks
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  if (artworks) {
    (artworks as SitemapItem[]).forEach((artwork) => {
      const path = `/works/${artwork.id}`
      locales.forEach((locale) => {
        sitemapEntries.push({
          url: getLocalizedUrl(path, locale),
          lastModified: artwork.updated_at ? new Date(artwork.updated_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.8,
          alternates: {
            languages: generateAlternates(path),
          },
        })
      })
    })
  }

  // Fetch published exhibitions
  const { data: exhibitions } = await supabase
    .from('exhibitions')
    .select('id, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  if (exhibitions) {
    (exhibitions as SitemapItem[]).forEach((exhibition) => {
      const path = `/exhibitions/${exhibition.id}`
      locales.forEach((locale) => {
        sitemapEntries.push({
          url: getLocalizedUrl(path, locale),
          lastModified: exhibition.updated_at ? new Date(exhibition.updated_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
          alternates: {
            languages: generateAlternates(path),
          },
        })
      })
    })
  }

  return sitemapEntries
}
