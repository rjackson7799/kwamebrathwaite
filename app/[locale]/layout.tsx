import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n/request'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { GoogleMapsProvider } from '@/components/providers/GoogleMapsProvider'
import { getContentFontScale } from '@/lib/page-settings'
import type { Metadata } from 'next'

const FONT_SCALE_VALUES = { small: '0.875', default: '1', large: '1.125' } as const

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'hero' })

  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  // Get messages for the current locale and content font scale
  const [messages, fontScale] = await Promise.all([
    getMessages(),
    getContentFontScale(),
  ])
  const t = await getTranslations({ locale, namespace: 'common' })
  const scaleValue = FONT_SCALE_VALUES[fontScale]

  return (
    <NextIntlClientProvider messages={messages}>
      <GoogleMapsProvider>
      <div className="min-h-screen flex flex-col">
        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="skip-link"
        >
          {t('skipToContent')}
        </a>
        <Header />
        <main id="main-content" className="flex-1" style={{ '--content-font-scale': scaleValue } as React.CSSProperties}>
          {children}
        </main>
        <Footer />
      </div>
      </GoogleMapsProvider>
    </NextIntlClientProvider>
  )
}
