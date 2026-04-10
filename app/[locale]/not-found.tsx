import { getLocale, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { NotFoundLogger } from '@/components/features/NotFoundLogger'

// Render dynamically so we can use getLocale() at request time.
// Next.js would otherwise try to statically generate this for each locale.
export const dynamic = 'force-dynamic'

const destinations = [
  { href: '/works', key: 'works' },
  { href: '/exhibitions', key: 'exhibitions' },
  { href: '/press', key: 'press' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const

export default async function LocaleNotFound() {
  const locale = await getLocale()
  const [t, nav] = await Promise.all([
    getTranslations('notFound'),
    getTranslations('navigation'),
  ])

  const localizedHref = (href: string) =>
    locale === 'en' ? href : `/${locale}${href}`

  const mailBody = encodeURIComponent(
    `${t('reportBrokenLinkSubject')}:\n\n`
  )
  const contactHref = `${localizedHref('/contact')}?subject=${encodeURIComponent(
    t('reportBrokenLinkSubject')
  )}&body=${mailBody}`

  return (
    <div className="container-page section-spacing">
      <NotFoundLogger locale={locale} />
      <div className="max-w-3xl mx-auto py-16 md:py-24">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-meta mb-6">
          {t('overline')}
        </p>
        <h1 className="font-heading text-4xl md:text-6xl font-light leading-tight mb-6 text-black dark:text-[#F0F0F0]">
          {t('title')}
        </h1>
        <p className="text-lg leading-[1.8] text-gray-body dark:text-[#C0C0C0] mb-12 max-w-2xl">
          {t('description')}
        </p>

        <div className="pt-8 border-t border-gray-light dark:border-[#333333]">
          <p className="text-sm uppercase tracking-[0.15em] text-gray-meta mb-6">
            {t('lookingFor')}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-12">
            {destinations.map(({ href, key }) => (
              <li key={key}>
                <Link
                  href={localizedHref(href)}
                  className="group flex items-baseline justify-between py-3 border-b border-gray-light dark:border-[#333333] hover:border-black dark:hover:border-[#F0F0F0] transition-colors duration-fast"
                >
                  <span className="font-heading text-lg text-black dark:text-[#F0F0F0]">
                    {nav(key)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-gray-meta group-hover:text-black dark:group-hover:text-[#F0F0F0] group-hover:translate-x-1 transition-all duration-fast"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href={contactHref}
            className="inline-block text-sm uppercase tracking-[0.15em] text-gray-meta hover:text-black dark:hover:text-[#F0F0F0] underline underline-offset-4 transition-colors duration-fast"
          >
            {t('reportBrokenLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}
