'use client'

import { InfoWindow } from '@react-google-maps/api'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import type { MapExhibition } from './types'
import { STATUS_CONFIG } from './types'
import { ReminderModal } from './ReminderModal'
import { ShareButton } from './ShareButton'
import { AddToCalendarButton } from './AddToCalendarButton'

interface MarkerInfoPopupProps {
  exhibition: MapExhibition
  onClose: () => void
}

export function MarkerInfoPopup({ exhibition, onClose }: MarkerInfoPopupProps) {
  const t = useTranslations('exhibitions.map')
  const locale = useLocale()
  const [showReminderModal, setShowReminderModal] = useState(false)

  const status = STATUS_CONFIG[exhibition.exhibition_type]

  // Format date range
  const formatDateRange = () => {
    if (!exhibition.start_date || !exhibition.end_date) return ''

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }

    const start = new Date(exhibition.start_date).toLocaleDateString(locale, options)
    const end = new Date(exhibition.end_date).toLocaleDateString(locale, options)

    return `${start} — ${end}`
  }

  // Google Maps directions URL
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${exhibition.location_lat},${exhibition.location_lng}`

  return (
    <>
      <InfoWindow
        position={{
          lat: exhibition.location_lat,
          lng: exhibition.location_lng,
        }}
        onCloseClick={onClose}
        options={{
          maxWidth: 320,
          pixelOffset: new google.maps.Size(0, -10),
        }}
      >
        <div className="w-72 max-w-full font-sans">
          {/* Exhibition Image */}
          {exhibition.image_url && (
            <div className="relative aspect-[4/3] -mx-2 -mt-2 mb-3 overflow-hidden">
              <Image
                src={exhibition.image_url}
                fill
                className="object-cover"
                alt={exhibition.title}
                sizes="320px"
              />
            </div>
          )}

          {/* Status Badge */}
          <div
            className={`
              inline-block text-[10px] font-medium uppercase tracking-widest mb-2
              ${status.color}
            `}
          >
            {status.label}
          </div>

          {/* Title */}
          <h3 className="text-base font-medium mb-1 text-gray-900 leading-tight">
            {exhibition.title}
          </h3>

          {/* Venue */}
          {exhibition.venue && (
            <p className="text-sm text-gray-600 mb-1">{exhibition.venue}</p>
          )}

          {/* Location */}
          {(exhibition.city || exhibition.country) && (
            <p className="text-sm text-gray-600 mb-2">
              {[exhibition.city, exhibition.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Dates */}
          {formatDateRange() && (
            <p className="text-xs text-gray-500 mb-4">{formatDateRange()}</p>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Primary: View Details */}
            <a
              href={`/${locale === 'en' ? '' : locale + '/'}exhibitions/${exhibition.id}`}
              className="block w-full py-2 px-4 bg-black text-white text-xs uppercase text-center tracking-widest hover:bg-gray-800 transition-colors"
            >
              {t('viewDetails')}
            </a>

            {/* Secondary Actions */}
            <div className="flex gap-2">
              {/* Set Reminder (upcoming only) */}
              {exhibition.exhibition_type === 'upcoming' && (
                <button
                  onClick={() => setShowReminderModal(true)}
                  className="flex-1 p-2 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 text-xs"
                  title={t('setReminder')}
                >
                  <span aria-hidden="true">🔔</span>
                  <span className="sr-only sm:not-sr-only">{t('setReminder')}</span>
                </button>
              )}

              {/* Share */}
              <ShareButton exhibition={exhibition} />

              {/* Add to Calendar */}
              <AddToCalendarButton exhibition={exhibition} />

              {/* Get Directions */}
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 p-2 border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center text-sm"
                title={t('getDirections')}
              >
                <span aria-hidden="true">🧭</span>
                <span className="sr-only">{t('getDirections')}</span>
              </a>
            </div>
          </div>
        </div>
      </InfoWindow>

      {/* Reminder Modal */}
      {showReminderModal && (
        <ReminderModal
          exhibition={exhibition}
          onClose={() => setShowReminderModal(false)}
        />
      )}
    </>
  )
}
