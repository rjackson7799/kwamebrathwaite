import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { getShowTitle } from '@/lib/page-settings'
import { PageTitle } from '@/components/ui/PageTitle'

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
  const tForm = await getTranslations('contact.form')
  const tTypes = await getTranslations('contact.inquiryTypes')
  const showTitle = await getShowTitle('contact')

  return (
    <div className="container-page section-spacing">
      <div className="max-w-2xl mx-auto">
        <PageTitle title={t('title')} showTitle={showTitle} />
        <p className="text-body-lg text-gray-warm mb-12">{t('intro')}</p>

        {/* Contact form placeholder */}
        <form className="space-y-6">
          <div>
            <label className="label" htmlFor="name">{tForm('name')}</label>
            <input
              type="text"
              id="name"
              name="name"
              className="input"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="email">{tForm('email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              className="input"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="phone">{tForm('phone')}</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="inquiryType">{tForm('inquiryType')}</label>
            <select id="inquiryType" name="inquiryType" className="input">
              <option value="general">{tTypes('general')}</option>
              <option value="purchase">{tTypes('purchase')}</option>
              <option value="exhibition">{tTypes('exhibition')}</option>
              <option value="press">{tTypes('press')}</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="subject">{tForm('subject')}</label>
            <input
              type="text"
              id="subject"
              name="subject"
              className="input"
            />
          </div>

          <div>
            <label className="label" htmlFor="message">{tForm('message')}</label>
            <textarea
              id="message"
              name="message"
              rows={6}
              className="input resize-none"
              required
            />
          </div>

          {/* Honeypot field for spam protection */}
          <input
            type="text"
            name="website"
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
          />

          <button type="submit" className="btn-primary w-full">
            {tForm('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
