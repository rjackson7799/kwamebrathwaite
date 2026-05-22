import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('newsletterConfirm')
  return {
    title: t('confirm.title'),
    robots: { index: false, follow: false },
  }
}

export default async function NewsletterConfirmPage({ searchParams }: Props) {
  const { token } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('newsletterConfirm')

  const localizedHref = (href: string) => (locale === 'en' ? href : `/${locale}${href}`)

  if (!token) {
    return (
      <div className="container-page section-spacing">
        <div className="max-w-2xl mx-auto py-16 md:py-24">
          <h1 className="font-heading text-4xl md:text-5xl font-light leading-tight mb-6 text-black dark:text-[#F0F0F0]">
            {t('confirm.missingTokenTitle')}
          </h1>
          <p className="text-lg leading-[1.8] text-gray-body dark:text-[#C0C0C0] mb-8">
            {t('confirm.missingTokenBody')}
          </p>
          <Link
            href={localizedHref('/')}
            className="inline-block text-sm uppercase tracking-[0.15em] text-gray-meta hover:text-black dark:hover:text-[#F0F0F0] underline underline-offset-4 transition-colors duration-fast"
          >
            {t('confirm.returnHome')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page section-spacing">
      <div className="max-w-2xl mx-auto py-16 md:py-24">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-meta mb-6">
          {t('confirm.overline')}
        </p>
        <h1 className="font-heading text-4xl md:text-5xl font-light leading-tight mb-6 text-black dark:text-[#F0F0F0]">
          {t('confirm.title')}
        </h1>
        <p className="text-lg leading-[1.8] text-gray-body dark:text-[#C0C0C0] mb-10">
          {t('confirm.body')}
        </p>

        <form method="POST" action="/api/newsletter/confirm" className="flex flex-wrap items-center gap-6">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-block bg-black text-white dark:bg-[#F0F0F0] dark:text-black px-8 py-3 text-sm uppercase tracking-[0.15em] hover:opacity-80 transition-opacity duration-fast"
          >
            {t('confirm.button')}
          </button>
          <Link
            href={localizedHref('/')}
            className="text-sm uppercase tracking-[0.15em] text-gray-meta hover:text-black dark:hover:text-[#F0F0F0] underline underline-offset-4 transition-colors duration-fast"
          >
            {t('confirm.cancel')}
          </Link>
        </form>
      </div>
    </div>
  )
}
