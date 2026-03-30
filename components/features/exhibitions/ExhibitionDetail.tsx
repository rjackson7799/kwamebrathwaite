'use client'

import { useLocale, useTranslations } from 'next-intl'

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
  venue_url: string | null
  venue_description: string | null
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

  // Status badge styles per DESIGN_SYSTEM.md
  const statusStyles: Record<string, string> = {
    current: 'bg-gold dark:bg-[#C9A870] text-white dark:text-[#121212]',
    upcoming: 'bg-charcoal text-white',
    past: 'bg-gray-light dark:bg-[#2A2A2A] text-gray-warm dark:text-[#A0A0A0]',
  }

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
      {/* Status Badge */}
      <span
        className={`
          inline-block
          px-3 py-1.5
          text-caption
          font-medium
          rounded-sm
          mb-4
          ${statusStyles[exhibition.exhibition_type]}
        `}
      >
        {t(`status.${exhibition.exhibition_type}`)}
      </span>

      {/* Venue Name - Museum Style */}
      {exhibition.venue && (
        <div className="section-title-museum mb-2">
          {exhibition.venue}
        </div>
      )}

      {/* Exhibition Title */}
      <h1 className="font-serif text-[28px] font-light tracking-[0.02em] leading-tight text-black dark:text-[#F0F0F0] mb-2">
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
            {t('detail.aboutExhibition')}
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
