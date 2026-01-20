'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

export interface TimelineEvent {
  id: string
  year: number
  title: string
  description?: string
  image_url?: string
  type?: 'biography' | 'milestone' | 'exhibition'
}

interface TimelineItemProps {
  /** Event data */
  event: TimelineEvent
  /** Animation delay index */
  index: number
  /** Priority loading for images */
  priority?: boolean
}

export function TimelineItem({
  event,
  index,
  priority = false,
}: TimelineItemProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  // Scroll-triggered animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '50px' }
    )

    if (itemRef.current) {
      observer.observe(itemRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const isMilestone = event.type === 'milestone'

  // Stagger delay based on index (max 8 items with stagger)
  const staggerDelay = Math.min(index, 7) * 100

  return (
    <div
      ref={itemRef}
      className="relative pl-8 md:pl-12 pb-8 last:pb-0"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s ease ${staggerDelay}ms, transform 0.5s ease ${staggerDelay}ms`,
      }}
    >
      {/* Timeline dot */}
      <div
        className={`
          absolute left-0 top-1
          w-3 h-3
          rounded-full
          border-2 border-white
          shadow-sm
          transition-transform duration-normal
          ${isMilestone ? 'bg-gold' : 'bg-charcoal'}
        `}
        style={{ transform: 'translateX(-50%)' }}
      />

      {/* Content card */}
      <article
        className={`
          card-bordered rounded-sm
          bg-white
          p-4 md:p-6
          transition-all duration-slow
          hover:shadow-lg hover:-translate-y-0.5
          ${isMilestone ? 'border-l-2 border-l-gold' : ''}
        `}
        tabIndex={0}
        role="article"
        aria-labelledby={`event-title-${event.id}`}
      >
        {/* Year badge */}
        <span
          className="
            inline-block
            font-mono text-caption
            bg-charcoal text-white
            px-2 py-1 rounded-sm
            mb-3
          "
        >
          {event.year}
        </span>

        {/* Title */}
        <h3
          id={`event-title-${event.id}`}
          className="text-h4 font-medium text-black mb-1"
        >
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-body-sm text-gray-warm mt-2">
            {event.description}
          </p>
        )}

        {/* Optional image */}
        {event.image_url && !hasError && (
          <div className="relative mt-4 aspect-video overflow-hidden rounded-sm bg-gray-light">
            {isLoading && (
              <div className="absolute inset-0">
                <ImagePlaceholder aspectRatio="16:9" />
              </div>
            )}
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`
                object-cover
                transition-opacity duration-slow
                ${isLoading ? 'opacity-0' : 'opacity-100'}
              `}
              priority={priority}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setHasError(true)
              }}
            />
          </div>
        )}
      </article>
    </div>
  )
}
