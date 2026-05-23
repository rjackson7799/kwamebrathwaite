import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { PortalProfileForm } from '@/components/features/founders/PortalProfileForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Profile — Founder's Circle",
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersProfilePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const t = await getTranslations({ locale, namespace: 'founders.profile' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`

  // mailing_address is stored as jsonb; the API will return either an object
  // matching our schema or null. Re-shape to the form's flat default.
  const ma = (founder as unknown as { mailing_address?: Record<string, string | null> })
    .mailing_address
  const initial = {
    full_name: founder.full_name,
    recognition_name: founder.recognition_name ?? '',
    recognition_visibility: founder.recognition_visibility,
    phone: (founder as unknown as { phone?: string | null }).phone ?? '',
    organization: (founder as unknown as { organization?: string | null }).organization ?? '',
    mailing_address: {
      line1: ma?.line1 ?? '',
      line2: ma?.line2 ?? '',
      city: ma?.city ?? '',
      region: ma?.region ?? '',
      postal: ma?.postal ?? '',
      country: ma?.country ?? '',
    },
    preferred_locale: (founder.preferred_locale as 'en' | 'fr' | 'ja') ?? 'en',
  }

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex flex-col">
      <header className="border-b border-[#2a2a2a] px-6 sm:px-10 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#C9A961] font-serif">
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
          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-4 font-serif">
            {t('eyebrow')}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#F5EFE0] mb-6 leading-tight">
            {t('heading')}
          </h1>
          <p className="text-[#C0BBA8] text-sm sm:text-base leading-relaxed mb-12 max-w-xl">
            {t('intro')}
          </p>

          <PortalProfileForm initial={initial} />
        </div>
      </div>
    </main>
  )
}
