'use client'

import { useRef, useEffect, useState } from 'react'
import { ArtworkCard, Artwork } from './ArtworkCard'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

function ScrollFadeItem({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Stagger delay for items in the same viewport batch (cap at 8)
  const staggerDelay = Math.min(index % 4, 3) * 80

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${staggerDelay}ms, transform 0.5s ease ${staggerDelay}ms`,
      }}
    >
      {children}
    </div>
  )
}

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
      {artworks.map((artwork, index) => (
        <ScrollFadeItem key={artwork.id} index={index}>
          <ArtworkCard
            artwork={artwork}
            showMetadata={showMetadata}
            showAvailability={showAvailability}
            onClick={onArtworkClick}
            priority={index < 4}
          />
        </ScrollFadeItem>
      ))}
    </div>
  )
}
