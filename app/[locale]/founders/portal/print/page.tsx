import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { getFulfillmentForFounder } from '@/lib/founders/print'
import { FulfillmentTimeline } from '@/components/features/founders/FulfillmentTimeline'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "The Founder's Print — Founders Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersPrintPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const fulfillment = await getFulfillmentForFounder(founder.user_id)

  const t = await getTranslations({ locale, namespace: 'founders.print' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const portalHref = locale === 'en' ? '/founders/portal' : `/${locale}/founders/portal`
  const coaHref =
    locale === 'en' ? '/founders/portal/print/coa' : `/${locale}/founders/portal/print/coa`

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
          <div className="w-16 h-[2px] bg-[#C9A961] mb-10" />

          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-5 font-heading">
            {t('eyebrow')}
          </p>

          <h1 className="font-heading font-light text-4xl sm:text-5xl text-[#F5EFE0] mb-3 leading-tight">
            {t('heading')}
          </h1>

          <p className="text-sm text-[#8a8a8a] mb-12 italic">
            {t('subheading')}
          </p>

          {/* Thumbnail. Static asset at public/founders/print.jpg. If the
              asset hasn't been placed yet, this <Image> 404s gracefully. */}
          <div className="relative w-full aspect-square mb-12 overflow-hidden bg-[#1a1a1a] border-t-2 border-[#C9A961]">
            <Image
              src="/founders/print.jpg"
              alt={t('heading')}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 600px, 100vw"
            />
          </div>

          <div className="space-y-5 text-[#C0BBA8] text-base leading-relaxed mb-12">
            <p>{t('provenance.p1')}</p>
            <p>{t('provenance.p2')}</p>
            <p>{t('provenance.p3')}</p>
          </div>

          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-6 font-heading">
            {t('editionInfo')}
          </p>

          <FulfillmentTimeline
            status={fulfillment?.status ?? null}
            editionNumber={fulfillment?.edition_number ?? null}
            trackingUrl={fulfillment?.tracking_url ?? null}
            labels={{
              preparing: t('preparing'),
              editionLabel:
                fulfillment?.edition_number != null
                  ? fulfillment.is_ap
                    ? t('editionLabelAp', { number: fulfillment.edition_number })
                    : t('editionLabel', { number: fulfillment.edition_number })
                  : '',
              editionPending: t('editionPending'),
              pending: t('fulfillment.pending'),
              in_production: t('fulfillment.in_production'),
              ready: t('fulfillment.ready'),
              shipped: t('fulfillment.shipped'),
              delivered: t('fulfillment.delivered'),
              tracking: t('tracking'),
              shippedOnLabel: fulfillment?.shipped_at
                ? t('shippedOn', {
                    date: new Date(fulfillment.shipped_at).toLocaleDateString(
                      locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ja-JP',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    ),
                  })
                : null,
              deliveredOnLabel: fulfillment?.delivered_at
                ? t('deliveredOn', {
                    date: new Date(fulfillment.delivered_at).toLocaleDateString(
                      locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ja-JP',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    ),
                  })
                : null,
            }}
          />

          <div className="mt-12 pt-10 border-t border-[#2a2a2a]">
            {fulfillment?.edition_number != null ? (
              <Link
                href={coaHref}
                className="inline-block px-8 py-3 bg-[#C9A961] hover:bg-[#d4b572] text-[#0e0e0e] text-sm uppercase tracking-[0.18em] font-medium transition-colors"
              >
                {t('coaCta')}
              </Link>
            ) : (
              <p className="text-sm text-[#8a8473] italic">{t('coaPending')}</p>
            )}
          </div>
        </article>
      </div>
    </main>
  )
}
