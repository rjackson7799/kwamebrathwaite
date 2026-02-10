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
        <span aria-hidden="true">📤</span>
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
