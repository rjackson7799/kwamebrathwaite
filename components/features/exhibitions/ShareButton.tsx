'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { shareContent, copyToClipboard } from '@/lib/share'
import type { MapExhibition } from './types'

interface ShareButtonProps {
  exhibition: MapExhibition
}

export function ShareButton({ exhibition }: ShareButtonProps) {
  const t = useTranslations('exhibitions.map')
  const locale = useLocale()
  const [showToast, setShowToast] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  const localePath = locale === 'en' ? '' : `/${locale}`
  const shareUrl = `${baseUrl}${localePath}/exhibitions/${exhibition.id}`
  const shareText = `${exhibition.title}${exhibition.venue ? ` at ${exhibition.venue}` : ''}`

  const handleShare = async () => {
    const success = await shareContent({
      title: exhibition.title,
      text: shareText,
      url: shareUrl,
    })

    // Show toast for clipboard copy (non-native share)
    if (success && typeof navigator !== 'undefined' && !navigator.share) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    }
  }

  return (
    <div className="relative flex-1">
      <button
        onClick={handleShare}
        className="w-full p-2 border border-gray-300 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition-colors flex items-center justify-center text-sm"
        title={t('share')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
        </svg>
        <span className="sr-only">{t('share')}</span>
      </button>

      {/* Toast notification */}
      {showToast && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
          Link copied!
        </div>
      )}
    </div>
  )
}
