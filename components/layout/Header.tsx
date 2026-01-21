'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileMenu } from './MobileMenu'

const navLinks = [
  { href: '/', key: 'home' },
  { href: '/works', key: 'works' },
  { href: '/exhibitions', key: 'exhibitions' },
  { href: '/press', key: 'press' },
  { href: '/about', key: 'about' },
  { href: '/archive', key: 'archive' },
  { href: '/contact', key: 'contact' },
] as const

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('navigation')

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobileMenuOpen])

  // Generate locale-aware href
  const getLocalizedHref = (href: string) => {
    return locale === 'en' ? href : `/${locale}${href}`
  }

  // Check if link is active
  const isActive = (href: string) => {
    const currentPath = pathname.replace(`/${locale}`, '') || '/'
    if (href === '/') {
      return currentPath === '/'
    }
    return currentPath === href || currentPath.startsWith(`${href}/`)
  }

  return (
    <header className="sticky top-0 z-sticky bg-white border-b border-gray-light">
      <div className="flex items-center justify-between h-20 px-6 md:px-12 max-w-container mx-auto">
        {/* Logo */}
        <Link
          href={getLocalizedHref('/')}
          className="font-serif text-2xl md:text-[1.75rem] text-black hover:text-gray-warm transition-colors duration-fast"
        >
          Kwame Brathwaite
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4" aria-label="Main navigation">
          {navLinks.map(({ href, key }) => (
            <Link
              key={href}
              href={getLocalizedHref(href)}
              className={`text-[11px] font-normal tracking-[0.08em] uppercase transition-colors duration-200 pb-1 ${
                isActive(href)
                  ? 'font-medium text-black border-b-2 border-black'
                  : 'text-black hover:text-gray-600'
              }`}
            >
              {t(key)}
            </Link>
          ))}

          {/* Language Switcher */}
          <div className="ml-4 pl-4 border-l border-gray-light">
            <LanguageSwitcher variant="light" />
          </div>
        </nav>

        {/* Mobile: Language Switcher + Menu Button */}
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher variant="light" />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            className="p-2 -mr-2 text-black hover:text-gray-warm transition-colors duration-fast"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </header>
  )
}
