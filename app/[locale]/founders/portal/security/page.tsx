import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { TwoFactorPanel } from '@/components/features/founders/TwoFactorPanel'
import { SessionsPanel } from '@/components/features/founders/SessionsPanel'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Security — Founder's Circle",
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersSecurityPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const t = await getTranslations({ locale, namespace: 'founders.security' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex flex-col">
      <header className="border-b border-[#2a2a2a] px-6 sm:px-10 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#C9A961] font-heading">
            {tFounders('eyebrow')}
          </p>
          <Link
            href={portalHref}
            className="text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#C9A961] transition-colors"
          >
            ← {tPortal('back')}
          </Link>
        </div>
      </header>

      <div className="flex-1 px-6 sm:px-10 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-[2px] bg-[#C9A961] mb-8" />
          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-4 font-heading">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading font-light text-4xl sm:text-5xl text-[#F5EFE0] mb-6 leading-tight">
            {t('heading')}
          </h1>
          <p className="text-[#C0BBA8] text-sm sm:text-base leading-relaxed mb-16 max-w-xl">
            {t('intro')}
          </p>

          {/* 2FA */}
          <section className="mb-16">
            <h2 className="font-heading font-light text-2xl text-[#F5EFE0] mb-6">
              {t('twofa_heading')}
            </h2>
            <TwoFactorPanel />
          </section>

          {/* Sessions */}
          <section className="pt-10 border-t border-[#2a2a2a]">
            <h2 className="font-heading font-light text-2xl text-[#F5EFE0] mb-6">
              {t('sessions_heading')}
            </h2>
            <SessionsPanel />
          </section>
        </div>
      </div>
    </main>
  )
}
