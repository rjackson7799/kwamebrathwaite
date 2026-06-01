import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { getPreviewExhibition } from '@/lib/founders/exhibitions'
import { RichTextContent } from '@/components/ui/RichTextContent'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Preview — Founder's Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function FoundersPreviewDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const exhibition = await getPreviewExhibition(id, locale)
  if (!exhibition) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'founders.previews' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`
  const listHref =
    locale === 'en'
      ? '/founders/portal/previews'
      : `/${locale}/founders/portal/previews`

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

  const location = [exhibition.venue, exhibition.city, exhibition.country]
    .filter(Boolean)
    .join(' · ')

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
        <article className="max-w-2xl mx-auto">
          <Link
            href={listHref}
            className="text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#C9A961] transition-colors inline-block mb-10"
          >
            {t('backToList')}
          </Link>

          <div className="w-16 h-[2px] bg-[#C9A961] mb-10" />

          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-4">
            {t('eyebrowItem')}
          </p>

          <h1 className="font-heading font-light text-4xl sm:text-5xl text-[#F5EFE0] mb-6 leading-tight">
            {exhibition.title}
          </h1>

          {location ? (
            <p className="text-base text-[#C0BBA8] mb-1">{location}</p>
          ) : null}
          {formatRange(exhibition.start_date, exhibition.end_date) ? (
            <p className="text-sm text-[#8a8a8a] mb-10">
              {formatRange(exhibition.start_date, exhibition.end_date)}
            </p>
          ) : null}

          {exhibition.image_url ? (
            <div className="relative w-full aspect-[3/2] mb-12 overflow-hidden bg-[#1a1a1a]">
              <Image
                src={exhibition.image_url}
                alt={exhibition.title}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 768px, 100vw"
              />
            </div>
          ) : null}

          {exhibition.preview_notes ? (
            <section className="border-l-2 border-[#C9A961] pl-6 mb-12">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#C9A961] mb-3 font-heading">
                {t('curatorNote')}
              </p>
              <RichTextContent
                html={exhibition.preview_notes}
                className="prose prose-invert prose-headings:font-heading prose-headings:font-light prose-headings:text-[#F5EFE0] prose-p:text-[#C0BBA8] prose-a:text-[#C9A961] prose-strong:text-[#E6E2D6] max-w-none"
              />
            </section>
          ) : null}

          {exhibition.description ? (
            <RichTextContent
              html={exhibition.description}
              className="prose prose-invert prose-headings:font-heading prose-headings:font-light prose-headings:text-[#F5EFE0] prose-p:text-[#C0BBA8] prose-a:text-[#C9A961] prose-strong:text-[#E6E2D6] prose-blockquote:border-[#C9A961] prose-blockquote:text-[#C0BBA8] max-w-none"
            />
          ) : null}
        </article>
      </div>
    </main>
  )
}
