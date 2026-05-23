import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { MagicLinkRequestForm } from '@/components/features/founders/MagicLinkRequestForm'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'founders.login' })
  return {
    title: `${t('heading')} — Kwame Brathwaite Archive`,
    description: t('intro'),
    // Keep this page out of search indexes. The /founders info page is the
    // public-facing program page; this is a sign-in form.
    robots: { index: false, follow: false },
  }
}

export default async function FoundersLoginPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'founders.login' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const learnMoreHref = locale === 'en' ? '/founders' : `/${locale}/founders`

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-20">
        <div className="w-full max-w-md">
          {/* Eyebrow */}
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-serif text-center">
            {tFounders('eyebrow')}
          </p>

          {/* Gold accent rule (horizontal, centered) */}
          <div className="w-16 h-[2px] bg-[#C9A961] mx-auto mb-8" />

          <h1 className="font-serif text-3xl sm:text-4xl text-[#F5EFE0] mb-6 text-center leading-tight">
            {t('heading')}
          </h1>

          <p className="text-[#C0BBA8] text-sm sm:text-base leading-relaxed mb-10 text-center">
            {t('intro')}
          </p>

          <MagicLinkRequestForm />

          {/* "Not a member yet?" — points to public info page, never a signup */}
          <div className="mt-16 pt-8 border-t border-[#2a2a2a] text-center">
            <p className="text-[#8a8a8a] text-sm mb-2">{t('notInvitedHeading')}</p>
            <Link
              href={learnMoreHref}
              className="text-[#C9A961] text-sm uppercase tracking-[0.14em] hover:text-[#d4b572] transition-colors"
            >
              {t('notInvitedLink')} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
