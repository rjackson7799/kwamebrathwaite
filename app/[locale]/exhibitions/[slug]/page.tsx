import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ExhibitionDetail, VenueCard, ExhibitionPressLinks, type DetailedExhibition } from '@/components/features/exhibitions'
import { ArtworkGrid, type Artwork } from '@/components/features/artworks'
import { createPublicClient } from '@/lib/supabase/server'
import type { Exhibition as DbExhibition, Artwork as DbArtwork } from '@/lib/supabase/types'
import type { ExhibitionPressArticle } from '@/components/features/exhibitions/types'

// Revalidate every hour (ISR) per TECHNICAL_SPEC_v2.md
export const revalidate = 3600

// Type for the joined query response
interface ExhibitionArtworkJoin {
  display_order: number
  artworks: DbArtwork | null
}

interface ExhibitionPressJoin {
  display_order: number
  press: { id: string; title: string; slug: string; publication: string | null; publish_date: string | null } | null
}

interface ExhibitionWithJoins extends DbExhibition {
  exhibition_artworks: ExhibitionArtworkJoin[] | null
  exhibition_press: ExhibitionPressJoin[] | null
  // From 2026-08-14-content-import.sql. Regenerate lib/supabase/types.ts after
  // running that migration and this local widening can be dropped.
  entry_kind?: 'exhibition' | 'screening' | 'talk' | 'event' | null
}

// Fetch exhibition from database by slug
async function getExhibitionBySlug(slug: string): Promise<{ exhibition: DetailedExhibition; artworks: Artwork[]; press: ExhibitionPressArticle[] } | null> {
  try {
    const supabase = createPublicClient()

    const { data, error } = await supabase
      .from('exhibitions')
      .select(`
        *,
        exhibition_artworks (
          display_order,
          artworks (*)
        ),
        exhibition_press (
          display_order,
          press (id, title, slug, publication, publish_date)
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('[Exhibition Detail] Database error:', error.code, error.message, error.details)
      return null
    }

    if (!data) {
      console.error('[Exhibition Detail] No data returned for slug:', slug)
      return null
    }

    // Cast to our known type
    const exhibitionData = data as unknown as ExhibitionWithJoins

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

    const press: ExhibitionPressArticle[] = (exhibitionData.exhibition_press || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((ep) => ep.press)
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Map database fields to DetailedExhibition type
    const exhibition: DetailedExhibition = {
      id: exhibitionData.id,
      slug: exhibitionData.slug,
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
      entry_kind: exhibitionData.entry_kind ?? 'exhibition',
      venue_url: exhibitionData.venue_url,
      venue_description: exhibitionData.venue_description,
      exhibition_url: exhibitionData.exhibition_url,
      location_lat: exhibitionData.location_lat,
      location_lng: exhibitionData.location_lng,
      meta_title: exhibitionData.meta_title,
      meta_description: exhibitionData.meta_description,
    }

    return { exhibition, artworks, press }
  } catch (err) {
    console.error('[Exhibition Detail] Unexpected error:', err)
    return null
  }
}

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const result = await getExhibitionBySlug(slug)

  if (!result) {
    return {
      title: 'Exhibition Not Found',
    }
  }

  const { exhibition } = result
  const title = exhibition.meta_title || (exhibition.venue ? `${exhibition.title} at ${exhibition.venue} | Kwame Brathwaite` : `${exhibition.title} | Kwame Brathwaite`)
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
      canonical: locale === 'en' ? `/exhibitions/${slug}` : `/${locale}/exhibitions/${slug}`,
      languages: {
        en: `/exhibitions/${slug}`,
        fr: `/fr/exhibitions/${slug}`,
        ja: `/ja/exhibitions/${slug}`,
      },
    },
  }
}


export default async function ExhibitionDetailPage({ params }: Props) {
  const { slug, locale } = await params
  const result = await getExhibitionBySlug(slug)

  if (!result) {
    notFound()
  }

  const { exhibition, artworks, press } = result
  const t = await getTranslations('exhibitions')

  const exhibitionsHref = locale === 'en' ? '/exhibitions' : `/${locale}/exhibitions`

  // Schema.org structured data. The type follows entry_kind, not
  // exhibition_type: a one-night screening described as an ExhibitionEvent is
  // wrong for search engines, and entry_kind is exactly that distinction.
  // schema.org has no ScreeningEvent subtype for talks, so those fall back to
  // the generic Event.
  const schemaTypes: Record<string, string> = {
    exhibition: 'ExhibitionEvent',
    screening: 'ScreeningEvent',
    talk: 'Event',
    event: 'Event',
  }
  const entryKind = exhibition.entry_kind ?? 'exhibition'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': schemaTypes[entryKind] ?? 'ExhibitionEvent',
    name: exhibition.title,
    description: exhibition.description,
    image: exhibition.image_url,
    startDate: exhibition.start_date,
    // Single-day entries (most screenings and talks) carry no end_date. Emitting
    // endDate: null makes the event look open-ended; repeating the start date is
    // the correct representation of a one-day event.
    endDate: exhibition.end_date ?? exhibition.start_date,
    // A past event that actually happened is NOT EventCancelled — that value
    // tells search engines the event was called off, and would be published for
    // every past entry in the archive. EventScheduled is correct for anything
    // that ran or is going to run as planned.
    eventStatus: 'https://schema.org/EventScheduled',
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

      <article className="container-page section-spacing">
        {/* Back Navigation */}
        <Link
          href={exhibitionsHref}
          className="inline-flex items-center gap-2 text-body text-gray-warm dark:text-[#A0A0A0] hover:text-black dark:hover:text-[#F0F0F0] transition-colors duration-fast mb-6"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('detail.backToExhibitions')}
        </Link>

        <div className="section-divider mb-8" />

        {/* 2-Column Layout */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Left Column - 62% */}
          <div className="md:w-[62%]">
            <ExhibitionDetail exhibition={exhibition} />

            {/* Featured Works */}
            {artworks.length > 0 && (
              <section className="mt-12">
                <div className="section-divider mb-8" />
                <h2 className="section-title-museum mb-8">{t('detail.featuredWorks')}</h2>
                <ArtworkGrid
                  artworks={artworks}
                  showMetadata
                  className="lg:grid-cols-3"
                />
              </section>
            )}

            {/* Press Coverage */}
            {press.length > 0 && (
              <section className="mt-12">
                <div className="section-divider mb-8" />
                <ExhibitionPressLinks pressArticles={press} locale={locale} />
              </section>
            )}
          </div>

          {/* Right Column - 38% Sticky */}
          <aside className="md:w-[38%] flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <VenueCard
                venue={exhibition.venue}
                venueDescription={exhibition.venue_description}
                venueUrl={exhibition.venue_url}
                exhibitionUrl={exhibition.exhibition_url}
                streetAddress={exhibition.street_address}
                city={exhibition.city}
                stateRegion={exhibition.state_region}
                postalCode={exhibition.postal_code}
                country={exhibition.country}
                locationLat={exhibition.location_lat}
                locationLng={exhibition.location_lng}
                exhibitionId={exhibition.id}
                exhibitionTitle={exhibition.title}
                exhibitionSlug={exhibition.slug}
                startDate={exhibition.start_date}
                endDate={exhibition.end_date}
                exhibitionType={exhibition.exhibition_type}
                imageUrl={exhibition.image_url}
              />

              {/* Newsletter CTA */}
              <div className="p-5 border border-gray-light dark:border-[#333] text-center">
                <p className="section-title-museum mb-2">Stay Updated</p>
                <p className="text-[13px] text-[#666] dark:text-[#888] mb-4">
                  Get notified about upcoming exhibitions and events.
                </p>
                <a
                  href="#newsletter"
                  className="block py-2.5 bg-gold dark:bg-[#C9A870] text-white dark:text-[#121212] text-[11px] tracking-[0.12em] uppercase text-center hover:opacity-90 transition-opacity"
                >
                  Subscribe to Newsletter
                </a>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </>
  )
}
