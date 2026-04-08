'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { useState } from 'react'

export interface Exhibition {
  id: string
  slug: string
  title: string
  venue?: string | null
  city?: string | null
  country?: string | null
  start_date?: string | null
  end_date?: string | null
  image_url?: string | null
  thumbnail_image_url?: string | null
  exhibition_type: 'past' | 'current' | 'upcoming'
}

interface ExhibitionCardProps {
  /** Exhibition data */
  exhibition: Exhibition
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Color treatment for card text */
  tone?: 'default' | 'inverse'
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
  tone = 'default',
  showStatus = true,
  priority = false,
  className = '',
}: ExhibitionCardProps) {
  const locale = useLocale()
  const t = useTranslations('exhibitions')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const href = locale === 'en'
    ? `/exhibitions/${exhibition.slug}`
    : `/${locale}/exhibitions/${exhibition.slug}`

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
    current: 'bg-gold dark:bg-[#C9A870] text-white dark:text-[#121212] shadow-sm',
    upcoming: 'bg-charcoal text-white',
    past: 'bg-gray-light dark:bg-[#2A2A2A] text-gray-warm dark:text-[#A0A0A0]',
  }

  const statusLabels: Record<string, string> = {
    current: t('status.current'),
    upcoming: t('status.upcoming'),
    past: t('status.past'),
  }

  const isHorizontal = orientation === 'horizontal'
  const isInverse = tone === 'inverse'

  // Add gold accent for current exhibitions
  const isCurrent = exhibition.exhibition_type === 'current'

  const imageUrl = exhibition.thumbnail_image_url || exhibition.image_url

  if (isHorizontal) {
    return (
      <Link href={href} className={`group block ${className}`}>
        <article
          className={`
            card-bordered rounded-sm overflow-hidden flex gap-6
            ${isCurrent ? 'border-l-2 border-l-gold' : ''}
          `}
        >
          {/* Image */}
          <div className="relative w-2/5 flex-shrink-0 aspect-[3/4] overflow-hidden bg-gray-light dark:bg-[#2A2A2A]">
            {!imageUrl || hasError ? (
              <ImagePlaceholder aspectRatio="4:3" showIcon />
            ) : (
              <>
                {isLoading && <div className="absolute inset-0"><ImagePlaceholder aspectRatio="4:3" /></div>}
                <Image
                  src={imageUrl}
                  alt={exhibition.title}
                  fill
                  sizes="40vw"
                  className={`object-cover transition-all duration-slow group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                  priority={priority}
                  onLoad={() => setIsLoading(false)}
                  onError={() => { setIsLoading(false); setHasError(true) }}
                />
              </>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col justify-center">
            {showStatus && (
              <div className={`self-start inline-block mb-2 px-2 py-0.5 text-caption font-medium rounded-sm ${statusStyles[exhibition.exhibition_type]}`}>
                {statusLabels[exhibition.exhibition_type]}
              </div>
            )}
            <h3 className="text-h4 font-medium text-black dark:text-[#F0F0F0]">{exhibition.title}</h3>
            {formatLocation() && <p className="mt-1 text-body-sm text-gray-warm">{formatLocation()}</p>}
            {formatDateRange() && <p className="mt-1 text-caption text-gray-warm">{formatDateRange()}</p>}
          </div>
        </article>
      </Link>
    )
  }

  // Vertical — museum grid style matching Works/Press pages
  return (
    <Link href={href} className={`group block h-full ${className}`} aria-label={exhibition.title}>
      <article className="h-full">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden mb-4 bg-gray-light dark:bg-[#2A2A2A]">
          {!imageUrl || hasError ? (
            <ImagePlaceholder aspectRatio="1:1" showIcon />
          ) : (
            <>
              {isLoading && <div className="absolute inset-0 bg-gray-light dark:bg-[#2A2A2A]" />}
              <Image
                src={imageUrl}
                alt={exhibition.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-all duration-slow group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                priority={priority}
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setHasError(true) }}
              />
            </>
          )}
        </div>

        {/* Venue */}
        {exhibition.venue && (
          <p className={`text-[8px] uppercase tracking-[0.06em] leading-relaxed ${
            isInverse
              ? 'text-[#A9A39A]'
              : 'text-gray-heading dark:text-[#777777]'
          }`}>
            {exhibition.venue}
          </p>
        )}

        {/* Title */}
        <h3 className={`text-[10px] font-normal uppercase tracking-[0.06em] leading-snug mt-1 ${
          isInverse
            ? 'text-[#D9D2C8]'
            : 'text-gray-body dark:text-[#E0E0E0]'
        }`}>
          {exhibition.title}
        </h3>

        {/* Dates */}
        {formatDateRange() && (
          <p className={`mt-1 text-[8px] uppercase tracking-[0.06em] ${
            isInverse
              ? 'text-[#B8B0A4]'
              : 'text-gray-heading dark:text-[#777777]'
          }`}>
            {formatDateRange()}
          </p>
        )}
      </article>
    </Link>
  )
}
