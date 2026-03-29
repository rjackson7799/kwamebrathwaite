import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { PressDetail, type DetailedPressItem } from '@/components/features/press'
import { createClient } from '@/lib/supabase/server'
import { translatePageContent } from '@/lib/ai/translation-service'

// Revalidate every hour (ISR) per TECHNICAL_SPEC_v2.md
export const revalidate = 3600

// Fetch press item from database by ID
async function getPressItem(id: string): Promise<DetailedPressItem | null> {
  try {
    const supabase = await createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('press')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('[Press Detail] Database error:', error.code, error.message)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      title: data.title,
      publication: data.publication,
      author: data.author,
      publish_date: data.publish_date,
      url: data.url,
      excerpt: data.excerpt,
      image_url: data.image_url,
      press_type: data.press_type,
    }
  } catch (err) {
    console.error('[Press Detail] Unexpected error:', err)
    return null
  }
}

type Props = {
  params: Promise<{ locale: string; id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params

  let pressItem: DetailedPressItem | null = null
  try {
    pressItem = await getPressItem(id)
  } catch {
    // Fall through to not-found metadata
  }

  if (!pressItem) {
    return { title: 'Press Item Not Found' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const title = `${pressItem.title} | Kwame Brathwaite Archive`
  const description = pressItem.excerpt
    ? pressItem.excerpt.replace(/<[^>]*>/g, '').substring(0, 160)
    : `${pressItem.title} - Press coverage of Kwame Brathwaite`
  const path = `/press/${id}`

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

// Generate static params — empty for dynamic rendering with ISR
export async function generateStaticParams() {
  return []
}

export default async function PressDetailPage({ params }: Props) {
  const { id, locale } = await params

  let pressItem: DetailedPressItem | null = null
  try {
    pressItem = await getPressItem(id)
  } catch (err) {
    console.error('[Press Detail] Failed to fetch press item:', err)
  }

  if (!pressItem) {
    notFound()
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
