import { getTranslations, setRequestLocale } from 'next-intl/server'
import { FounderInquiryForm } from '@/components/features/founders/FounderInquiryForm'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'founders' })
  return {
    title: `${t('heroHeadline')} — ${t('eyebrow')}`,
    description: t('heroSubhead'),
  }
}

export default async function FoundersPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'founders' })
  const tIntro = await getTranslations({ locale, namespace: 'founders.intro' })

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen">
      {/* HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[70vh]">
          {/* Left column: typography + gold rule */}
          <div className="relative flex flex-col justify-center px-8 sm:px-12 py-16 md:py-24">
            {/* Gold vertical accent rule */}
            <div className="absolute left-0 top-12 bottom-12 w-[3px] bg-[#C9A961]" />

            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-8 font-heading">
              {t('eyebrow')}
            </p>

            <h1 className="font-heading font-light uppercase tracking-[0.06em] text-4xl sm:text-5xl md:text-6xl leading-[1.08] text-[#F5EFE0] mb-8">
              {t('heroHeadline')}
            </h1>

            <div className="w-24 h-[2px] bg-[#C9A961] mb-6" />

            <p className="text-base sm:text-lg text-[#C0BBA8] leading-relaxed max-w-md">
              {t('heroSubhead')}
            </p>
          </div>

          {/* Right column: hero portrait — Kwame's self-portrait
              (public/founders/kb_self_founders.jpg). Using background-image
              instead of an <img> tag so a missing asset is silently invisible
              (no broken image icon, no client component needed for an onError
              handler); the gradient shows through until it loads. */}
          <div
            role="img"
            aria-label="Kwame Brathwaite, self-portrait with his camera"
            className="relative bg-gradient-to-br from-[#2a241c] via-[#1a1714] to-[#0e0e0e] min-h-[40vh] md:min-h-full bg-cover bg-center"
            style={{ backgroundImage: "url('/founders/kb_self_founders.jpg')" }}
          />
        </div>
      </section>

      {/* PROGRAM POSITIONING ────────────────────────────────────────────── */}
      <section className="border-t border-[#2a2a2a]">
        <div className="max-w-3xl mx-auto px-8 sm:px-12 py-20 md:py-28">
          <h2 className="font-heading font-light text-3xl sm:text-4xl text-[#F5EFE0] leading-tight mb-8">
            {tIntro('leadHeading')}
          </h2>

          <p className="text-lg leading-relaxed text-[#C0BBA8] mb-16 max-w-2xl">
            {tIntro('leadBody')}
          </p>

          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-8 font-heading">
            {tIntro('benefitsHeading')}
          </p>

          <ul className="space-y-6 mb-16">
            <Benefit text={tIntro('benefitPrint')} />
            <Benefit text={tIntro('benefitRecognition')} />
            <Benefit text={tIntro('benefitAccess')} />
            <Benefit text={tIntro('benefitTax')} />
          </ul>

          <div className="border-l-2 border-[#C9A961] pl-6 py-2">
            <p className="text-sm sm:text-base text-[#C0BBA8] leading-relaxed italic">
              {tIntro('invitationNote')}
            </p>
          </div>
        </div>
      </section>

      {/* INQUIRY FORM ───────────────────────────────────────────────────── */}
      <section id="inquire" className="border-t border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="max-w-2xl mx-auto px-8 sm:px-12 py-20 md:py-28">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-4 font-heading">
            {t('eyebrow')}
          </p>
          <h2 className="font-heading font-light text-3xl sm:text-4xl text-[#F5EFE0] mb-10">
            {t('form.heading')}
          </h2>

          <FounderInquiryForm />
        </div>
      </section>
    </main>
  )
}

function Benefit({ text }: { text: string }) {
  return (
    <li className="flex gap-4 items-start">
      <span aria-hidden className="text-[#C9A961] text-sm leading-[28px] mt-px">
        ◆
      </span>
      <span className="text-base leading-relaxed text-[#D4CFBE]">{text}</span>
    </li>
  )
}
