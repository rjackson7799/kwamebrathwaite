import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hero' })

  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default function HomePage() {
  const t = useTranslations('hero')
  const tNav = useTranslations('navigation')

  return (
    <div className="container-page">
      {/* Hero Section */}
      <section className="section-spacing text-center">
        <h1 className="text-display-1 mb-4">{t('title')}</h1>
        <p className="text-body-lg text-gray-warm">{t('subtitle')}</p>
      </section>

      {/* Placeholder for featured content */}
      <section className="section-spacing">
        <h2 className="text-h2 mb-8">{tNav('works')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Artwork cards will be loaded here */}
          <div className="aspect-[3/4] bg-gray-light animate-pulse rounded-sm" />
          <div className="aspect-[3/4] bg-gray-light animate-pulse rounded-sm" />
          <div className="aspect-[3/4] bg-gray-light animate-pulse rounded-sm" />
          <div className="aspect-[3/4] bg-gray-light animate-pulse rounded-sm" />
        </div>
      </section>

      {/* Placeholder for exhibitions */}
      <section className="section-spacing bg-charcoal text-white -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16">
        <h2 className="text-h2 mb-8">{tNav('exhibitions')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Exhibition cards will be loaded here */}
          <div className="aspect-video bg-black/20 animate-pulse rounded-sm" />
          <div className="aspect-video bg-black/20 animate-pulse rounded-sm" />
        </div>
      </section>
    </div>
  )
}
