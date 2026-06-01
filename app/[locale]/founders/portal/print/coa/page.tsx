import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder } from '@/lib/auth/founders'
import { getFulfillmentForFounder } from '@/lib/founders/print'
import { CoaPrintButton } from '@/components/features/founders/CoaPrintButton'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Certificate of Authenticity — Founder's Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersCoaPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(locale === 'en' ? '/founders/login' : `/${locale}/founders/login`)
  }

  const fulfillment = await getFulfillmentForFounder(founder.user_id)
  const editionNumber = fulfillment?.edition_number ?? null

  const t = await getTranslations({ locale, namespace: 'founders.coa' })
  const tPrint = await getTranslations({ locale, namespace: 'founders.print' })
  const tPortal = await getTranslations({ locale, namespace: 'founders.portal' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const printHref =
    locale === 'en' ? '/founders/portal/print' : `/${locale}/founders/portal/print`

  // No authentic certificate until an edition number is assigned — bounce back
  // to the print page (which explains the COA is pending).
  if (editionNumber == null) {
    redirect(printHref)
  }

  const displayName = founder.recognition_name?.trim() || founder.full_name
  // Use the PERSISTED issuance date, not a render-time now() (which would
  // change on every print). Stamped when the edition number was assigned.
  const issuedOn = fulfillment?.coa_issued_at
    ? new Date(fulfillment.coa_issued_at).toLocaleDateString(
        locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ja-JP',
        { year: 'numeric', month: 'long', day: 'numeric' }
      )
    : ''

  return (
    <main className="bg-[#f7f3e8] text-[#1A1A1A] min-h-screen flex flex-col print:bg-white">
      {/* Screen-only chrome — hidden when printing */}
      <header className="border-b border-[#d8cfb8] px-6 sm:px-10 py-5 bg-[#0e0e0e] text-[#E6E2D6] print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-[#C9A961] font-heading">
            {tFounders('eyebrow')}
          </p>
          <div className="flex items-center gap-6">
            <Link
              href={printHref}
              className="text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#C9A961] transition-colors"
            >
              {tPortal('back')}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 sm:px-10 py-12 sm:py-20 print:py-0 print:px-0">
        {/* The certificate frame — what prints. */}
        <section className="max-w-2xl mx-auto bg-white border border-[#d8cfb8] p-12 sm:p-16 print:border-0 print:p-12 print:max-w-none print:mx-0">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#8a6f2b] font-serif mb-3">
              The Kwame Brathwaite Archive
            </p>
            <div className="w-12 h-[2px] bg-[#C9A961] mx-auto mb-8" />

            <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a6f2b] font-serif mb-6">
              {t('eyebrow')}
            </p>

            <h1 className="font-serif text-3xl sm:text-4xl mb-10 leading-tight">
              {tPrint('heading')}
            </h1>
          </div>

          <div className="space-y-5 text-[15px] leading-relaxed mb-10 font-serif">
            <p>
              {t.rich('body', {
                name: () => <strong>{displayName}</strong>,
                editionLabel: () => (
                  <strong>
                    {fulfillment?.is_ap
                      ? t('editionLineAp', { number: editionNumber })
                      : t('editionLine', { number: editionNumber })}
                  </strong>
                ),
                workTitle: () => <em>{tPrint('heading')}</em>,
                editionInfo: () => tPrint('editionInfo'),
              })}
            </p>
          </div>

          <div className="border-t border-[#d8cfb8] pt-6 mt-10">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-1 font-serif">
                  {t('issuedOn')}
                </p>
                <p className="text-sm font-serif">{issuedOn}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a6f2b] mb-1 font-serif">
                  {t('issuedBy')}
                </p>
                <p className="text-sm font-serif italic">
                  The Kwame Brathwaite Archive
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Print button — screen only */}
        <div className="max-w-2xl mx-auto mt-8 text-center print:hidden">
          <CoaPrintButton label={t('printButton')} />
        </div>
      </div>
    </main>
  )
}
