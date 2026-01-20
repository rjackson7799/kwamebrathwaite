import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './request'

export const { Link, useRouter, usePathname, redirect } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
})
