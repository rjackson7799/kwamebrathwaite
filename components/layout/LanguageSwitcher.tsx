'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Globe, ChevronDown } from 'lucide-react'

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark'
}

const localeOptions = ['en', 'fr', 'ja'] as const
type Locale = (typeof localeOptions)[number]

const localeNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ja: '日本語'
}

const localeCodes: Record<Locale, string> = {
  en: 'EN',
  fr: 'FR',
  ja: 'JA'
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentLocale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('languageSwitcher')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const switchLocale = (newLocale: string) => {
    // Use next-intl's locale-aware router to switch locales
    router.replace(pathname, { locale: newLocale })
    setIsOpen(false)
  }

  const isDark = variant === 'dark'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('label')}
        className={`flex items-center gap-2 px-3 py-2 text-[11px] font-normal tracking-[0.08em] uppercase rounded-md transition-colors duration-200 ${
          isDark
            ? 'text-white/80 hover:text-white hover:bg-white/10'
            : 'text-black dark:text-[#F0F0F0] hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        <Globe className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
        <span>{localeCodes[currentLocale as Locale]}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('label')}
          className={`absolute right-0 top-full mt-2 py-1 w-40 rounded-md shadow-lg z-dropdown ${
            isDark ? 'bg-charcoal' : 'bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333333]'
          }`}
        >
          {localeOptions.map((locale) => (
            <li key={locale} role="option" aria-selected={locale === currentLocale}>
              <button
                type="button"
                onClick={() => switchLocale(locale)}
                disabled={locale === currentLocale}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors duration-200 ${
                  locale === currentLocale
                    ? isDark
                      ? 'text-white font-medium bg-white/5'
                      : 'text-black dark:text-[#F0F0F0] font-medium bg-gray-50 dark:bg-white/5'
                    : isDark
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'text-black dark:text-[#F0F0F0] hover:bg-gray-50 dark:hover:bg-white/10'
                }`}
              >
                <span className="text-xs text-gray-500 uppercase w-6">{localeCodes[locale]}</span>
                <span>{localeNames[locale]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
