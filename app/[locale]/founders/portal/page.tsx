import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Founder's Circle — Kwame Brathwaite Archive",
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersPortalPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // Defense-in-depth: middleware already gates /founders/portal/* on
  // (session + founders membership), but a server-component read here means
  // we render with the actual founder row, and a bug in middleware can't
  // accidentally show portal content to a non-founder.
  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const t = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const displayName = founder.recognition_name?.trim() || founder.full_name

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex flex-col">
      {/* Header strip — eyebrow + sign out */}
      <header className="border-b border-[#2a2a2a] px-6 sm:px-10 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#C9A961] font-serif">
            {tFounders('eyebrow')}
          </p>
          <form action="/api/founders/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#C9A961] transition-colors"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 px-6 sm:px-10 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto">
          {/* Gold rule */}
          <div className="w-16 h-[2px] bg-[#C9A961] mb-10" />

          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-5 font-serif">
            {t('welcomeEyebrow')}
          </p>

          <h1 className="font-serif text-4xl sm:text-5xl text-[#F5EFE0] mb-10 leading-tight">
            {displayName}
          </h1>

          <p className="text-[#C0BBA8] text-base sm:text-lg leading-relaxed max-w-xl">
            {t('welcomeBody')}
          </p>

          {/* Portal nav — Phase 1D ships Profile + Security; Phase 2A adds
              Briefings; later sub-phases (Previews, Print, Archive) will
              add cards here as they land. */}
          <nav className="mt-16 pt-10 border-t border-[#2a2a2a] grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link
              href={locale === 'en' ? '/founders/portal/briefings' : `/${locale}/founders/portal/briefings`}
              className="group block border border-[#2a2a2a] hover:border-[#C9A961] p-5 transition-colors sm:col-span-2"
            >
              <p className="text-[#C9A961] uppercase tracking-[0.14em] text-[10px] mb-2 group-hover:text-[#d4b572]">
                {t('navBriefings')}
              </p>
              <p className="text-[#E6E2D6] text-sm leading-relaxed">{t('navBriefingsDesc')}</p>
            </Link>
            <Link
              href={locale === 'en' ? '/founders/portal/profile' : `/${locale}/founders/portal/profile`}
              className="group block border border-[#2a2a2a] hover:border-[#C9A961] p-5 transition-colors"
            >
              <p className="text-[#C9A961] uppercase tracking-[0.14em] text-[10px] mb-2 group-hover:text-[#d4b572]">
                {t('navProfile')}
              </p>
              <p className="text-[#E6E2D6] text-sm leading-relaxed">{t('navProfileDesc')}</p>
            </Link>
            <Link
              href={locale === 'en' ? '/founders/portal/security' : `/${locale}/founders/portal/security`}
              className="group block border border-[#2a2a2a] hover:border-[#C9A961] p-5 transition-colors"
            >
              <p className="text-[#C9A961] uppercase tracking-[0.14em] text-[10px] mb-2 group-hover:text-[#d4b572]">
                {t('navSecurity')}
              </p>
              <p className="text-[#E6E2D6] text-sm leading-relaxed">{t('navSecurityDesc')}</p>
            </Link>
          </nav>
        </div>
      </div>
    </main>
  )
}
