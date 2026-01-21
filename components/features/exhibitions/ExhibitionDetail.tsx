'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Lightbox, type LightboxImage } from '@/components/ui/Lightbox'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

export interface DetailedExhibition {
  id: string
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
  meta_title: string | null
  meta_description: string | null
}

interface ExhibitionDetailProps {
  exhibition: DetailedExhibition
}

export function ExhibitionDetail({ exhibition }: ExhibitionDetailProps) {
  const locale = useLocale()
  const t = useTranslations('exhibitions')
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const exhibitionsHref = locale === 'en' ? '/exhibitions' : `/${locale}/exhibitions`
  const contactHref = locale === 'en' ? '/contact' : `/${locale}/contact`

  // Status badge styles per DESIGN_SYSTEM.md
  const statusStyles: Record<string, string> = {
    current: 'bg-gold text-white',
    upcoming: 'bg-charcoal text-white',
    past: 'bg-gray-light text-gray-warm',
  }

  // Format date range with locale-aware formatting
  const formatDateRange = () => {
    if (!exhibition.start_date) return null

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const start = dateFormatter.format(new Date(exhibition.start_date))
    if (!exhibition.end_date) return start

    const end = dateFormatter.format(new Date(exhibition.end_date))
    return `${start} – ${end}`
  }

  // Format full location
  const formatLocation = () => {
    const parts = [
      exhibition.city,
      exhibition.state_region,
      exhibition.country,
    ].filter(Boolean)
    return parts.join(', ')
  }

  // Format full address for display
  const formatFullAddress = () => {
    const parts = [
      exhibition.street_address,
      exhibition.city,
      exhibition.state_region,
      exhibition.postal_code,
      exhibition.country,
    ].filter(Boolean)
    return parts.join(', ')
  }

  const lightboxImages: LightboxImage[] = exhibition.image_url
    ? [
        {
          id: exhibition.id,
          src: exhibition.image_url,
          alt: exhibition.title,
          title: exhibition.title,
          caption: formatDateRange() || undefined,
        },
      ]
    : []

  return (
    <>
      <article className="container-page section-spacing">
        {/* Back to Exhibitions Link */}
        <Link
          href={exhibitionsHref}
          className="inline-flex items-center gap-2 text-body text-gray-warm hover:text-black transition-colors duration-fast mb-8"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('detail.backToExhibitions')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Hero Image */}
          <div className="relative">
            {exhibition.image_url && !hasError ? (
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="relative w-full aspect-[4/3] overflow-hidden bg-gray-light cursor-zoom-in group"
                aria-label={t('detail.viewFullSize')}
              >
                {isLoading && (
                  <div className="absolute inset-0">
                    <ImagePlaceholder aspectRatio="4:3" />
                  </div>
                )}
                <Image
                  src={exhibition.image_url}
                  alt={exhibition.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className={`
                    object-cover
                    transition-all
                    duration-slow
                    group-hover:scale-[1.02]
                    ${isLoading ? 'opacity-0' : 'opacity-100'}
                  `}
                  priority
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false)
                    setHasError(true)
                  }}
                />

                {/* Zoom Icon Overlay */}
                <div
                  className="
                    absolute inset-0
                    flex items-center justify-center
                    bg-black/0 group-hover:bg-black/20
                    transition-all duration-slow
                  "
                  aria-hidden="true"
                >
                  <svg
                    className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-slow"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="relative w-full aspect-[4/3]">
                <ImagePlaceholder aspectRatio="4:3" showIcon />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {/* Status Badge */}
            <span
              className={`
                inline-block self-start
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

            {/* Title */}
            <h1 className="text-display-2 font-semibold text-black mb-6">
              {exhibition.title}
            </h1>

            {/* Metadata */}
            <dl className="space-y-3 mb-8">
              {/* Dates */}
              {formatDateRange() && (
                <div className="flex">
                  <dt className="w-28 text-body-sm text-gray-warm flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {t('detail.dates')}
                  </dt>
                  <dd className="text-body-sm text-black">{formatDateRange()}</dd>
                </div>
              )}

              {/* Venue */}
              {exhibition.venue && (
                <div className="flex">
                  <dt className="w-28 text-body-sm text-gray-warm flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    {t('detail.venue')}
                  </dt>
                  <dd className="text-body-sm text-black">{exhibition.venue}</dd>
                </div>
              )}

              {/* Location */}
              {formatLocation() && (
                <div className="flex">
                  <dt className="w-28 text-body-sm text-gray-warm flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {t('detail.location')}
                  </dt>
                  <dd className="text-body-sm text-black">{formatLocation()}</dd>
                </div>
              )}
            </dl>

            {/* Venue Website Link */}
            {exhibition.venue_url && (
              <a
                href={exhibition.venue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center justify-center gap-2 mb-6 self-start"
              >
                {t('detail.visitVenue')}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}

            {/* Description */}
            {exhibition.description && (
              <div className="mb-8">
                <h2 className="text-h3 font-medium text-black mb-4">
                  {t('detail.aboutExhibition')}
                </h2>
                <div
                  className="prose prose-lg max-w-none text-black"
                  dangerouslySetInnerHTML={{ __html: exhibition.description }}
                />
              </div>
            )}

            {/* Inquire Button */}
            <Link
              href={contactHref}
              className="btn-primary inline-block text-center mt-auto"
            >
              {t('detail.inquire')}
            </Link>
          </div>
        </div>
      </article>

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          currentIndex={0}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={() => {}}
          showInfo={true}
        />
      )}
    </>
  )
}
