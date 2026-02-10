'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface ShareButtonProps {
  url: string
  title: string
  description?: string
}

export function ShareButton({ url, title, description }: ShareButtonProps) {
  const t = useTranslations('works.detail')
  const tCommon = useTranslations('common')
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on escape
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setIsOpen(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareOptions = [
    {
      id: 'copy',
      label: copied ? t('shareLinkCopied') : t('shareLink'),
      icon: copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      ),
      onClick: handleCopyLink,
    },
    {
      id: 'email',
      label: 'Email',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n\n${description || ''}\n\n${url}`)}`,
    },
    {
      id: 'twitter',
      label: 'X (Twitter)',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      external: true,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      external: true,
    },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          inline-flex items-center gap-2
          px-4 py-2
          text-[11px] font-medium uppercase tracking-[0.08em]
          text-black dark:text-[#F0F0F0]
          border border-gray-300 dark:border-[#333333]
          hover:border-black dark:hover:border-[#F0F0F0]
          transition-colors duration-fast
          rounded-sm
        "
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {tCommon('share')}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2
            w-48
            bg-white dark:bg-[#1A1A1A]
            border border-gray-200 dark:border-[#333333]
            rounded-sm
            shadow-lg
            z-dropdown
            py-1
          "
          role="menu"
          aria-orientation="vertical"
        >
          {shareOptions.map((option) => {
            if (option.href) {
              return (
                <a
                  key={option.id}
                  href={option.href}
                  target={option.external ? '_blank' : undefined}
                  rel={option.external ? 'noopener noreferrer' : undefined}
                  className="
                    flex items-center gap-3
                    w-full px-4 py-2
                    text-sm text-gray-700 dark:text-[#C0C0C0]
                    hover:bg-gray-50 dark:hover:bg-white/5
                    transition-colors
                  "
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {option.icon}
                  {option.label}
                </a>
              )
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={option.onClick}
                className="
                  flex items-center gap-3
                  w-full px-4 py-2
                  text-sm text-gray-700
                  hover:bg-gray-50
                  transition-colors
                  text-left
                "
                role="menuitem"
              >
                {option.icon}
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
