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
  // Kind labels live one level up, alongside the temporal status labels.
  const tExhibitions = useTranslations('exhibitions')
  const locale = useLocale()
  const [showToast, setShowToast] = useState(false)

  const handleAddToCalendar = () => {
    // Only start_date is required. Single-day entries — most screenings and
    // talks — carry no end_date, and requiring one left this button
    // permanently disabled for every one of them.
    if (!exhibition.start_date) {
      console.error('Missing exhibition start date')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const localePath = locale === 'en' ? '' : `/${locale}`
    const exhibitionUrl = `${baseUrl}${localePath}/exhibitions/${exhibition.id}`

    try {
      downloadICS({
        id: exhibition.id,
        title: exhibition.title,
        // Was a hard-coded English "Exhibition at …" — untranslated, and wrong
        // for a screening or a talk. Both now come from the message files.
        description: t('calendarDescription', {
          kind: tExhibitions(`entryKind.${exhibition.entry_kind ?? 'exhibition'}`),
          location:
            [exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(', ') ||
            t('calendarLocationFallback'),
          url: exhibitionUrl,
        }),
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
        disabled={!exhibition.start_date}
        className="w-full p-2 border border-gray-300 dark:border-[#333333] hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition-colors flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('addToCalendar')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
        <span className="sr-only">{t('addToCalendar')}</span>
      </button>

      {/* Toast notification */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded whitespace-nowrap"
        >
          {t('calendarDownloaded')}
        </div>
      )}
    </div>
  )
}
