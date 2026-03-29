import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { PressCard } from '@/components/features/press'
import type { PressItem } from '@/components/features/press'
import { getShowTitle } from '@/lib/page-settings'
import { PageTitle } from '@/components/ui/PageTitle'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'press' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/press'
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

export default async function PressPage() {
  const t = await getTranslations('press')
  const showTitle = await getShowTitle('press')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pressItems } = await (supabase as any)
    .from('press')
    .select('*')
    .eq('status', 'published')
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false }) as { data: PressItem[] | null }

  return (
    <div className="container-page section-spacing">
      <PageTitle title={t('title')} showTitle={showTitle} />

      {pressItems && pressItems.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pressItems.map((item, index) => (
            <PressCard
              key={item.id}
              pressItem={item}
              priority={index < 4}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-500 py-16">
          No press coverage available yet.
        </p>
      )}
    </div>
  )
}
