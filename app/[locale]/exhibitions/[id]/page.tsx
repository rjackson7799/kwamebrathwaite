import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ExhibitionDetail, type DetailedExhibition } from '@/components/features/exhibitions'
import { ArtworkGrid, type Artwork } from '@/components/features/artworks'

// Revalidate every hour (ISR) per TECHNICAL_SPEC_v2.md
export const revalidate = 3600

// Sample artworks for featured works section (matches component Artwork type)
const sampleArtworks: Artwork[] = [
  {
    id: '1',
    title: 'Untitled (Grandassa Models)',
    year: 1966,
    medium: 'Gelatin silver print',
    image_url: 'https://picsum.photos/800/1000?grayscale&random=40',
    image_thumbnail_url: 'https://picsum.photos/400/500?grayscale&random=40',
    availability_status: 'available',
  },
  {
    id: '2',
    title: 'African Jazz-Art Society',
    year: 1962,
    medium: 'Gelatin silver print',
    image_url: 'https://picsum.photos/800/1000?grayscale&random=41',
    image_thumbnail_url: 'https://picsum.photos/400/500?grayscale&random=41',
    availability_status: 'inquiry_only',
  },
  {
    id: '3',
    title: "Naturally '68",
    year: 1968,
    medium: 'Gelatin silver print',
    image_url: 'https://picsum.photos/800/1000?grayscale&random=42',
    image_thumbnail_url: 'https://picsum.photos/400/500?grayscale&random=42',
    availability_status: 'sold',
  },
]

// Sample data for development - will be replaced with API/DB data
const sampleExhibitions: DetailedExhibition[] = [
  {
    id: '1',
    title: 'Black is Beautiful: The Photography of Kwame Brathwaite',
    venue: 'Skirball Cultural Center',
    street_address: '2701 N. Sepulveda Blvd.',
    city: 'Los Angeles',
    state_region: 'CA',
    postal_code: '90049',
    country: 'USA',
    start_date: '2025-10-15',
    end_date: '2026-03-15',
    description: 'This landmark exhibition celebrates the work of Kwame Brathwaite, the photographer who documented and helped shape the "Black is Beautiful" movement of the 1960s and 1970s. Featuring over 40 photographs, the exhibition explores Brathwaite\'s pivotal role in promoting natural Black beauty through his images of the Grandassa Models and the African Jazz-Art Society.',
    image_url: 'https://picsum.photos/1200/900?grayscale&random=50',
    exhibition_type: 'current',
    venue_url: 'https://www.skirball.org',
    meta_title: 'Black is Beautiful Exhibition - Kwame Brathwaite',
    meta_description: 'Experience the groundbreaking photography of Kwame Brathwaite at the Skirball Cultural Center.',
  },
  {
    id: '2',
    title: 'Kwame Brathwaite: Black is Beautiful',
    venue: 'Aperture Gallery',
    street_address: '547 West 27th Street',
    city: 'New York',
    state_region: 'NY',
    postal_code: '10001',
    country: 'USA',
    start_date: '2026-04-01',
    end_date: '2026-06-30',
    description: 'Aperture presents a comprehensive survey of Kwame Brathwaite\'s influential photography. This exhibition showcases never-before-seen works alongside iconic images that defined the Black is Beautiful movement. Visitors will experience the full scope of Brathwaite\'s artistic vision and cultural impact.',
    image_url: 'https://picsum.photos/1200/900?grayscale&random=51',
    exhibition_type: 'upcoming',
    venue_url: 'https://aperture.org',
    meta_title: 'Kwame Brathwaite at Aperture Gallery',
    meta_description: 'A comprehensive survey of Kwame Brathwaite\'s photography at Aperture Gallery, New York.',
  },
  {
    id: '3',
    title: 'Harlem on My Mind: Photographs by Kwame Brathwaite',
    venue: 'Studio Museum in Harlem',
    street_address: '429 West 127th Street',
    city: 'New York',
    state_region: 'NY',
    postal_code: '10027',
    country: 'USA',
    start_date: '2024-01-15',
    end_date: '2024-05-30',
    description: 'This exhibition presented a focused look at Brathwaite\'s documentation of Harlem\'s vibrant cultural scene from the 1950s through the 1970s. Through intimate portraits and dynamic event photography, visitors experienced the energy and creativity of a community that shaped American culture.',
    image_url: 'https://picsum.photos/1200/900?grayscale&random=52',
    exhibition_type: 'past',
    venue_url: 'https://www.studiomuseum.org',
    meta_title: 'Harlem on My Mind - Kwame Brathwaite',
    meta_description: 'A look at Brathwaite\'s documentation of Harlem\'s vibrant cultural scene at the Studio Museum.',
  },
]

// Helper to get exhibition by ID
function getExhibitionById(id: string): DetailedExhibition | undefined {
  return sampleExhibitions.find((ex) => ex.id === id)
}

type Props = {
  params: Promise<{ locale: string; id: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params
  const exhibition = getExhibitionById(id)

  if (!exhibition) {
    return {
      title: 'Exhibition Not Found',
    }
  }

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
export function generateStaticParams() {
  const locales = ['en', 'fr', 'ja']
  const paths: { locale: string; id: string }[] = []

  for (const locale of locales) {
    for (const exhibition of sampleExhibitions) {
      paths.push({ locale, id: exhibition.id })
    }
  }

  return paths
}

export default async function ExhibitionDetailPage({ params }: Props) {
  const { id, locale } = await params
  const exhibition = getExhibitionById(id)

  if (!exhibition) {
    notFound()
  }

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
      {sampleArtworks.length > 0 && (
        <section className="container-page section-spacing border-t border-gray-light pt-12">
          <h2 className="text-h2 mb-8">{t('detail.featuredWorks')}</h2>
          <ArtworkGrid
            artworks={sampleArtworks}
            showMetadata
            className="lg:grid-cols-3"
          />
        </section>
      )}
    </>
  )
}
