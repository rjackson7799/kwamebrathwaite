import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { MapsConsentControl } from '@/components/features/privacy/MapsConsentControl'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'footer.links' })

  return {
    title: t('privacy'),
  }
}

type Section = {
  heading: string
  paragraphs: string[]
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacyPolicy' })

  // next-intl doesn't expose a typed way to read array values from translations,
  // so we look them up by key one at a time via t.raw() for prose blocks.
  const readSection = (key: string): Section => ({
    heading: t(`sections.${key}.heading`),
    paragraphs: (t.raw(`sections.${key}.paragraphs`) as string[]) ?? [],
  })

  const sections: Array<{ key: string; section: Section }> = [
    'controller',
    'information',
    'use',
    'legalBasis',
    'retention',
    'processors',
    'cookies',
    'gdpr',
    'ccpa',
    'children',
    'transfers',
    'changes',
    'contact',
  ].map((key) => ({ key, section: readSection(key) }))

  return (
    <div className="container-page section-spacing">
      <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
        <h1>{t('title')}</h1>
        <p className="text-body-lg text-gray-warm">{t('lastUpdated')}</p>
        <p>{t('intro')}</p>

        {sections.map(({ key, section }) => (
          <section key={key}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
            {key === 'cookies' && <MapsConsentControl />}
          </section>
        ))}
      </div>
    </div>
  )
}
