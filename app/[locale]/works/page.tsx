import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'works' })

  return {
    title: t('title'),
  }
}

export default function WorksPage() {
  const t = useTranslations('works')

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-8">{t('title')}</h1>

      {/* Filter bar placeholder */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button className="btn-secondary">{t('filter.all')}</button>
        <button className="btn-text">{t('filter.photography')}</button>
        <button className="btn-text">{t('filter.print')}</button>
        <button className="btn-text">{t('filter.historical')}</button>
      </div>

      {/* Gallery grid placeholder */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-gray-light animate-pulse rounded-sm" />
        ))}
      </div>
    </div>
  )
}
