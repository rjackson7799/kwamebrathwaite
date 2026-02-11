import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'licensing' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/licensing'
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

export default function LicensingPage() {
  const t = useTranslations('licensing')

  const steps = [
    { title: t('steps.select'), description: t('steps.selectDesc'), number: '1' },
    { title: t('steps.choose'), description: t('steps.chooseDesc'), number: '2' },
    { title: t('steps.details'), description: t('steps.detailsDesc'), number: '3' },
    { title: t('steps.review'), description: t('steps.reviewDesc'), number: '4' },
  ]

  return (
    <div className="container-page section-spacing">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-display-2 mb-4">{t('title')}</h1>
        <p className="text-body-lg text-gray-warm">{t('subtitle')}</p>
      </div>

      {/* How It Works */}
      <div className="max-w-4xl mx-auto mb-20">
        <h2 className="text-display-4 mb-10 text-center">{t('howItWorks')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-12 h-12 rounded-full bg-black text-white dark:bg-[#F0F0F0] dark:text-[#121212] flex items-center justify-center text-lg font-serif mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="text-body-lg font-medium mb-2">{step.title}</h3>
              <p className="text-body text-gray-warm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* License Types */}
      <div className="max-w-4xl mx-auto mb-20">
        <h2 className="text-display-4 mb-10 text-center">License Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LicenseTypeCard
            title={t('types.editorial')}
            description={t('types.editorialDesc')}
          />
          <LicenseTypeCard
            title={t('types.commercial')}
            description={t('types.commercialDesc')}
          />
          <LicenseTypeCard
            title={t('types.film')}
            description={t('types.filmDesc')}
          />
          <LicenseTypeCard
            title={t('types.educational')}
            description={t('types.educationalDesc')}
          />
          <LicenseTypeCard
            title={t('types.exhibition')}
            description={t('types.exhibitionDesc')}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/licensing/request"
          className="btn-primary inline-block px-8 py-3"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  )
}

function LicenseTypeCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-gray-light dark:border-[#333333] p-6 hover:border-black dark:hover:border-[#F0F0F0] transition-colors duration-200">
      <h3 className="text-body-lg font-medium mb-2">{title}</h3>
      <p className="text-body text-gray-warm">{description}</p>
    </div>
  )
}
