import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { getBriefingForReader, recordBriefingRead } from '@/lib/founders/briefings'
import { RichTextContent } from '@/components/ui/RichTextContent'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Briefing — Founders Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function FoundersBriefingDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const briefing = await getBriefingForReader(id, locale)
  if (!briefing) {
    notFound()
  }

  // Record the read inline (idempotent via composite PK). Non-fatal —
  // a failed read receipt never breaks the reading experience.
  await recordBriefingRead(briefing.id, founder.user_id)

  const t = await getTranslations({ locale, namespace: 'founders.briefings' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`
  const briefingsHref =
    locale === 'en' ? '/founders/portal/briefings' : `/${locale}/founders/portal/briefings`

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
        <article className="max-w-2xl mx-auto">
          <Link
            href={briefingsHref}
            className="text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#C9A961] transition-colors inline-block mb-10"
          >
            {t('backToList')}
          </Link>

          <div className="w-16 h-[2px] bg-[#C9A961] mb-10" />

          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-4">
            {new Date(briefing.published_at).toLocaleDateString(dateFormat, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <h1 className="font-heading font-light text-4xl sm:text-5xl text-[#F5EFE0] mb-10 leading-tight">
            {briefing.title}
          </h1>

          {briefing.excerpt ? (
            <p className="text-[#C9A961] text-lg leading-relaxed mb-10 italic">
              {briefing.excerpt}
            </p>
          ) : null}

          <RichTextContent
            html={briefing.body_html}
            className="prose prose-invert prose-headings:font-heading prose-headings:font-light prose-headings:text-[#F5EFE0] prose-p:text-[#C0BBA8] prose-a:text-[#C9A961] prose-strong:text-[#E6E2D6] prose-blockquote:border-[#C9A961] prose-blockquote:text-[#C0BBA8] max-w-none"
          />
        </article>
      </div>
    </main>
  )
}
