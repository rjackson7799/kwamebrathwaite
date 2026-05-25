import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { getActivePreviews } from '@/lib/founders/exhibitions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Previews — Founder's Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersPreviewsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const t = await getTranslations({ locale, namespace: 'founders.previews' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const previews = await getActivePreviews(locale, { limit: 50 })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`
  const detailHref = (id: string) =>
    locale === 'en'
      ? `/founders/portal/previews/${id}`
      : `/${locale}/founders/portal/previews/${id}`

  const dateFormat = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ja-JP'

  function formatRange(start: string | null, end: string | null): string {
    if (!start && !end) return ''
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString(dateFormat, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    if (start && end) return `${fmt(start)} – ${fmt(end)}`
    return fmt(start || end!)
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
            {tPortal('back')}
          </Link>
        </div>
      </header>

      <div className="flex-1 px-6 sm:px-10 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-[2px] bg-[#C9A961] mb-10" />

          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-5 font-serif">
            {t('eyebrow')}
          </p>

          <h1 className="font-serif text-4xl sm:text-5xl text-[#F5EFE0] mb-6 leading-tight">
            {t('heading')}
          </h1>

          <p className="text-[#C0BBA8] text-base leading-relaxed max-w-2xl mb-16">
            {t('intro')}
          </p>

          {previews.length === 0 ? (
            <p className="text-[#8a8a8a] italic">{t('empty')}</p>
          ) : (
            <ul className="space-y-12 border-t border-[#2a2a2a] pt-10">
              {previews.map((p) => {
                const location = [p.venue, p.city, p.country].filter(Boolean).join(' · ')
                const thumb = p.thumbnail_image_url || p.image_url
                return (
                  <li key={p.id}>
                    <Link href={detailHref(p.id)} className="group block">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-6 items-start">
                        {thumb ? (
                          <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#1a1a1a]">
                            <Image
                              src={thumb}
                              alt={p.title}
                              fill
                              className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                              sizes="(min-width: 640px) 33vw, 100vw"
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-[4/3] bg-[#1a1a1a]" />
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-2 group-hover:text-[#C9A961] transition-colors">
                            {t('eyebrowItem')}
                          </p>
                          <h2 className="font-serif text-2xl sm:text-3xl text-[#F5EFE0] group-hover:text-[#C9A961] transition-colors leading-snug mb-3">
                            {p.title}
                          </h2>
                          {location ? (
                            <p className="text-sm text-[#C0BBA8] mb-1">{location}</p>
                          ) : null}
                          {formatRange(p.start_date, p.end_date) ? (
                            <p className="text-sm text-[#8a8a8a]">
                              {formatRange(p.start_date, p.end_date)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
