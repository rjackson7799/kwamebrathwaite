'use client'

import { useState, FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'alreadySubscribed' | 'error' | 'rateLimited'>('idle')

  const locale = useLocale()
  const t = useTranslations('footer')

  const getLocalizedHref = (href: string) => {
    return locale === 'en' ? href : `/${locale}${href}`
  }

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || isSubmitting) return

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const honeypot = (document.getElementById('footer-website') as HTMLInputElement)?.value || ''
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale, website: honeypot }),
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
    <footer className="bg-black text-white py-8">
      <div className="max-w-container mx-auto px-6 md:px-12">
        {/* Newsletter Section — simplified styling */}
        <div className="mb-6">
          <label
            htmlFor="footer-email"
            className="block mb-3 text-[11px] uppercase tracking-[0.12em] text-white/65"
          >
            Subscribe to updates
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
              className="flex-1 px-4 py-2.5 bg-transparent border border-white/20
                         text-white/90 text-sm placeholder:text-white/45
                         focus:outline-none focus:border-white/40
                         transition-colors"
            />
            {/* Honeypot field for spam protection */}
            <input
              type="text"
              name="website"
              id="footer-website"
              tabIndex={-1}
              autoComplete="off"
              style={{ display: 'none' }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-[11px] uppercase tracking-[0.1em]
                         bg-white/12 text-white/85 border border-white/20
                         hover:bg-white/18 hover:text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         sm:w-auto w-full"
            >
              {t('newsletter.subscribe')}
            </button>
          </form>
          {submitStatus === 'success' && (
            <p role="status" className="mt-2 text-[11px] tracking-[0.05em] text-green-400/70">
              {t('newsletter.success')}
            </p>
          )}
          {submitStatus === 'alreadySubscribed' && (
            <p role="status" className="mt-2 text-[11px] tracking-[0.05em] text-white/40">
              {t('newsletter.alreadySubscribed')}
            </p>
          )}
          {submitStatus === 'error' && (
            <p role="alert" className="mt-2 text-[11px] tracking-[0.05em] text-red-400/70">
              {t('newsletter.error')}
            </p>
          )}
          {submitStatus === 'rateLimited' && (
            <p role="alert" className="mt-2 text-[11px] tracking-[0.05em] text-red-400/70">
              {t('newsletter.rateLimited')}
            </p>
          )}
        </div>

        {/* Minimal copyright + links */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/55">
            &copy; {currentYear} Kwame Brathwaite Archive
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.1em] text-white/50">
              {/* Founders Circle link temporarily removed while /founders is unpublished.
                  Restore this <Link href="/founders"> when the page goes live again. */}
              <Link
                href={getLocalizedHref('/privacy')}
                className="hover:text-white/80 transition-colors"
              >
                {t('links.privacy')}
              </Link>
              <Link
                href={getLocalizedHref('/terms')}
                className="hover:text-white/80 transition-colors"
              >
                {t('links.terms')}
              </Link>
              <Link
                href={getLocalizedHref('/licensing')}
                className="hover:text-white/80 transition-colors"
              >
                {t('links.licensing')}
              </Link>
              <a
                href="https://instagram.com/kwamebrathwaitearchive"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/80 transition-colors"
              >
                Instagram
              </a>
            </div>

            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-white/55">
              <span>Theme</span>
              <ThemeToggle variant="inverse" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
