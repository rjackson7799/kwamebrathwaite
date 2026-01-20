import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ArtworkGrid } from '@/components/features/artworks'
import { ExhibitionCard } from '@/components/features/exhibitions'
import { HeroRotator } from '@/components/HeroRotator'
import { getHeroSlides } from '@/lib/hero'
import { getFeaturedArtworks } from '@/lib/artworks'
import { getCurrentExhibitions, getUpcomingExhibitions } from '@/lib/exhibitions'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hero' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const canonicalUrl = locale === 'en' ? baseUrl : `${baseUrl}/${locale}`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('meta.title'),
      description: t('meta.description'),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: baseUrl,
        fr: `${baseUrl}/fr`,
        ja: `${baseUrl}/ja`,
        'x-default': baseUrl,
      },
    },
  }
}

export default async function HomePage() {
  const tNav = await getTranslations('navigation')

  // Fetch all data from database in parallel
  const [heroSlides, featuredArtworks, currentExhibitions, upcomingExhibitions] = await Promise.all([
    getHeroSlides(),
    getFeaturedArtworks(8),
    getCurrentExhibitions(2),
    getUpcomingExhibitions(2),
  ])

  // Combine current and upcoming exhibitions for display
  const exhibitions = [...currentExhibitions, ...upcomingExhibitions].slice(0, 4)

  return (
    <>
      {/* Hero Section with Dynamic Rotator */}
      <HeroRotator slides={heroSlides} />

      <div className="container-page">
        {/* Featured Works */}
        {featuredArtworks.length > 0 && (
          <section className="section-spacing">
            <h2 className="text-h2 mb-8">{tNav('works')}</h2>
            <ArtworkGrid
              artworks={featuredArtworks}
              showMetadata
            />
          </section>
        )}

        {/* Current & Upcoming Exhibitions */}
        {exhibitions.length > 0 && (
          <section className="section-spacing bg-charcoal text-white -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16">
            <h2 className="text-h2 mb-8">{tNav('exhibitions')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {exhibitions.map((exhibition) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                  orientation="vertical"
                  priority
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
