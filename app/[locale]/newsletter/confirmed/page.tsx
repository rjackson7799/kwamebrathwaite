import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('newsletterConfirmed')
  return {
    title: t('done.title'),
    robots: { index: false, follow: false },
  }
}

export default async function NewsletterConfirmedPage({ searchParams }: PageProps) {
  const locale = await getLocale()
  const t = await getTranslations('newsletterConfirmed')
  const { status } = await searchParams
  const isInvalid = status === 'invalid'
  const variant = isInvalid ? 'invalid' : 'done'
  const localizedHref = (href: string) => (locale === 'en' ? href : `/${locale}${href}`)

  return (
    <div className="container-page section-spacing">
      <div className="max-w-2xl mx-auto py-16 md:py-24">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-meta mb-6">
          {t(`${variant}.overline`)}
        </p>
        <h1 className="font-heading text-4xl md:text-5xl font-light leading-tight mb-6 text-black dark:text-[#F0F0F0]">
          {t(`${variant}.title`)}
        </h1>
        <p className="text-lg leading-[1.8] text-gray-body dark:text-[#C0C0C0] mb-10">
          {t(`${variant}.body`)}
        </p>
        <div className="flex flex-wrap gap-6 pt-8 border-t border-gray-light dark:border-[#333333]">
          <Link
            href={localizedHref('/')}
            className="text-sm uppercase tracking-[0.15em] text-gray-meta hover:text-black dark:hover:text-[#F0F0F0] underline underline-offset-4 transition-colors duration-fast"
          >
            {t('done.returnHome')}
          </Link>
          <Link
            href={localizedHref('/contact')}
            className="text-sm uppercase tracking-[0.15em] text-gray-meta hover:text-black dark:hover:text-[#F0F0F0] underline underline-offset-4 transition-colors duration-fast"
          >
            {t('done.contactUs')}
          </Link>
        </div>
      </div>
    </div>
  )
}
