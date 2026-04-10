import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { getShowTitle } from '@/lib/page-settings'
import { PageTitle } from '@/components/ui/PageTitle'
import { ContactForm } from '@/components/features/contact/ContactForm'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kwamebrathwaite.com'
  const path = '/contact'
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

export default async function ContactPage() {
  const t = await getTranslations('contact')
  const showTitle = await getShowTitle('contact')

  return (
    <div className="container-page section-spacing">
      <div className="max-w-2xl mx-auto">
        <PageTitle title={t('title')} showTitle={showTitle} />
        <p className="text-body-lg text-gray-warm mb-12">{t('intro')}</p>
        <ContactForm />
      </div>
    </div>
  )
}
