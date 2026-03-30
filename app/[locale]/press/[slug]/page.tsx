import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PressDetail, type DetailedPressItem } from '@/components/features/press'
import { createPublicClient } from '@/lib/supabase/server'
import { translatePageContent } from '@/lib/ai/translation-service'
import { isUUID } from '@/lib/utils/slug'

// Revalidate every hour (ISR) per TECHNICAL_SPEC_v2.md
export const revalidate = 3600

interface PressItemWithMeta extends DetailedPressItem {
  slug: string
  meta_title: string | null
  meta_description: string | null
}

// Fetch press item from database by slug or UUID
async function getPressItem(slugOrId: string): Promise<PressItemWithMeta | null> {
  try {
    const supabase = createPublicClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('press')
      .select('*')
      .eq('status', 'published')

    if (isUUID(slugOrId)) {
      query = query.eq('id', slugOrId)
    } else {
      query = query.eq('slug', slugOrId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[Press Detail] Database error:', error.code, error.message)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      publication: data.publication,
      author: data.author,
      publish_date: data.publish_date,
      url: data.url,
      excerpt: data.excerpt,
      image_url: data.image_url,
      press_type: data.press_type,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
    }
  } catch (err) {
    console.error('[Press Detail] Unexpected error:', err)
    return null
  }
}

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params

  let pressItem: PressItemWithMeta | null = null
  try {
    pressItem = await getPressItem(slug)
  } catch {
    // Fall through to not-found metadata
  }

  if (!pressItem) {
    return { title: 'Press Item Not Found' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const title = pressItem.meta_title || `${pressItem.title} | Kwame Brathwaite Archive`
  const description = pressItem.meta_description
    || (pressItem.excerpt
      ? pressItem.excerpt.replace(/<[^>]*>/g, '').substring(0, 160)
      : `${pressItem.title} - Press coverage of Kwame Brathwaite`)
  const path = `/press/${pressItem.slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(pressItem.publish_date && { publishedTime: pressItem.publish_date }),
      images: pressItem.image_url
        ? [
            {
              url: pressItem.image_url,
              width: 1200,
              height: 900,
              alt: pressItem.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: pressItem.image_url ? [pressItem.image_url] : [],
    },
    alternates: {
      canonical: locale === 'en' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`,
      languages: {
        en: `${baseUrl}${path}`,
        fr: `${baseUrl}/fr${path}`,
        ja: `${baseUrl}/ja${path}`,
        'x-default': `${baseUrl}${path}`,
      },
    },
  }
}

export default async function PressDetailPage({ params }: Props) {
  const { slug: slugParam, locale } = await params

  let pressItem: PressItemWithMeta | null = null
  try {
    pressItem = await getPressItem(slugParam)
  } catch (err) {
    console.error('[Press Detail] Failed to fetch press item:', err)
  }

  if (!pressItem) {
    notFound()
  }

  // Redirect UUID-based URLs to slug-based URLs
  if (isUUID(slugParam) && pressItem.slug) {
    const slugPath = locale === 'en' ? `/press/${pressItem.slug}` : `/${locale}/press/${pressItem.slug}`
    permanentRedirect(slugPath)
  }

  // Translate title and excerpt for non-English locales
  let translatedItem: DetailedPressItem = pressItem
  if (locale !== 'en') {
    let translatedTitle = pressItem.title
    let translatedExcerpt = pressItem.excerpt

    try {
      translatedTitle = await translatePageContent(pressItem.title, locale, 'press', pressItem.id, 'title')
    } catch (err) {
      console.error('[Press Detail] Translation failed for title:', err)
    }

    try {
      if (pressItem.excerpt) {
        translatedExcerpt = await translatePageContent(pressItem.excerpt, locale, 'press', pressItem.id, 'excerpt')
      }
    } catch (err) {
      console.error('[Press Detail] Translation failed for excerpt:', err)
    }

    translatedItem = {
      ...pressItem,
      title: translatedTitle,
      excerpt: translatedExcerpt,
    }
  }

  // Schema.org structured data for NewsArticle
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: pressItem.title,
    ...(pressItem.image_url && { image: pressItem.image_url }),
    ...(pressItem.publish_date && { datePublished: pressItem.publish_date }),
    ...(pressItem.author && {
      author: {
        '@type': 'Person',
        name: pressItem.author,
      },
    }),
    ...(pressItem.publication && {
      publisher: {
        '@type': 'Organization',
        name: pressItem.publication,
      },
    }),
    ...(pressItem.excerpt && {
      articleBody: pressItem.excerpt.replace(/<[^>]*>/g, ''),
    }),
    about: {
      '@type': 'Person',
      name: 'Kwame Brathwaite',
    },
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Press Detail */}
      <PressDetail pressItem={translatedItem} />
    </>
  )
}
