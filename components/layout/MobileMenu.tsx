'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LanguageSwitcher } from './LanguageSwitcher'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

const navLinks = [
  { href: '/', key: 'home' },
  { href: '/works', key: 'works' },
  { href: '/exhibitions', key: 'exhibitions' },
  { href: '/press', key: 'press' },
  { href: '/about', key: 'about' },
  { href: '/archive', key: 'archive' },
  { href: '/contact', key: 'contact' },
] as const

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const focusableElements = menuRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

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

  // Don't render anything on server or when closed
  if (typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-modal transition-opacity duration-slow ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-modal transform transition-transform duration-slow ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-end h-20 px-6 border-b border-gray-light">
          <button
            type="button"
            onClick={onClose}
            aria-label={tCommon('close')}
            className="p-2 -mr-2 text-black hover:text-gray-warm transition-colors duration-fast"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="py-4">
          {navLinks.map(({ href, key }) => (
            <Link
              key={href}
              href={getLocalizedHref(href)}
              onClick={onClose}
              className={`block px-6 py-4 text-xl border-b border-gray-light transition-colors duration-fast ${
                isActive(href)
                  ? 'text-black font-medium'
                  : 'text-black hover:text-gray-warm'
              }`}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        {/* Language Switcher */}
        <div className="px-6 py-4">
          <LanguageSwitcher variant="light" />
        </div>
      </div>
    </>,
    document.body
  )
}
