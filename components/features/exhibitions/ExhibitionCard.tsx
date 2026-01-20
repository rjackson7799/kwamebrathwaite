'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { useState } from 'react'

export interface Exhibition {
  id: string
  title: string
  venue?: string | null
  city?: string | null
  country?: string | null
  start_date?: string | null
  end_date?: string | null
  image_url?: string | null
  exhibition_type: 'past' | 'current' | 'upcoming'
}

interface ExhibitionCardProps {
  /** Exhibition data */
  exhibition: Exhibition
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Show status badge */
  showStatus?: boolean
  /** Priority loading */
  priority?: boolean
  /** Custom class names */
  className?: string
}

export function ExhibitionCard({
  exhibition,
  orientation = 'vertical',
  showStatus = true,
  priority = false,
  className = '',
}: ExhibitionCardProps) {
  const locale = useLocale()
  const t = useTranslations('exhibitions')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const href = locale === 'en'
    ? `/exhibitions/${exhibition.id}`
    : `/${locale}/exhibitions/${exhibition.id}`

  // Format date range
  const formatDateRange = () => {
    if (!exhibition.start_date) return null

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    const start = dateFormatter.format(new Date(exhibition.start_date))
    if (!exhibition.end_date) return start

    const end = dateFormatter.format(new Date(exhibition.end_date))
    return `${start} – ${end}`
  }

  // Format location
  const formatLocation = () => {
    const parts = [exhibition.venue, exhibition.city, exhibition.country].filter(Boolean)
    return parts.join(', ')
  }

  const statusStyles: Record<string, string> = {
    current: 'bg-gold text-white shadow-sm',
    upcoming: 'bg-charcoal text-white',
    past: 'bg-gray-light text-gray-warm',
  }

  const statusLabels: Record<string, string> = {
    current: t('status.current'),
    upcoming: t('status.upcoming'),
    past: t('status.past'),
  }

  const isHorizontal = orientation === 'horizontal'

  // Add gold accent for current exhibitions
  const isCurrent = exhibition.exhibition_type === 'current'

  return (
    <Link href={href} className={`group block ${className}`}>
      <article
        className={`
          card-bordered rounded-sm overflow-hidden
          ${isHorizontal ? 'flex gap-6' : ''}
          ${isCurrent ? 'border-l-2 border-l-gold' : ''}
        `}
      >
        {/* Image Container */}
        <div
          className={`
            relative overflow-hidden bg-gray-light
            ${isHorizontal ? 'w-1/3 flex-shrink-0 aspect-[4/3]' : 'aspect-video'}
          `}
        >
          {!exhibition.image_url || hasError ? (
            <ImagePlaceholder aspectRatio={isHorizontal ? '4:3' : '16:9'} showIcon />
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0">
                  <ImagePlaceholder aspectRatio={isHorizontal ? '4:3' : '16:9'} />
                </div>
              )}
              <Image
                src={exhibition.image_url}
                alt={exhibition.title}
                fill
                sizes={isHorizontal ? '33vw' : '(max-width: 768px) 100vw, 50vw'}
                className={`
                  object-cover
                  transition-all
                  duration-slow
                  group-hover:scale-105
                  ${isLoading ? 'opacity-0' : 'opacity-100'}
                `}
                priority={priority}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setHasError(true)
                }}
              />
            </>
          )}

          {/* Status Badge */}
          {showStatus && (
            <div
              className={`
                absolute top-3 left-3
                px-2 py-1
                text-caption
                font-medium
                rounded-sm
                ${statusStyles[exhibition.exhibition_type]}
              `}
            >
              {statusLabels[exhibition.exhibition_type]}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 ${isHorizontal ? 'flex flex-col justify-center' : ''}`}>
          <h3 className="text-h4 font-medium text-black">
            {exhibition.title}
          </h3>

          {formatLocation() && (
            <p className="mt-1 text-body-sm text-gray-warm">
              {formatLocation()}
            </p>
          )}

          {formatDateRange() && (
            <p className="mt-1 text-caption text-gray-warm">
              {formatDateRange()}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}
