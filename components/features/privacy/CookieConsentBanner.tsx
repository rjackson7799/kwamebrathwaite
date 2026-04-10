'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider'

const DISMISSED_STORAGE_KEY = 'kb-cookie-banner-dismissed'

/**
 * Slim fixed banner anchored above the footer. Discloses that the site loads
 * Google Maps by default and lets the visitor dismiss or block it. Hidden once
 * dismissed (persisted in localStorage) or once the visitor has revoked maps.
 */
export function CookieConsentBanner() {
  const t = useTranslations('cookieBanner')
  const { consentGranted, revokeConsent } = useGoogleMaps()
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setMounted(true)
    try {
      setDismissed(localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true')
    } catch {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, 'true')
    } catch {}
    setDismissed(true)
  }

  const handleBlock = () => {
    revokeConsent()
    handleDismiss()
  }

  if (!mounted || dismissed || !consentGranted) return null

  return (
    <div
      role="region"
      aria-label={t('ariaLabel')}
      className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 dark:bg-[#0A0A0A]/95 text-white border-t border-[#333] backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <p className="text-xs md:text-sm text-[#E0E0E0] leading-relaxed md:pr-6">
          {t('message')}{' '}
          <a
            href="/privacy#cookies"
            className="underline hover:opacity-80 text-white"
          >
            {t('learnMore')}
          </a>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleBlock}
            className="px-4 py-2 border border-[#555] text-[#E0E0E0] text-[11px] uppercase tracking-[0.12em] hover:border-white hover:text-white transition-colors duration-fast"
          >
            {t('block')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 bg-white text-black text-[11px] uppercase tracking-[0.12em] hover:opacity-80 transition-opacity duration-fast"
          >
            {t('dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
