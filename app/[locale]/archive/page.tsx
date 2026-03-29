import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { getPageSettings } from '@/lib/page-settings'
import { PageTitle } from '@/components/ui/PageTitle'
import { getPageContent } from '@/lib/supabase/queries/content'

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

export default async function ArchivePage() {
  const t = await getTranslations('archive')
  const [settings, mission, description, archiveImage] = await Promise.all([
    getPageSettings('archive'),
    getPageContent('archive', 'mission'),
    getPageContent('archive', 'description'),
    getPageContent('archive', 'page_image'),
  ])

  const showTitle = settings?.show_title ?? true
  const imageUrl = archiveImage?.content || '/images/about/kwame-portrait.jpeg'

  return (
    <div className="container-page section-spacing">
      <PageTitle title={t('title')} showTitle={showTitle} />

      {/* Two-column layout: content left, image right */}
      <section className="grid md:grid-cols-2 gap-8">
        <div className="prose prose-lg dark:prose-invert max-w-none text-gray-body dark:text-[#C0C0C0] leading-[1.8]">
          {mission?.content ? (
            <div dangerouslySetInnerHTML={{ __html: mission.content }} />
          ) : (
            <p className="text-gray-meta">Content coming soon.</p>
          )}

          {description?.content && (
            <div dangerouslySetInnerHTML={{ __html: description.content }} />
          )}
        </div>

        <div className="relative aspect-[3/4] rounded-sm overflow-hidden md:sticky md:top-24 self-start">
          <Image
            src={imageUrl}
            alt="Kwame Brathwaite Archive"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </section>
    </div>
  )
}
