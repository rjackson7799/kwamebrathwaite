'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark'
}

const localeOptions = ['en', 'fr', 'ja'] as const

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
    // Remove current locale prefix if present
    let newPath = pathname

    // If current locale is not default (en), remove its prefix
    if (currentLocale !== 'en') {
      newPath = pathname.replace(`/${currentLocale}`, '') || '/'
    }

    // Add new locale prefix if not default
    if (newLocale !== 'en') {
      newPath = `/${newLocale}${newPath}`
    }

    router.push(newPath)
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
        className={`flex items-center gap-2 text-body font-sans transition-colors duration-normal ${
          isDark
            ? 'text-white/80 hover:text-white'
            : 'text-black hover:text-gray-warm'
        }`}
      >
        <span>{t(currentLocale as 'en' | 'fr' | 'ja')}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-normal ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('label')}
          className={`absolute top-full mt-2 py-1 min-w-[140px] rounded-md shadow-md z-dropdown ${
            isDark ? 'bg-charcoal' : 'bg-white border border-gray-light'
          }`}
        >
          {localeOptions.map((locale) => (
            <li key={locale} role="option" aria-selected={locale === currentLocale}>
              <button
                type="button"
                onClick={() => switchLocale(locale)}
                disabled={locale === currentLocale}
                className={`w-full text-left px-4 py-2 text-body-sm transition-colors duration-fast ${
                  locale === currentLocale
                    ? isDark
                      ? 'text-white font-medium'
                      : 'text-black font-medium'
                    : isDark
                    ? 'text-white/70 hover:text-white hover:bg-white/10'
                    : 'text-gray-warm hover:text-black hover:bg-gray-light'
                }`}
              >
                {t(locale)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
