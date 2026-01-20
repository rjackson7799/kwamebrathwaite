'use client'

import { ArtworkCard, Artwork } from './ArtworkCard'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

interface ArtworkGridProps {
  /** Array of artworks to display */
  artworks: Artwork[]
  /** Loading state - shows placeholders */
  isLoading?: boolean
  /** Number of placeholder items when loading */
  placeholderCount?: number
  /** Handler for artwork click (opens lightbox) */
  onArtworkClick?: (artwork: Artwork) => void
  /** Show metadata on cards */
  showMetadata?: boolean
  /** Show availability badges */
  showAvailability?: boolean
  /** Custom class names */
  className?: string
}

export function ArtworkGrid({
  artworks,
  isLoading = false,
  placeholderCount = 8,
  onArtworkClick,
  showMetadata = false,
  showAvailability = false,
  className = '',
}: ArtworkGridProps) {
  if (isLoading) {
    return (
      <div
        className={`
          grid
          grid-cols-2
          md:grid-cols-3
          lg:grid-cols-4
          gap-4
          md:gap-6
          lg:gap-8
          ${className}
        `}
      >
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <div key={index} className="card rounded-sm overflow-hidden">
            <ImagePlaceholder aspectRatio="4:5" />
            <div className="p-4">
              <div className="h-4 bg-gray-light rounded animate-pulse w-3/4" />
              {showMetadata && (
                <div className="h-3 bg-gray-light rounded animate-pulse w-1/2 mt-2" />
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (artworks.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-body text-gray-warm">No artworks found.</p>
      </div>
    )
  }

  return (
    <div
      className={`
        grid
        grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        gap-4
        md:gap-6
        lg:gap-8
        ${className}
      `}
    >
      {artworks.map((artwork, index) => {
        // Calculate stagger class for first 8 items
        const staggerClass = index < 8 ? `stagger-${index + 1}` : ''

        return (
          <div
            key={artwork.id}
            className={`animate-hidden animate-fade-up ${staggerClass}`}
          >
            <ArtworkCard
              artwork={artwork}
              showMetadata={showMetadata}
              showAvailability={showAvailability}
              onClick={onArtworkClick}
              priority={index < 4}
            />
          </div>
        )
      })}
    </div>
  )
}
