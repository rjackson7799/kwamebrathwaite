'use client'

import { useState, FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

export function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'alreadySubscribed' | 'error' | 'rateLimited'>('idle')

  const locale = useLocale()
  const t = useTranslations('footer')

  // Generate locale-aware href
  const getLocalizedHref = (href: string) => {
    return locale === 'en' ? href : `/${locale}${href}`
  }

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || isSubmitting) return

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      })

      if (response.status === 429) {
        setSubmitStatus('rateLimited')
        return
      }

      if (response.ok) {
        const data = await response.json()
        if (data.data?.alreadySubscribed) {
          setSubmitStatus('alreadySubscribed')
        } else {
          setSubmitStatus('success')
        }
        setEmail('')
      } else {
        setSubmitStatus('error')
      }
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-black text-white py-12 md:py-16">
      <div className="max-w-container mx-auto px-6 md:px-12">
        {/* Newsletter Section */}
        <div className="mb-8">
          <label
            htmlFor="footer-email"
            className="block mb-3 text-body-sm text-white/80"
          >
            Subscribe to updates:
          </label>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              required
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20
                         text-white placeholder:text-white/40
                         focus:outline-none focus:border-white/40
                         transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-white text-black
                         hover:bg-white/90 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-body-sm font-medium sm:w-auto w-full"
            >
              {t('newsletter.subscribe')}
            </button>
          </form>
          {submitStatus === 'success' && (
            <p role="status" className="mt-3 text-body-sm text-green-400">
              {t('newsletter.success')}
            </p>
          )}
          {submitStatus === 'alreadySubscribed' && (
            <p role="status" className="mt-3 text-body-sm text-white/60">
              {t('newsletter.alreadySubscribed')}
            </p>
          )}
          {submitStatus === 'error' && (
            <p role="alert" className="mt-3 text-body-sm text-red-400">
              {t('newsletter.error')}
            </p>
          )}
          {submitStatus === 'rateLimited' && (
            <p role="alert" className="mt-3 text-body-sm text-red-400">
              {t('newsletter.rateLimited')}
            </p>
          )}
        </div>

        {/* Links & Copyright */}
        <div className="border-t border-white/10 pt-8 space-y-4">
          {/* Links Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4
                          text-sm text-white/60">
            <a
              href="https://instagram.com/kwamebrathwaitearchive"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Instagram
            </a>
            <span className="text-white/30 hidden sm:inline">·</span>
            <Link
              href={getLocalizedHref('/privacy')}
              className="hover:text-white transition-colors"
            >
              {t('links.privacy')}
            </Link>
            <span className="text-white/30 hidden sm:inline">·</span>
            <Link
              href={getLocalizedHref('/terms')}
              className="hover:text-white transition-colors"
            >
              {t('links.terms')}
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-white/40">
            © {currentYear} Kwame Brathwaite Archive
          </p>
        </div>
      </div>
    </footer>
  )
}
