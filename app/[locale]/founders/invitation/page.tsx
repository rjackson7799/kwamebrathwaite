import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentFounder, foundersPath } from '@/lib/auth/founders'
import { InvitationActions } from '@/components/features/founders/InvitationActions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Your invitation — Founders Circle",
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Donation page for the special fundraiser. Authenticated so the donate button
// is tied to an identified, invited member.
const GIVEBUTTER_URL = 'https://givebutter.com/the-founders-circle-rgvzcz'

// Secondary-market contribution rate, confirmed by the client at 10%.
const RESALE_PERCENT = '10%'

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
          <h1 className="font-heading font-light text-3xl text-[#F5EFE0] mb-4">{t('closedHeading')}</h1>
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

  // Invited — full invitation: intro, what founders receive, donate + decline.
  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen">
      <section className="max-w-5xl mx-auto px-8 sm:px-12 py-14 md:py-20">
        {/* Hero — text beside the portrait (mirrors the About page layout) so
            the eyebrow, heading and intro stay above the fold. Stacks
            text-first on mobile. */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-14 items-start mb-14">
          <div className="md:w-[58%]">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-heading">
              {t('eyebrow')}
            </p>
            <h1 className="font-heading font-light text-4xl sm:text-5xl text-[#F5EFE0] leading-[1.05] mb-6">
              {t('heading', { name: founder.recognition_name || founder.full_name })}
            </h1>
            <div className="w-24 h-[2px] bg-[#C9A961] mb-8" />
            <div className="space-y-5 text-lg leading-relaxed text-[#C0BBA8]">
              <p>{t('intro')}</p>
              <p>{t('intro2')}</p>
              <p>{t('intro3')}</p>
            </div>
          </div>

          {/* Archival plate — clean borderless portrait (matches the About page). */}
          <div className="w-full md:w-[42%] md:flex-shrink-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-[#0a0a0a] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
              <Image
                src="/founders/kb_self_founders.jpg"
                alt={t('imageAlt')}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Body — single readable column. */}
        <div className="max-w-2xl">
          {/* What founders receive */}
          <p className="text-xs uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-heading">
            {t('whatYouReceiveHeading')}
          </p>
          <ul className="space-y-5 mb-10">
            <Term text={tIntro('benefitPrint')} />
            <Term text={t('benefitFirstLook')} />
            <Term text={t('benefitExhibition')} />
            <Term text={t('benefitTax')} />
            <Term text={t('secondaryMarket', { percent: RESALE_PERCENT })} />
          </ul>

          {/* Commitment — the binding hold/resale terms, kept as fine print. */}
          <p className="mb-10 text-sm leading-relaxed text-[#8a8a8a]">
            {tIntro('commitmentNote')}
          </p>

          {/* Signature — closes the invitation like a signed letter from the director. */}
          <div className="mb-14">
            <div className="w-16 h-[2px] bg-[#C9A961] mb-5" />
            <p className="font-heading font-light text-xl text-[#F5EFE0]">{tIntro('signatureName')}</p>
            <p className="mt-1 text-sm text-[#C0BBA8]">{tIntro('signatureTitle')}</p>
            <p className="text-sm text-[#8a8a8a]">{tIntro('signatureOrg')}</p>
          </div>

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
