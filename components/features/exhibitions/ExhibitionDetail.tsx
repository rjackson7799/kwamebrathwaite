'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

export interface DetailedExhibition {
  id: string
  slug: string
  title: string
  venue: string | null
  street_address: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  image_url: string | null
  exhibition_type: 'past' | 'current' | 'upcoming'
  /** What kind of entry this is. Defaults to 'exhibition' for all existing rows. */
  entry_kind?: 'exhibition' | 'screening' | 'talk' | 'event' | null
  venue_url: string | null
  venue_description: string | null
  exhibition_url: string | null
  location_lat: number | null
  location_lng: number | null
  meta_title: string | null
  meta_description: string | null
}

interface ExhibitionDetailProps {
  exhibition: DetailedExhibition
}

export function ExhibitionDetail({ exhibition }: ExhibitionDetailProps) {
  const locale = useLocale()
  const t = useTranslations('exhibitions')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Status badge styles per DESIGN_SYSTEM.md
  const statusStyles: Record<string, string> = {
    current: 'bg-gold dark:bg-[#C9A870] text-white dark:text-[#121212]',
    upcoming: 'bg-charcoal text-white',
    past: 'bg-gray-light dark:bg-[#2A2A2A] text-gray-warm dark:text-[#A0A0A0]',
  }

  // Kind badge — a SEPARATE lookup from statusStyles above, matching
  // ExhibitionCard. exhibition_type is temporal; entry_kind is what the entry
  // is. A screening is also past or upcoming, so these cannot be one key.
  const entryKindStyles: Record<string, string> = {
    screening: 'bg-white/90 dark:bg-[#2A2A2A] text-charcoal dark:text-[#D8D8D8]',
    talk: 'bg-white/90 dark:bg-[#2A2A2A] text-charcoal dark:text-[#D8D8D8]',
    event: 'bg-white/90 dark:bg-[#2A2A2A] text-charcoal dark:text-[#D8D8D8]',
  }

  const entryKind = exhibition.entry_kind ?? 'exhibition'
  // 'exhibition' is the default for every existing row, so it gets no badge —
  // the badge marks the exceptions.
  const showKindBadge = entryKind !== 'exhibition' && entryKind in entryKindStyles

  // Format date range with locale-aware formatting
  const formatDateRange = () => {
    if (!exhibition.start_date) return null

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const start = dateFormatter.format(new Date(exhibition.start_date))
    if (!exhibition.end_date) return start

    const end = dateFormatter.format(new Date(exhibition.end_date))
    return `${start} – ${end}`
  }

  return (
    <div>
      {/* Hero Image */}
      <div className="relative w-full aspect-video overflow-hidden bg-gray-light dark:bg-[#2A2A2A] mb-6">
        {!exhibition.image_url || hasError ? (
          <ImagePlaceholder aspectRatio="16:9" showIcon />
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0">
                <ImagePlaceholder aspectRatio="16:9" />
              </div>
            )}
            <Image
              src={exhibition.image_url}
              alt={exhibition.title}
              fill
              sizes="(max-width: 768px) 100vw, 62vw"
              className={`object-cover transition-opacity duration-slow ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              priority
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setHasError(true) }}
            />
          </>
        )}

        {/* Status + kind badges — overlaid on image */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span
            className={`px-3 py-1.5 text-caption font-medium rounded-sm ${statusStyles[exhibition.exhibition_type]}`}
          >
            {t(`status.${exhibition.exhibition_type}`)}
          </span>
          {showKindBadge && (
            <span
              className={`px-3 py-1.5 text-caption font-medium rounded-sm ${entryKindStyles[entryKind]}`}
            >
              {t(`entryKind.${entryKind}`)}
            </span>
          )}
        </div>
      </div>

      {/* Venue Name - Museum Style */}
      {exhibition.venue && (
        <div className="section-title-museum mb-2">
          {exhibition.venue}
        </div>
      )}

      {/* Exhibition Title */}
      <h1 className="page-title-museum mb-2">
        {exhibition.title}
      </h1>

      {/* Date Range */}
      {formatDateRange() && (
        <div className="text-[13px] text-gold dark:text-[#C9A870] tracking-[0.08em] uppercase mb-8">
          {formatDateRange()}
        </div>
      )}

      {/* Description */}
      {exhibition.description && (
        <div>
          <div className="section-divider mb-8" />
          <h2 className="section-title-museum mb-4">
            {/* Kind-aware: "About This Screening" reads correctly where the
                generic heading would not. Nav/back copy stays generic. */}
            {t(`detail.about.${entryKind}`)}
          </h2>
          <div
            className="prose prose-lg dark:prose-invert max-w-none text-gray-body dark:text-[#C0C0C0] leading-[1.8]"
            dangerouslySetInnerHTML={{ __html: exhibition.description }}
          />
        </div>
      )}
    </div>
  )
}
