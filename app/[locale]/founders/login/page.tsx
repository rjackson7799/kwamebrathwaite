import { getTranslations, setRequestLocale } from 'next-intl/server'
import { MagicLinkRequestForm } from '@/components/features/founders/MagicLinkRequestForm'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ reason?: string }>
}

// Maps a callback/bridge ?reason=… to a founders.login.reasons key. Several
// failure modes collapse onto the same message.
function reasonMessageKey(reason: string | undefined): string | null {
  switch (reason) {
    case 'expired':
    case 'missing_token':
      return 'reasons.expired'
    case 'not_invited':
      return 'reasons.notInvited'
    case 'revoked':
      return 'reasons.revoked'
    case 'rate_limited':
      return 'reasons.rateLimited'
    case 'server_error':
      return 'reasons.error'
    default:
      return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'founders.login' })
  return {
    title: `${t('heading')} — Kwame Brathwaite Archive`,
    description: t('intro'),
    // Keep this page out of search indexes. The /founders info page is the
    // public-facing program page; this is a sign-in form.
    robots: { index: false, follow: false },
  }
}

export default async function FoundersLoginPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { reason } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'founders.login' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })

  const reasonKey = reasonMessageKey(reason)

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-20">
        <div className="w-full max-w-md">
          {/* Eyebrow */}
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-heading text-center">
            {tFounders('eyebrow')}
          </p>

          {/* Gold accent rule (horizontal, centered) */}
          <div className="w-16 h-[2px] bg-[#C9A961] mx-auto mb-8" />

          <h1 className="font-heading font-light text-3xl sm:text-4xl text-[#F5EFE0] mb-6 text-center leading-tight">
            {t('heading')}
          </h1>

          <p className="text-[#C0BBA8] text-sm sm:text-base leading-relaxed mb-10 text-center">
            {t('intro')}
          </p>

          {reasonKey && (
            <div
              role="status"
              className="mb-8 rounded-sm border border-[#C9A961]/40 bg-[#C9A961]/10 px-4 py-3 text-sm text-[#E6E2D6] text-center"
            >
              {t(reasonKey)}
            </div>
          )}

          {/* When they arrived from a failed link, leave them one action:
              type email → send. */}
          <MagicLinkRequestForm autoFocusEmail={Boolean(reasonKey)} />

          {/* "Not a member yet?" learn-more link temporarily removed while /founders is
              unpublished. Restore the block linking to /founders (and the Link import +
              learnMoreHref const) when the page goes live again. */}
        </div>
      </div>
    </main>
  )
}
