import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

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

export default function ArchivePage() {
  const t = useTranslations('archive')

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-12">{t('title')}</h1>

      {/* Mission section */}
      <section className="max-w-3xl mb-16">
        <h2 className="text-h2 mb-6">{t('mission')}</h2>
        <div className="space-y-4">
          <div className="h-4 bg-gray-light dark:bg-[#2A2A2A] animate-pulse rounded" />
          <div className="h-4 bg-gray-light dark:bg-[#2A2A2A] animate-pulse rounded" />
          <div className="h-4 bg-gray-light dark:bg-[#2A2A2A] animate-pulse rounded w-3/4" />
        </div>
      </section>

      {/* Archive highlights */}
      <section>
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="text-display-1 font-serif mb-2">
                {['10K+', '60+', '50+'][i]}
              </div>
              <div className="text-body text-gray-warm">
                {['Images', 'Years', 'Exhibitions'][i]}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
