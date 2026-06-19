import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { getPublishedBriefings } from '@/lib/founders/briefings'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Briefings — Founders Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersBriefingsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const t = await getTranslations({ locale, namespace: 'founders.briefings' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const briefings = await getPublishedBriefings(locale, { limit: 50 })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`
  const briefingHref = (id: string) =>
    locale === 'en'
      ? `/founders/portal/briefings/${id}`
      : `/${locale}/founders/portal/briefings/${id}`

  const dateFormat = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ja-JP'

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
            {tPortal('back')}
          </Link>
        </div>
      </header>

      <div className="flex-1 px-6 sm:px-10 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-[2px] bg-[#C9A961] mb-10" />

          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-5 font-heading">
            {t('eyebrow')}
          </p>

          <h1 className="font-heading font-light text-4xl sm:text-5xl text-[#F5EFE0] mb-6 leading-tight">
            {t('heading')}
          </h1>

          <p className="text-[#C0BBA8] text-base leading-relaxed max-w-2xl mb-16">
            {t('intro')}
          </p>

          {briefings.length === 0 ? (
            <p className="text-[#8a8a8a] italic">{t('empty')}</p>
          ) : (
            <ul className="space-y-10 border-t border-[#2a2a2a] pt-10">
              {briefings.map((b) => (
                <li key={b.id}>
                  <Link href={briefingHref(b.id)} className="group block">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-2 group-hover:text-[#C9A961] transition-colors">
                      {new Date(b.published_at).toLocaleDateString(dateFormat, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <h2 className="font-heading font-light text-2xl sm:text-3xl text-[#F5EFE0] group-hover:text-[#C9A961] transition-colors leading-snug mb-3">
                      {b.title}
                    </h2>
                    {b.excerpt ? (
                      <p className="text-[#C0BBA8] text-base leading-relaxed">
                        {b.excerpt}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
