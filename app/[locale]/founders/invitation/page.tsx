import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder, foundersPath } from '@/lib/auth/founders'
import { InvitationActions } from '@/components/features/founders/InvitationActions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Your invitation — Founder's Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Donation page for the special fundraiser. Authenticated so the donate button
// is tied to an identified, invited member.
const GIVEBUTTER_URL = 'https://givebutter.com/trUmGD'

// Placeholder until counsel/tax confirm the secondary-market contribution rate.
const RESALE_PERCENT_PLACEHOLDER = '[TBD]%'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function FoundersInvitationPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const founder = await getCurrentFounder()
  if (!founder) {
    redirect(foundersPath(locale, '/founders/login'))
  }
  if (founder.status === 'active') {
    redirect(foundersPath(locale, '/founders/portal'))
  }

  const t = await getTranslations({ locale, namespace: 'founders.invitation' })
  const tIntro = await getTranslations({ locale, namespace: 'founders.intro' })

  // Closed state — paused / declined / archived land here, not the portal.
  if (founder.status !== 'invited') {
    return (
      <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-[2px] bg-[#C9A961] mx-auto mb-8" />
          <h1 className="font-serif text-3xl text-[#F5EFE0] mb-4">{t('closedHeading')}</h1>
          <p className="text-[#C0BBA8] leading-relaxed mb-8">{t('closedBody')}</p>
          <form action="/api/founders/auth/sign-out" method="post">
            <button
              type="submit"
              className="text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a] hover:text-[#C9A961] transition-colors"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Invited — full invitation: terms, what you receive, donate + decline.
  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen">
      <section className="max-w-3xl mx-auto px-8 sm:px-12 py-20 md:py-24">
        {/* Archival plate — Kwame's self-portrait. The image's own near-black
            ground blends into the page; the bottom gradient fades it into the
            composition and a gold hairline frames it like a gallery print.
            Background-image (not <Image>) keeps it gracefully invisible if the
            asset is ever missing, matching the public landing hero pattern. */}
        <div className="mb-12 sm:mb-16 max-w-xl">
          <div
            role="img"
            aria-label={t('imageAlt')}
            className="relative aspect-[4/5] sm:aspect-square w-full bg-[#0a0a0a] bg-cover bg-center ring-1 ring-[#C9A961]/25 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
            style={{ backgroundImage: "url('/founders/kb_self_founders.jpg')" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-[10px] border border-[#C9A961]/20" />
          </div>
        </div>

        <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-serif">
          {t('eyebrow')}
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl text-[#F5EFE0] leading-[1.02] mb-6">
          {t('heading', { name: founder.recognition_name || founder.full_name })}
        </h1>
        <div className="w-24 h-[2px] bg-[#C9A961] mb-8" />
        <p className="text-lg leading-relaxed text-[#C0BBA8] mb-14 max-w-2xl">{t('intro')}</p>

        {/* Terms */}
        <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-serif">
          {t('termsHeading')}
        </p>
        <ul className="space-y-5 mb-14">
          <Term text={t('term20x20')} />
          <Term text={t('termDonation')} />
          <Term text={t('termEdition')} />
          <Term text={t('holdUntil2036')} />
          <Term text={t('secondaryMarket', { percent: RESALE_PERCENT_PLACEHOLDER })} />
        </ul>

        {/* What you receive (reuses the public landing benefit copy) */}
        <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-serif">
          {t('whatYouReceiveHeading')}
        </p>
        <ul className="space-y-5 mb-14">
          <Term text={tIntro('benefitPrint')} />
          <Term text={tIntro('benefitRecognition')} />
          <Term text={tIntro('benefitAccess')} />
        </ul>

        {/* Actions */}
        <div className="border-t border-[#2a2a2a] pt-10">
          <InvitationActions
            givebutterUrl={GIVEBUTTER_URL}
            initiallyAccepted={founder.terms_accepted_at != null}
            labels={{
              termsAgree: t('termsAgree'),
              donate: t('donateCta'),
              accepting: t('accepting'),
              decline: t('declineButton'),
              declineConfirm: t('declineConfirm'),
              error: t('actionError'),
            }}
          />
          <p className="mt-8 text-xs text-[#6f6a5b] leading-relaxed max-w-xl">
            {t('returnNote')}
          </p>
        </div>
      </section>
    </main>
  )
}

function Term({ text }: { text: string }) {
  return (
    <li className="flex gap-4 items-start">
      <span aria-hidden className="text-[#C9A961] text-sm leading-[28px] mt-px">
        ◆
      </span>
      <span className="text-base leading-relaxed text-[#D4CFBE]">{text}</span>
    </li>
  )
}
