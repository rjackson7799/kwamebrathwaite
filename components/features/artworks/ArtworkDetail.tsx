'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Lightbox, type LightboxImage } from '@/components/ui/Lightbox'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { ViewOnWallModal } from '@/components/ui/ViewOnWallModal'
import { ShareButton } from './ShareButton'
import { ArtworkInquiryModal } from './ArtworkInquiryModal'
import type { Artwork, ArtworkLiterature } from '@/lib/supabase/types'

export interface DetailedArtwork {
  id: string
  title: string
  year: number | null
  medium: string | null
  dimensions: string | null
  dimensions_cm?: string | null
  description: string | null
  image_url: string
  image_thumbnail_url: string | null
  category: string | null
  series: string | null
  edition?: string | null
  archive_reference?: string | null
  availability_status: 'available' | 'sold' | 'on_loan' | 'not_for_sale' | 'inquiry_only'
  is_featured: boolean
  related_artwork_ids: string[]
  meta_title: string | null
  meta_description: string | null
}

interface RelatedArtwork {
  id: string
  title: string
  year: number | null
  image_url: string
  image_thumbnail_url: string | null
}

interface ArtworkDetailProps {
  artwork: DetailedArtwork | Artwork
  literature?: ArtworkLiterature[]
  relatedArtworks?: RelatedArtwork[]
}

export function ArtworkDetail({ artwork, literature = [], relatedArtworks = [] }: ArtworkDetailProps) {
  const locale = useLocale()
  const t = useTranslations('works')
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isViewOnWallOpen, setIsViewOnWallOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const galleryHref = locale === 'en' ? '/works' : `/${locale}/works`
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kwamebrathwaite.com'
  const artworkUrl = `${baseUrl}${locale === 'en' ? '' : `/${locale}`}/works/${artwork.id}`

  const availabilityColors: Record<string, string> = {
    available: 'bg-success/10 text-success',
    sold: 'bg-error/10 text-error',
    on_loan: 'bg-info/10 text-info',
    not_for_sale: 'bg-gray-light text-gray-warm',
    inquiry_only: 'bg-gold/10 text-gold',
  }

  const lightboxImages: LightboxImage[] = [
    {
      id: artwork.id,
      src: artwork.image_url,
      alt: artwork.title,
      title: artwork.title,
      caption: artwork.year ? `${artwork.year}` : undefined,
    },
  ]

  // Helper to format dimensions with cm
  const formatDimensions = () => {
    if (!artwork.dimensions) return null
    const dimensionsCm = 'dimensions_cm' in artwork ? artwork.dimensions_cm : null
    if (dimensionsCm) {
      return `${artwork.dimensions} (${dimensionsCm})`
    }
    return artwork.dimensions
  }

  return (
    <>
      <article className="container-page section-spacing">
        {/* Top Bar: Back to Gallery + Share */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={galleryHref}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors duration-fast"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t('detail.backToGallery')}
          </Link>

          <ShareButton
            url={artworkUrl}
            title={artwork.title}
            description={artwork.description || undefined}
          />
        </div>

        {/* Main Content: 60/40 split on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16">
          {/* Left Column: Hero Image */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="relative w-full aspect-[4/5] overflow-hidden bg-gray-light cursor-zoom-in group"
              aria-label={t('detail.viewFullSize')}
            >
              {hasError ? (
                <ImagePlaceholder aspectRatio="4:5" showIcon />
              ) : (
                <>
                  {isLoading && (
                    <div className="absolute inset-0">
                      <ImagePlaceholder aspectRatio="4:5" />
                    </div>
                  )}
                  <Image
                    src={artwork.image_url}
                    alt={artwork.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className={`
                      object-contain
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
                </>
              )}

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

            {/* Action Buttons under image */}
            <div className="flex gap-3 mt-4">
              {/* View on Wall Button - only show if dimensions available */}
              {artwork.dimensions && (
                <button
                  type="button"
                  onClick={() => setIsViewOnWallOpen(true)}
                  className="
                    flex-1
                    inline-flex items-center justify-center gap-2
                    px-4 py-3
                    text-[11px] font-medium uppercase tracking-[0.08em]
                    text-black
                    border border-black
                    rounded-sm
                    transition-all duration-fast
                    hover:bg-black hover:text-white
                  "
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t('detail.viewOnWall')}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col">
            {/* Availability Badge */}
            {artwork.availability_status && (
              <span
                className={`
                  inline-block self-start
                  px-3 py-1.5
                  text-[11px]
                  font-medium
                  uppercase
                  tracking-[0.05em]
                  rounded-sm
                  mb-4
                  ${availabilityColors[artwork.availability_status]}
                `}
              >
                {t(`availability.${artwork.availability_status}`)}
              </span>
            )}

            {/* Title - Using TYPOGRAPHY_SYSTEM.md: 18px, regular, tracking-wide */}
            <h1 className="text-lg font-normal tracking-wide text-gray-900 mb-6">
              {artwork.title}
            </h1>

            {/* Metadata - Using TYPOGRAPHY_SYSTEM.md specs */}
            <dl className="space-y-4 mb-8">
              {artwork.year && (
                <div>
                  <dt className="text-[11px] font-normal uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {t('detail.year')}
                  </dt>
                  <dd className="text-sm font-normal text-gray-700">{artwork.year}</dd>
                </div>
              )}
              {artwork.medium && (
                <div>
                  <dt className="text-[11px] font-normal uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {t('detail.medium')}
                  </dt>
                  <dd className="text-sm font-normal text-gray-700">{artwork.medium}</dd>
                </div>
              )}
              {formatDimensions() && (
                <div>
                  <dt className="text-[11px] font-normal uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {t('detail.dimensions')}
                  </dt>
                  <dd className="text-sm font-normal text-gray-700">{formatDimensions()}</dd>
                </div>
              )}
              {artwork.series && (
                <div>
                  <dt className="text-[11px] font-normal uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {t('detail.series')}
                  </dt>
                  <dd className="text-sm font-normal text-gray-700">{artwork.series}</dd>
                </div>
              )}
              {'edition' in artwork && artwork.edition && (
                <div>
                  <dt className="text-[11px] font-normal uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {t('detail.edition')}
                  </dt>
                  <dd className="text-sm font-normal text-gray-700">{artwork.edition}</dd>
                </div>
              )}
              {'archive_reference' in artwork && artwork.archive_reference && (
                <div>
                  <dt className="text-[11px] font-normal uppercase tracking-[0.08em] text-gray-400 mb-1">
                    {t('detail.archiveReference')}
                  </dt>
                  <dd className="text-xs font-normal font-mono text-gray-500 tracking-wide">
                    {artwork.archive_reference}
                  </dd>
                </div>
              )}
            </dl>

            {/* Description */}
            {artwork.description && (
              <div className="mb-8">
                <p className="text-sm font-normal leading-relaxed text-gray-700 max-w-[500px]">
                  {artwork.description}
                </p>
              </div>
            )}

            {/* Literature Citations */}
            {literature.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-3">
                  {t('detail.literature')}
                </h3>
                <ul className="space-y-2">
                  {literature.map((item) => (
                    <li key={item.id} className="text-xs text-gray-600 italic">
                      {item.citation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inquire Button */}
            <button
              type="button"
              onClick={() => setIsInquiryOpen(true)}
              className="btn-primary w-full text-center mt-auto"
            >
              {t('inquire')}
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox */}
      <Lightbox
        images={lightboxImages}
        currentIndex={0}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={() => {}}
        showInfo={true}
      />

      {/* Inquiry Modal */}
      <ArtworkInquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        artwork={{
          id: artwork.id,
          title: artwork.title,
          year: artwork.year,
          medium: artwork.medium,
          image_url: artwork.image_url,
          image_thumbnail_url: artwork.image_thumbnail_url,
        }}
      />

      {/* View on Wall Modal */}
      {artwork.dimensions && (
        <ViewOnWallModal
          artwork={{
            id: artwork.id,
            title: artwork.title,
            image_url: artwork.image_url,
            dimensions: artwork.dimensions,
          }}
          isOpen={isViewOnWallOpen}
          onClose={() => setIsViewOnWallOpen(false)}
        />
      )}
    </>
  )
}
