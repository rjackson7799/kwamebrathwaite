import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ArtworkDetail } from '@/components/features/artworks/ArtworkDetail'
import { ArtworkGrid } from '@/components/features/artworks'
import type { Artwork, ArtworkLiterature } from '@/lib/supabase/types'

// Revalidate every hour (ISR)
export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string; id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params
  const supabase = await createClient()

  const { data: artwork } = await supabase
    .from('artworks')
    .select('title, description, image_url, meta_title, meta_description')
    .eq('id', id)
    .eq('status', 'published')
    .single<{
      title: string
      description: string | null
      image_url: string
      meta_title: string | null
      meta_description: string | null
    }>()

  if (!artwork) {
    return {
      title: 'Artwork Not Found',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = `/works/${id}`
  const canonicalUrl = locale === 'en' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`
  const title = artwork.meta_title || `${artwork.title} | Kwame Brathwaite Archive`
  const description = artwork.meta_description || artwork.description || `View "${artwork.title}" from the Kwame Brathwaite photography archive.`

  return {
    title,
    description,
    openGraph: {
      title: artwork.title,
      description,
      images: artwork.image_url ? [{ url: artwork.image_url, alt: artwork.title }] : undefined,
      type: 'article',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: artwork.title,
      description,
      images: artwork.image_url ? [artwork.image_url] : undefined,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}${path}`,
        fr: `${baseUrl}/fr${path}`,
        ja: `${baseUrl}/ja${path}`,
        'x-default': `${baseUrl}${path}`,
      },
    },
  }
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const t = await getTranslations('works')

  // Fetch the artwork with all details
  const { data: artwork, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single<Artwork>()

  if (error || !artwork) {
    notFound()
  }

  // Fetch literature citations if any
  const { data: literature } = await supabase
    .from('artwork_literature')
    .select('*')
    .eq('artwork_id', id)
    .order('display_order', { ascending: true })

  // Fetch related artworks if any
  let relatedArtworks: Array<{
    id: string
    title: string
    year: number | null
    image_url: string
    image_thumbnail_url: string | null
  }> = []

  if (artwork.related_artwork_ids && artwork.related_artwork_ids.length > 0) {
    const { data } = await supabase
      .from('artworks')
      .select('id, title, year, image_url, image_thumbnail_url')
      .in('id', artwork.related_artwork_ids)
      .eq('status', 'published')
      .limit(4)

    if (data) {
      relatedArtworks = data
    }
  }

  // Schema.org structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.title,
    creator: {
      '@type': 'Person',
      name: 'Kwame Brathwaite',
    },
    dateCreated: artwork.year?.toString(),
    artMedium: artwork.medium,
    artform: 'Photograph',
    image: artwork.image_url,
    description: artwork.description,
    ...(artwork.dimensions && { size: artwork.dimensions }),
    ...(artwork.availability_status === 'available' && {
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
      },
    }),
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Artwork Detail */}
      <ArtworkDetail
        artwork={artwork}
        literature={(literature as ArtworkLiterature[]) || []}
        relatedArtworks={relatedArtworks}
      />

      {/* Related Works Section */}
      {relatedArtworks.length > 0 && (
        <section className="container-page section-spacing border-t border-gray-light pt-12">
          <h2 className="text-h2 mb-8">{t('detail.relatedWorks')}</h2>
          <ArtworkGrid
            artworks={relatedArtworks.map(a => ({
              id: a.id,
              title: a.title,
              year: a.year ?? undefined,
              image_url: a.image_thumbnail_url || a.image_url,
            }))}
            showMetadata
            className="lg:grid-cols-3"
          />
        </section>
      )}
    </>
  )
}
