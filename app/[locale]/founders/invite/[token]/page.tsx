import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveFounderInviteToken } from '@/lib/auth/founders-admin'
import { foundersPath } from '@/lib/auth/founders'
import type { Metadata } from 'next'

// Confirmation interstitial for a durable invite/sign-in link.
//
// The link does NO authentication on this GET render — that only happens when
// the founder explicitly submits the form below (POST → ./confirm). This
// defeats email security scanners / link previews that follow GET links, which
// would otherwise burn or hijack the sign-in. See the plan's Security section.
//
// no-store + no-referrer for this page are set centrally in middleware.ts for
// /founders/invite/*; `referrer` here is belt-and-braces.
export const metadata: Metadata = {
  title: 'Continue to the Founders Circle',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ locale: string; token: string }>
}

export default async function FoundersInvitePage({ params }: PageProps) {
  const { locale, token } = await params
  setRequestLocale(locale)

  const resolution = await resolveFounderInviteToken(token)
  if (!resolution.ok) {
    // Unknown / expired / archived / dead-end status all collapse to "expired".
    redirect(`${foundersPath(locale, '/founders/login')}?reason=expired`)
  }

  const t = await getTranslations({ locale, namespace: 'founders.invite' })
  const tFounders = await getTranslations({ locale, namespace: 'founders' })
  const name = resolution.founder.recognition_name || resolution.founder.full_name
  const confirmAction = foundersPath(locale, `/founders/invite/${token}/confirm`)

  return (
    <main className="bg-[#0e0e0e] text-[#E6E2D6] min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-20">
        <div className="w-full max-w-md text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9A961] mb-6 font-heading">
            {tFounders('eyebrow')}
          </p>

          <div className="w-16 h-[2px] bg-[#C9A961] mx-auto mb-8" />

          <h1 className="font-heading font-light text-3xl sm:text-4xl text-[#F5EFE0] mb-6 leading-tight">
            {t('heading', { name })}
          </h1>

          <p className="text-[#C0BBA8] text-sm sm:text-base leading-relaxed mb-10">
            {t('body')}
          </p>

          <form action={confirmAction} method="post">
            <button
              type="submit"
              className="inline-flex items-center justify-center px-8 py-3 bg-[#C9A961] text-[#0e0e0e] text-sm font-medium uppercase tracking-[0.12em] rounded-sm hover:bg-[#d8bd7e] transition-colors"
            >
              {t('continue')}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
