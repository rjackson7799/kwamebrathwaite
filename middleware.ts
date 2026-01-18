import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/request'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Don't add prefix for default locale (en)
})

export const config = {
  // Match all pathnames except for:
  // - API routes (/api/...)
  // - Static files (_next/static, _next/image, favicon.ico, etc.)
  // - Admin routes (no locale prefix for admin)
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
}
