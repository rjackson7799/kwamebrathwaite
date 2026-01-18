import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'press' })

  return {
    title: t('title'),
  }
}

export default function PressPage() {
  const t = useTranslations('press')

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-8">{t('title')}</h1>

      {/* Press kit download button */}
      <div className="mb-12">
        <button className="btn-primary">{t('downloadPressKit')}</button>
      </div>

      {/* Press articles grid placeholder */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-0 overflow-hidden">
            <div className="aspect-video bg-gray-light animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-light animate-pulse rounded w-1/3" />
              <div className="h-5 bg-gray-light animate-pulse rounded w-full" />
              <div className="h-4 bg-gray-light animate-pulse rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
