import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['en', 'fr', 'ja'] as const
export const defaultLocale = 'en' as const

export type Locale = (typeof locales)[number]

type Messages = Record<string, unknown>

// Deep-merge so non-default locales fall back to the default locale for any key
// they're missing. Lets us ship new English copy without immediately translating
// it — untranslated keys render in English instead of as raw key paths.
function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base }
  for (const key of Object.keys(override)) {
    const b = out[key]
    const o = override[key]
    out[key] =
      b && o && typeof b === 'object' && typeof o === 'object' && !Array.isArray(b) && !Array.isArray(o)
        ? deepMerge(b as Messages, o as Messages)
        : o
  }
  return out
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  if (!locale || !locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = (await import(`../messages/${locale}.json`)).default as Messages

  if (locale === defaultLocale) {
    return { locale, messages }
  }

  const fallback = (await import(`../messages/${defaultLocale}.json`)).default as Messages
  return { locale, messages: deepMerge(fallback, messages) }
})
