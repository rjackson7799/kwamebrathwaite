'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { useState } from 'react'

export interface Artwork {
  id: string
  title: string
  year?: number | null
  medium?: string | null
  image_url: string
  image_thumbnail_url?: string | null
  availability_status?: 'available' | 'sold' | 'on_loan' | 'not_for_sale' | 'inquiry_only' | string
}

interface ArtworkCardProps {
  /** Artwork data object */
  artwork: Artwork
  /** Show metadata (year, medium) below title */
  showMetadata?: boolean
  /** Show availability badge */
  showAvailability?: boolean
  /** Click handler for lightbox trigger */
  onClick?: (artwork: Artwork) => void
  /** Priority loading for above-fold images */
  priority?: boolean
  /** Custom class names */
  className?: string
}

export function ArtworkCard({
  artwork,
  showMetadata = false,
  showAvailability = false,
  onClick,
  priority = false,
  className = '',
}: ArtworkCardProps) {
  const locale = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const href = locale === 'en' ? `/works/${artwork.id}` : `/${locale}/works/${artwork.id}`
  const imageSrc = artwork.image_thumbnail_url || artwork.image_url

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault()
      onClick(artwork)
    }
  }

  const availabilityColors: Record<string, string> = {
    available: 'bg-success/10 text-success',
    sold: 'bg-error/10 text-error',
    on_loan: 'bg-info/10 text-info',
    not_for_sale: 'bg-gray-light text-gray-warm',
    inquiry_only: 'bg-gold/10 text-gold',
  }

  const availabilityLabels: Record<string, string> = {
    available: 'Available',
    sold: 'Sold',
    on_loan: 'On Loan',
    not_for_sale: 'Not for Sale',
    inquiry_only: 'Inquiry Only',
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`group block ${className}`}
    >
      <article className="card rounded-sm overflow-hidden">
        {/* Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-light">
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
                src={imageSrc}
                alt={artwork.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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

          {/* Hover Overlay */}
          <div
            className="
              absolute inset-0
              bg-black/0 group-hover:bg-black/50
              transition-all duration-slow
              flex flex-col justify-end
              p-4
              opacity-0 group-hover:opacity-100
            "
            aria-hidden="true"
          >
            <h4 className="text-white font-medium text-body truncate">
              {artwork.title}
            </h4>
            {artwork.year && (
              <p className="text-white/80 text-caption mt-1">
                {artwork.year}
              </p>
            )}
          </div>

          {/* Availability Badge */}
          {showAvailability && artwork.availability_status && (
            <div
              className={`
                absolute top-3 right-3
                px-2 py-1
                text-caption
                font-medium
                rounded-sm
                ${availabilityColors[artwork.availability_status]}
              `}
            >
              {availabilityLabels[artwork.availability_status]}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-body font-medium text-black truncate">
            {artwork.title}
          </h3>
          {showMetadata && (
            <div className="mt-1 text-caption text-gray-warm">
              {artwork.year && <span>{artwork.year}</span>}
              {artwork.year && artwork.medium && <span className="mx-1">·</span>}
              {artwork.medium && <span>{artwork.medium}</span>}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
