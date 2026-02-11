import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { LicenseRequestForm } from '@/components/features/licensing/LicenseRequestForm'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ artwork?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'licensing.request' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/licensing/request'
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

export default async function LicenseRequestPage({ searchParams }: Props) {
  const { artwork: preselectedArtworkId } = await searchParams

  return (
    <div className="container-page section-spacing">
      <div className="max-w-3xl mx-auto">
        <LicenseRequestForm preselectedArtworkId={preselectedArtworkId} />
      </div>
    </div>
  )
}
