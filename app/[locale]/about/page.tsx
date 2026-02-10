import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Timeline, type TimelineEvent } from '@/components/features/timeline'

type Props = {
  params: Promise<{ locale: string }>
}

// Fetch content from CMS
async function getContent(page: string, section: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/content/${page}/${section}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.success ? data.data : null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/about'
  const canonicalUrl = locale === 'en' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url: canonicalUrl,
      type: 'website',
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

// Sample timeline data - replace with database fetch when available
const sampleTimelineEvents: TimelineEvent[] = [
  {
    id: '1',
    year: 1938,
    title: 'Born in Brooklyn, New York',
    description: 'Kwame Brathwaite was born in Brooklyn, New York, to parents who emigrated from Barbados.',
    type: 'biography',
  },
  {
    id: '2',
    year: 1956,
    title: 'Co-founds AJASS',
    description: 'Co-founded the African Jazz-Art Society and Studios (AJASS) with his brother Elombe Brath, a cultural organization that promoted African American arts.',
    type: 'milestone',
  },
  {
    id: '3',
    year: 1962,
    title: 'Grandassa Models Founded',
    description: 'Created the Grandassa Models, a modeling group celebrating natural African beauty and challenging Eurocentric beauty standards.',
    type: 'milestone',
  },
  {
    id: '4',
    year: 1966,
    title: '"Black is Beautiful" Movement Emerges',
    description: 'The phrase "Black is Beautiful" emerges from AJASS fashion shows photographed by Brathwaite, becoming a cultural rallying cry.',
    type: 'milestone',
  },
  {
    id: '5',
    year: 1968,
    title: 'Naturally \'68 Fashion Show',
    description: 'Major fashion show at the Apollo Theater celebrating natural Black beauty and African aesthetics.',
    type: 'exhibition',
  },
  {
    id: '6',
    year: 2019,
    title: 'Aperture Foundation Retrospective',
    description: 'Landmark retrospective "Black Is Beautiful: The Photography of Kwame Brathwaite" opens at Aperture Foundation in New York City.',
    type: 'exhibition',
  },
  {
    id: '7',
    year: 2023,
    title: 'Passing',
    description: 'Kwame Brathwaite passed away at age 85, leaving behind an unparalleled legacy in photography and cultural activism.',
    type: 'biography',
  },
]

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })

  // Fetch content from CMS in parallel
  const [biography, movement] = await Promise.all([
    getContent('about', 'biography'),
    getContent('about', 'movement'),
  ])

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-12">{t('title')}</h1>

      {/* Biography section */}
      <section className="mb-16">
        <h2 className="text-h2 mb-6">{t('biography')}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative aspect-[3/4] rounded-sm overflow-hidden sticky top-24 self-start">
            <Image
              src="/images/about/kwame-portrait.jpeg"
              alt="Kwame Brathwaite"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {biography?.content ? (
              <div dangerouslySetInnerHTML={{ __html: biography.content }} />
            ) : (
              <p className="text-gray-medium">Biography content coming soon.</p>
            )}
          </div>
        </div>
      </section>

      {/* Timeline section */}
      <section className="mb-16 pt-8 border-t border-gray-light dark:border-[#333333]">
        <h2 className="text-h2 mb-8">{t('timeline.title')}</h2>
        <Timeline
          events={sampleTimelineEvents}
          groupByDecade
          showFilters
        />
      </section>

      {/* Movement section */}
      <section className="bg-charcoal dark:bg-[#0A0A0A] text-white -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16 py-16">
        <h2 className="text-h2 mb-6">{t('movement')}</h2>
        <div className="prose prose-lg prose-invert max-w-3xl">
          {movement?.content ? (
            <div dangerouslySetInnerHTML={{ __html: movement.content }} />
          ) : (
            <p className="text-white/70">Movement history content coming soon.</p>
          )}
        </div>
      </section>
    </div>
  )
}
