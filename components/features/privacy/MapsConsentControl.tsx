'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGoogleMaps } from '@/components/providers/GoogleMapsProvider'

/**
 * Small UI embedded in the privacy policy that lets the visitor see their
 * current Google Maps consent status and grant or revoke it.
 */
export function MapsConsentControl() {
  const t = useTranslations('privacyPolicy.mapsConsentControl')
  const { consentGranted, grantConsent, revokeConsent } = useGoogleMaps()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Avoid SSR/client mismatch — only render after hydration
  if (!mounted) {
    return (
      <div className="my-6 p-5 border border-gray-light dark:border-[#333]">
        <p className="text-sm text-gray-warm dark:text-[#A0A0A0]">{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="my-6 p-5 border border-gray-light dark:border-[#333]">
      <p className="text-sm font-medium text-black dark:text-[#F0F0F0] mb-2">
        {t('heading')}
      </p>
      <p className="text-sm text-gray-warm dark:text-[#A0A0A0] mb-4">
        {consentGranted ? t('statusGranted') : t('statusDenied')}
      </p>
      {consentGranted ? (
        <button
          type="button"
          onClick={revokeConsent}
          className="inline-block px-4 py-2 border border-black dark:border-[#F0F0F0] text-black dark:text-[#F0F0F0] text-xs uppercase tracking-[0.12em] hover:bg-black hover:text-white dark:hover:bg-[#F0F0F0] dark:hover:text-black transition-colors duration-fast"
        >
          {t('revokeButton')}
        </button>
      ) : (
        <button
          type="button"
          onClick={grantConsent}
          className="inline-block px-4 py-2 bg-black text-white dark:bg-[#F0F0F0] dark:text-black text-xs uppercase tracking-[0.12em] hover:opacity-80 transition-opacity duration-fast"
        >
          {t('grantButton')}
        </button>
      )}
    </div>
  )
}
