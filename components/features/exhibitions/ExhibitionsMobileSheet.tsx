'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import type { MapExhibition } from './types'
import { STATUS_CONFIG } from './types'

interface ExhibitionsMobileSheetProps {
  exhibitions: MapExhibition[]
  selectedExhibition: MapExhibition | null
  onExhibitionSelect: (exhibition: MapExhibition) => void
  isLoading?: boolean
}

// Sheet height states (percentage of viewport)
const COLLAPSED_HEIGHT = 30 // 30% of viewport
const EXPANDED_HEIGHT = 85 // 85% of viewport
const DRAG_THRESHOLD = 50 // pixels to trigger expand/collapse

export function ExhibitionsMobileSheet({
  exhibitions,
  selectedExhibition,
  onExhibitionSelect,
  isLoading = false,
}: ExhibitionsMobileSheetProps) {
  const t = useTranslations('exhibitions')
  const locale = useLocale()
  const [isExpanded, setIsExpanded] = useState(false)
  const [dragStartY, setDragStartY] = useState<number | null>(null)
  const [currentDragOffset, setCurrentDragOffset] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Auto-expand when an exhibition is selected
  useEffect(() => {
    if (selectedExhibition) {
      setIsExpanded(true)
    }
  }, [selectedExhibition])

  // Handle touch events for drag gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY)
    setCurrentDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return

    const currentY = e.touches[0].clientY
    const delta = dragStartY - currentY // Positive = dragging up

    setCurrentDragOffset(delta)
  }

  const handleTouchEnd = () => {
    if (dragStartY === null) return

    // Determine if we should expand or collapse based on drag direction and threshold
    if (currentDragOffset > DRAG_THRESHOLD) {
      setIsExpanded(true)
    } else if (currentDragOffset < -DRAG_THRESHOLD) {
      setIsExpanded(false)
    }

    setDragStartY(null)
    setCurrentDragOffset(0)
  }

  // Format date range
  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return ''

    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    }

    const start = new Date(startDate).toLocaleDateString(locale, options)
    const end = new Date(endDate).toLocaleDateString(locale, options)

    return `${start} — ${end}`
  }

  const sheetHeight = isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT

  return (
    <div
      ref={sheetRef}
      className={`
        absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]
        transition-all duration-300 ease-out
      `}
      style={{
        height: `${sheetHeight}vh`,
        transform: `translateY(${currentDragOffset > 0 ? Math.min(-currentDragOffset * 0.5, 0) : Math.max(-currentDragOffset * 0.3, 0)}px)`,
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-4 pb-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <>
              {exhibitions.length} {exhibitions.length === 1 ? 'Exhibition' : 'Exhibitions'}
            </>
          )}
        </p>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ height: `calc(${sheetHeight}vh - 60px)` }}>
        {isLoading ? (
          // Loading skeleton
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : exhibitions.length === 0 ? (
          // Empty state
          <div className="p-8 text-center text-gray-500">
            <p>{t('map.noExhibitions')}</p>
          </div>
        ) : (
          // Exhibition list
          <div className="divide-y divide-gray-100">
            {exhibitions.map((exhibition) => {
              const isSelected = selectedExhibition?.id === exhibition.id
              const status = STATUS_CONFIG[exhibition.exhibition_type]

              return (
                <div
                  key={exhibition.id}
                  onClick={() => onExhibitionSelect(exhibition)}
                  className={`
                    flex gap-3 p-4 cursor-pointer transition-colors
                    ${isSelected ? 'bg-gray-100' : 'active:bg-gray-50'}
                  `}
                >
                  {/* Thumbnail */}
                  {exhibition.image_url && (
                    <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={exhibition.image_url}
                        fill
                        className="object-cover"
                        alt={exhibition.title}
                        sizes="80px"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Status */}
                    <span
                      className={`
                        inline-block text-[10px] font-medium uppercase tracking-wider mb-1
                        ${status.color}
                      `}
                    >
                      {status.label}
                    </span>

                    {/* Title */}
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                      {exhibition.title}
                    </h4>

                    {/* Venue */}
                    {exhibition.venue && (
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {exhibition.venue}
                      </p>
                    )}

                    {/* Location + Dates */}
                    <p className="text-xs text-gray-400 mt-1">
                      {[exhibition.city, exhibition.country].filter(Boolean).join(', ')}
                      {formatDateRange(exhibition.start_date, exhibition.end_date) && (
                        <> · {formatDateRange(exhibition.start_date, exhibition.end_date)}</>
                      )}
                    </p>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-black rounded-full" />
                    </div>
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
