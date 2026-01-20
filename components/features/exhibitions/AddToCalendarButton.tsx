'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { downloadICS } from '@/lib/calendar'
import type { MapExhibition } from './types'

interface AddToCalendarButtonProps {
  exhibition: MapExhibition
}

export function AddToCalendarButton({ exhibition }: AddToCalendarButtonProps) {
  const t = useTranslations('exhibitions.map')
  const locale = useLocale()
  const [showToast, setShowToast] = useState(false)

  const handleAddToCalendar = () => {
    if (!exhibition.start_date || !exhibition.end_date) {
      console.error('Missing exhibition dates')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const localePath = locale === 'en' ? '' : `/${locale}`
    const exhibitionUrl = `${baseUrl}${localePath}/exhibitions/${exhibition.id}`

    try {
      downloadICS({
        id: exhibition.id,
        title: exhibition.title,
        description: `Exhibition at ${exhibition.venue || 'venue'}${
          exhibition.city ? `, ${exhibition.city}` : ''
        }${exhibition.country ? `, ${exhibition.country}` : ''}\n\nMore info: ${exhibitionUrl}`,
        location: [exhibition.venue, exhibition.city, exhibition.country]
          .filter(Boolean)
          .join(', '),
        startDate: exhibition.start_date,
        endDate: exhibition.end_date,
        url: exhibitionUrl,
      })

      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    } catch (error) {
      console.error('Calendar error:', error)
    }
  }

  return (
    <div className="relative flex-1">
      <button
        onClick={handleAddToCalendar}
        disabled={!exhibition.start_date || !exhibition.end_date}
        className="w-full p-2 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('addToCalendar')}
      >
        <span aria-hidden="true">📅</span>
        <span className="sr-only">{t('addToCalendar')}</span>
      </button>

      {/* Toast notification */}
      {showToast && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
          Calendar event downloaded!
        </div>
      )}
    </div>
  )
}
