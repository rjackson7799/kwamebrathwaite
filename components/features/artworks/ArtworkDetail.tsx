'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Lightbox, type LightboxImage } from '@/components/ui/Lightbox'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { ViewOnWallModal } from '@/components/ui/ViewOnWallModal'
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
      <article className="container-page py-8 md:py-12 lg:py-16">
        {/* Top Bar: Back to Gallery + Share */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={galleryHref}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-[#A0A0A0] hover:text-black dark:hover:text-[#F0F0F0] transition-colors duration-fast"
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

        </div>

        {/* Main Content: centered two-column layout */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Column: Hero Image */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="relative w-full overflow-hidden cursor-zoom-in group"
              aria-label={t('detail.viewFullSize')}
            >
              {hasError ? (
                <ImagePlaceholder aspectRatio="4:5" showIcon />
              ) : (
                <>
                  {isLoading && (
                    <div className="w-full aspect-[4/5]">
                      <ImagePlaceholder aspectRatio="4:5" />
                    </div>
                  )}
                  <Image
                    src={artwork.image_url}
                    alt={artwork.title}
                    width={0}
                    height={0}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className={`
                      w-auto h-auto max-w-full
                      transition-all
                      duration-slow
                      group-hover:scale-[1.02]
                      ${isLoading ? 'opacity-0 absolute' : 'opacity-100'}
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

            </button>

          </div>

          {/* Right Column: Details — Museum wall label style */}
          <div className="flex flex-col justify-center">
            {/* Title — museum wall label style, Montserrat */}
            <h1 className="font-heading text-sm font-normal uppercase tracking-[0.08em] text-gray-body dark:text-[#E0E0E0] leading-relaxed mb-6">
              {artwork.title}
              {artwork.year && <>, {artwork.year}</>}
            </h1>

            {/* Metadata — stacked without labels, like a museum wall label */}
            <div className="space-y-1.5 mb-8 text-[13px] text-gray-meta dark:text-[#A0A0A0] leading-relaxed">
              {artwork.medium && (
                <p>{artwork.medium}</p>
              )}
              {'archive_reference' in artwork && artwork.archive_reference && (
                <p className="font-mono text-xs tracking-wide text-gray-meta-label dark:text-[#888888]">
                  {artwork.archive_reference}
                </p>
              )}
              {formatDimensions() && (
                <p>{formatDimensions()}</p>
              )}
              {'edition' in artwork && artwork.edition && (
                <p>{artwork.edition}</p>
              )}
            </div>

            {/* Description */}
            {artwork.description && (
              <div className="mb-8">
                <div
                  className="max-w-[500px] text-[13px] leading-[1.8] text-gray-meta dark:text-[#B0B0B0]"
                  dangerouslySetInnerHTML={{ __html: artwork.description }}
                />
              </div>
            )}

            {/* Action Links — text-only CTAs, museum style */}
            <div className="space-y-4 mb-8">
              <button
                type="button"
                onClick={() => setIsInquiryOpen(true)}
                className="cta-museum block"
              >
                {t('inquire')}
              </button>
              <Link
                href={`${locale === 'en' ? '' : `/${locale}`}/licensing/request?artwork=${artwork.id}`}
                className="cta-museum block"
              >
                {t('requestLicense')}
              </Link>
              {artwork.dimensions && (
                <button
                  type="button"
                  onClick={() => setIsViewOnWallOpen(true)}
                  className="cta-museum inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t('detail.viewOnWall')}
                </button>
              )}
            </div>

            {/* Literature Citations */}
            {literature.length > 0 && (
              <div className="mt-auto">
                <h3 className="section-title-museum mb-3">
                  {t('detail.literature')}
                </h3>
                <ul className="space-y-2">
                  {literature.map((item) => (
                    <li key={item.id} className="text-xs text-gray-meta dark:text-[#A0A0A0] italic leading-relaxed">
                      {item.citation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
