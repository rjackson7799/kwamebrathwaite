import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ExhibitionDetail, type DetailedExhibition } from '@/components/features/exhibitions'
import { ArtworkGrid, type Artwork } from '@/components/features/artworks'
import { createClient } from '@/lib/supabase/server'
import type { Exhibition as DbExhibition, Artwork as DbArtwork } from '@/lib/supabase/types'

// Revalidate every hour (ISR) per TECHNICAL_SPEC_v2.md
export const revalidate = 3600

// Type for the joined query response
interface ExhibitionArtworkJoin {
  display_order: number
  artworks: DbArtwork | null
}

interface ExhibitionWithArtworks extends DbExhibition {
  exhibition_artworks: ExhibitionArtworkJoin[] | null
}

// Fetch exhibition from database
async function getExhibitionById(id: string): Promise<{ exhibition: DetailedExhibition; artworks: Artwork[] } | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('exhibitions')
      .select(`
        *,
        exhibition_artworks (
          display_order,
          artworks (*)
        )
      `)
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      return null
    }

    // Cast to our known type
    const exhibitionData = data as unknown as ExhibitionWithArtworks

    // Extract artworks from the join table
    const artworks: Artwork[] = (exhibitionData.exhibition_artworks || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((ea) => ea.artworks)
      .filter((artwork): artwork is DbArtwork => artwork !== null)
      .map((artwork) => ({
        id: artwork.id,
        title: artwork.title,
        year: artwork.year,
        medium: artwork.medium,
        image_url: artwork.image_url,
        image_thumbnail_url: artwork.image_thumbnail_url,
        availability_status: artwork.availability_status,
      }))

    // Map database fields to DetailedExhibition type
    const exhibition: DetailedExhibition = {
      id: exhibitionData.id,
      title: exhibitionData.title,
      venue: exhibitionData.venue,
      street_address: exhibitionData.street_address,
      city: exhibitionData.city,
      state_region: exhibitionData.state_region,
      postal_code: exhibitionData.postal_code,
      country: exhibitionData.country,
      start_date: exhibitionData.start_date,
      end_date: exhibitionData.end_date,
      description: exhibitionData.description,
      image_url: exhibitionData.image_url,
      exhibition_type: exhibitionData.exhibition_type || 'current',
      venue_url: exhibitionData.venue_url,
      meta_title: exhibitionData.meta_title,
      meta_description: exhibitionData.meta_description,
    }

    return { exhibition, artworks }
  } catch {
    return null
  }
}

type Props = {
  params: Promise<{ locale: string; id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params
  const result = await getExhibitionById(id)

  if (!result) {
    return {
      title: 'Exhibition Not Found',
    }
  }

  const { exhibition } = result
  const title = exhibition.meta_title || `${exhibition.title} - Kwame Brathwaite`
  const description = exhibition.meta_description || exhibition.description || `${exhibition.title} exhibition`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: exhibition.image_url
        ? [
            {
              url: exhibition.image_url,
              width: 1200,
              height: 900,
              alt: exhibition.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: exhibition.image_url ? [exhibition.image_url] : [],
    },
    alternates: {
      canonical: locale === 'en' ? `/exhibitions/${id}` : `/${locale}/exhibitions/${id}`,
      languages: {
        en: `/exhibitions/${id}`,
        fr: `/fr/exhibitions/${id}`,
        ja: `/ja/exhibitions/${id}`,
      },
    },
  }
}

// Generate static params for SSG
// With dynamic data, we use dynamic rendering (no pre-generated paths)
// The revalidate setting above handles ISR caching
export async function generateStaticParams() {
  // Return empty array to enable dynamic rendering with ISR
  // Each page will be generated on first request and cached
  return []
}

export default async function ExhibitionDetailPage({ params }: Props) {
  const { id } = await params
  const result = await getExhibitionById(id)

  if (!result) {
    notFound()
  }

  const { exhibition, artworks } = result
  const t = await getTranslations('exhibitions')

  // Schema.org structured data for ExhibitionEvent
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: exhibition.title,
    description: exhibition.description,
    image: exhibition.image_url,
    startDate: exhibition.start_date,
    endDate: exhibition.end_date,
    eventStatus: exhibition.exhibition_type === 'past'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: exhibition.venue,
      address: {
        '@type': 'PostalAddress',
        streetAddress: exhibition.street_address,
        addressLocality: exhibition.city,
        addressRegion: exhibition.state_region,
        postalCode: exhibition.postal_code,
        addressCountry: exhibition.country,
      },
      ...(exhibition.venue_url && { url: exhibition.venue_url }),
    },
    organizer: {
      '@type': 'Organization',
      name: 'Kwame Brathwaite Archive',
      url: 'https://kwamebrathwaite.com',
    },
    performer: {
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

      {/* Main Exhibition Detail */}
      <ExhibitionDetail exhibition={exhibition} />

      {/* Featured Works Section */}
      {artworks.length > 0 && (
        <section className="container-page section-spacing border-t border-gray-light pt-12">
          <h2 className="text-h2 mb-8">{t('detail.featuredWorks')}</h2>
          <ArtworkGrid
            artworks={artworks}
            showMetadata
            className="lg:grid-cols-3"
          />
        </section>
      )}
    </>
  )
}
