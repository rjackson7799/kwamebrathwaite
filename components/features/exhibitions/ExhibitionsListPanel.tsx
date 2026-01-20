'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useRef, useEffect } from 'react'
import type { MapExhibition } from './types'
import { STATUS_CONFIG } from './types'

interface ExhibitionsListPanelProps {
  exhibitions: MapExhibition[]
  selectedExhibition: MapExhibition | null
  onExhibitionSelect: (exhibition: MapExhibition) => void
  isLoading?: boolean
}

export function ExhibitionsListPanel({
  exhibitions,
  selectedExhibition,
  onExhibitionSelect,
  isLoading = false,
}: ExhibitionsListPanelProps) {
  const t = useTranslations('exhibitions')
  const locale = useLocale()
  const listRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLDivElement>(null)

  // Scroll to selected item when it changes
  useEffect(() => {
    if (selectedExhibition && selectedItemRef.current && listRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedExhibition])

  // Format date range
  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return ''

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }

    const start = new Date(startDate).toLocaleDateString(locale, options)
    const end = new Date(endDate).toLocaleDateString(locale, options)

    return `${start} — ${end}`
  }

  if (isLoading) {
    return (
      <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/2] bg-gray-200 rounded mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-medium text-gray-900">
          {exhibitions.length} {exhibitions.length === 1 ? 'Exhibition' : 'Exhibitions'}
        </h3>
      </div>

      {/* List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        role="list"
        aria-label="Exhibitions list"
      >
        {exhibitions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>{t('map.noExhibitions')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {exhibitions.map((exhibition) => {
              const isSelected = selectedExhibition?.id === exhibition.id
              const status = STATUS_CONFIG[exhibition.exhibition_type]

              return (
                <div
                  key={exhibition.id}
                  ref={isSelected ? selectedItemRef : undefined}
                  onClick={() => onExhibitionSelect(exhibition)}
                  className={`
                    p-4 cursor-pointer transition-colors
                    ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}
                  `}
                  role="listitem"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onExhibitionSelect(exhibition)
                    }
                  }}
                >
                  {/* Image */}
                  {exhibition.image_url && (
                    <div className="relative aspect-[3/2] rounded overflow-hidden mb-3">
                      <Image
                        src={exhibition.image_url}
                        fill
                        className="object-cover"
                        alt={exhibition.title}
                        sizes="(max-width: 450px) 100vw, 400px"
                      />
                      {/* Status Badge Overlay */}
                      <div
                        className={`
                          absolute top-2 left-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wider
                          ${status.bgColor} ${status.color}
                        `}
                      >
                        {status.label}
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {exhibition.title}
                  </h4>

                  {/* Venue */}
                  {exhibition.venue && (
                    <p className="text-sm text-gray-600 mb-1">{exhibition.venue}</p>
                  )}

                  {/* Location */}
                  {(exhibition.city || exhibition.country) && (
                    <p className="text-sm text-gray-500 mb-2">
                      {[exhibition.city, exhibition.country].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {/* Dates */}
                  {formatDateRange(exhibition.start_date, exhibition.end_date) && (
                    <p className="text-xs text-gray-400">
                      {formatDateRange(exhibition.start_date, exhibition.end_date)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
