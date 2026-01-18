import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })

  return {
    title: t('title'),
  }
}

export default function AboutPage() {
  const t = useTranslations('about')

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-12">{t('title')}</h1>

      {/* Biography section */}
      <section className="mb-16">
        <h2 className="text-h2 mb-6">{t('biography')}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-[3/4] bg-gray-light animate-pulse rounded-sm" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-light animate-pulse rounded" />
            <div className="h-4 bg-gray-light animate-pulse rounded" />
            <div className="h-4 bg-gray-light animate-pulse rounded w-3/4" />
            <div className="h-4 bg-gray-light animate-pulse rounded" />
            <div className="h-4 bg-gray-light animate-pulse rounded w-5/6" />
          </div>
        </div>
      </section>

      {/* Movement section */}
      <section className="bg-charcoal text-white -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16 py-16">
        <h2 className="text-h2 mb-6">{t('movement')}</h2>
        <div className="max-w-3xl space-y-4">
          <div className="h-4 bg-white/20 animate-pulse rounded" />
          <div className="h-4 bg-white/20 animate-pulse rounded" />
          <div className="h-4 bg-white/20 animate-pulse rounded w-4/5" />
        </div>
      </section>
    </div>
  )
}
