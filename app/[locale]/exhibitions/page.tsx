import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'exhibitions' })

  return {
    title: t('title'),
  }
}

export default function ExhibitionsPage() {
  const t = useTranslations('exhibitions')

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-8">{t('title')}</h1>

      {/* Filter tabs placeholder */}
      <div className="flex gap-4 mb-8 border-b border-gray-light">
        <button className="pb-2 border-b-2 border-black font-medium">{t('current')}</button>
        <button className="pb-2 text-gray-warm">{t('upcoming')}</button>
        <button className="pb-2 text-gray-warm">{t('past')}</button>
      </div>

      {/* Exhibitions list placeholder */}
      <div className="space-y-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-6">
            <div className="w-1/3 aspect-video bg-gray-light animate-pulse rounded-sm" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-light animate-pulse rounded w-3/4" />
              <div className="h-4 bg-gray-light animate-pulse rounded w-1/2" />
              <div className="h-4 bg-gray-light animate-pulse rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
