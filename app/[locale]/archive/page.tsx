import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
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
  const t = await getTranslations({ locale, namespace: 'archive' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/archive'
  const canonicalUrl = locale === 'en' ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`

  return {
    title: t('meta.title'),
    description: t('meta.description'),
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

export default async function ArchivePage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('archive')
  const [settings, mission, description, archiveImage] = await Promise.all([
    getPageSettings('archive'),
    getPageContent('archive', 'mission'),
    getPageContent('archive', 'description'),
    getPageContent('archive', 'page_image'),
  ])

  const showTitle = settings?.show_title ?? true
  const imageUrl = archiveImage?.content || '/images/about/kwame-portrait.jpeg'

  // Translate CMS content for non-English locales
  const [translatedMission, translatedDescription] = await Promise.all([
    mission?.content
      ? translatePageContent(mission.content, locale, 'site_content', mission.id, 'mission')
      : null,
    description?.content
      ? translatePageContent(description.content, locale, 'site_content', description.id, 'description')
      : null,
  ])

  return (
    <div className="container-page section-spacing">
      <PageTitle title={t('title')} showTitle={showTitle} />

      {/* Two-column layout: content left, image right (matching About page) */}
      <section className="mb-16">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="md:w-[62%] prose prose-lg dark:prose-invert max-w-none text-gray-body dark:text-[#C0C0C0] leading-[1.8]">
            {translatedMission ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(translatedMission) }} />
            ) : (
              <p className="text-gray-meta">Content coming soon.</p>
            )}

            {translatedDescription && (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(translatedDescription) }} />
            )}

            {/* Founder's Circle invite temporarily removed while /founders is unpublished.
                Restore the <p>{t.rich('foundersInvite', …)}</p> link (and the Link import +
                foundersHref const) when the page goes live again. */}
          </div>

          <div className="md:w-[38%] flex-shrink-0 sticky top-24 self-start">
            <div className="relative aspect-square rounded-sm overflow-hidden">
              <Image
                src={imageUrl}
                alt="Kwame Brathwaite Archive"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 38vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
