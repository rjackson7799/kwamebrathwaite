import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Timeline, type TimelineEvent } from '@/components/features/timeline'
import { getPageSettings } from '@/lib/page-settings'
import { PageTitle } from '@/components/ui/PageTitle'
import { getPageContent } from '@/lib/supabase/queries/content'
import { translatePageContent } from '@/lib/ai/translation-service'
import { sanitizeHtml } from '@/lib/utils/sanitize-html'

type Props = {
  params: Promise<{ locale: string }>
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

// Timeline event metadata (non-translatable fields)
const timelineEventMeta: { id: string; year: number; type: TimelineEvent['type'] }[] = [
  { id: '1', year: 1938, type: 'biography' },
  { id: '2', year: 1956, type: 'milestone' },
  { id: '3', year: 1962, type: 'milestone' },
  { id: '4', year: 1966, type: 'milestone' },
  { id: '5', year: 1968, type: 'exhibition' },
  { id: '6', year: 2019, type: 'exhibition' },
  { id: '7', year: 2023, type: 'biography' },
]

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })

  // Fetch content from CMS and page settings in parallel
  const [biography, movement, portraitImage, settings] = await Promise.all([
    getPageContent('about', 'biography'),
    getPageContent('about', 'movement'),
    getPageContent('about', 'portrait_image'),
    getPageSettings('about'),
  ])

  // Translate CMS content for non-English locales
  const [translatedBiography, translatedMovement] = await Promise.all([
    biography?.content
      ? translatePageContent(biography.content, locale, 'site_content', biography.id, 'biography')
      : null,
    movement?.content
      ? translatePageContent(movement.content, locale, 'site_content', movement.id, 'movement')
      : null,
  ])

  // Build timeline events from next-intl translations
  const timelineEvents: TimelineEvent[] = timelineEventMeta.map((meta) => ({
    ...meta,
    title: t(`timeline.events.${meta.id}.title`),
    description: t(`timeline.events.${meta.id}.description`),
  }))

  const showTitle = settings?.show_title ?? true
  const meta = (settings?.metadata && typeof settings.metadata === 'object' && !Array.isArray(settings.metadata))
    ? settings.metadata as Record<string, unknown>
    : {}
  const showTimeline = meta.show_timeline === true
  const showMovement = meta.show_movement === true
  const portraitSrc = portraitImage?.content || '/images/about/kwame-portrait.jpeg'

  return (
    <div className="container-page section-spacing">
      <PageTitle title={t('title')} showTitle={showTitle} />

      {/* Biography section — museum style: content flows with portrait */}
      <section className="mb-16">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="md:w-[62%] prose prose-lg dark:prose-invert max-w-none text-gray-body dark:text-[#C0C0C0] leading-[1.8]">
            {translatedBiography ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(translatedBiography) }} />
            ) : (
              <p className="text-gray-meta">Biography content coming soon.</p>
            )}
          </div>
          <div className="md:w-[38%] flex-shrink-0 sticky top-24 self-start">
            <div className="relative aspect-square rounded-sm overflow-hidden">
              <Image
                src={portraitSrc}
                alt="Kwame Brathwaite"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 38vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline section */}
      {showTimeline && (
        <section className="mb-16 pt-8 border-t border-gray-light dark:border-[#333333]">
          <h2 className="section-title-museum mb-8">{t('timeline.title')}</h2>
          <Timeline
            events={timelineEvents}
            groupByDecade
            showFilters
          />
        </section>
      )}

      {/* Movement section */}
      {showMovement && (
        <section className="bg-charcoal dark:bg-[#0A0A0A] text-white -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16 py-16">
          <h2 className="section-title-museum text-white/60 mb-6">{t('movement')}</h2>
          <div className="prose prose-lg prose-invert max-w-3xl leading-[1.8]">
            {translatedMovement ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(translatedMovement) }} />
            ) : (
              <p className="text-white/50">Movement history content coming soon.</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
