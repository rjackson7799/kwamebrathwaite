'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'
import { useState } from 'react'

export interface PressItem {
  id: string
  title: string
  publication?: string
  author?: string
  publish_date?: string
  url?: string
  excerpt?: string
  image_url?: string
  press_type?: 'article' | 'review' | 'interview' | 'feature'
}

interface PressCardProps {
  /** Press item data */
  pressItem: PressItem
  /** Show excerpt text */
  showExcerpt?: boolean
  /** Priority loading */
  priority?: boolean
  /** Custom class names */
  className?: string
}

export function PressCard({
  pressItem,
  showExcerpt = false,
  priority = false,
  className = '',
}: PressCardProps) {
  const locale = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Format date
  const formatDate = () => {
    if (!pressItem.publish_date) return null

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    return dateFormatter.format(new Date(pressItem.publish_date))
  }

  const CardContent = () => (
    <article className="card-bordered rounded-sm overflow-hidden h-full">
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden bg-gray-light">
        {!pressItem.image_url || hasError ? (
          <ImagePlaceholder aspectRatio="16:9" showIcon />
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0">
                <ImagePlaceholder aspectRatio="16:9" />
              </div>
            )}
            <Image
              src={pressItem.image_url}
              alt={pressItem.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Publication name with gold accent */}
        {pressItem.publication && (
          <div className="flex items-center gap-2 mb-3">
            <span className="w-4 h-px bg-gold flex-shrink-0" aria-hidden="true" />
            <p className="text-overline uppercase tracking-widest text-gray-warm">
              {pressItem.publication}
            </p>
          </div>
        )}

        {/* Title */}
        <h3 className="text-h4 font-medium text-black line-clamp-2">
          {pressItem.title}
        </h3>

        {/* Excerpt */}
        {showExcerpt && pressItem.excerpt && (
          <p className="mt-2 text-body-sm text-gray-warm line-clamp-2">
            {pressItem.excerpt}
          </p>
        )}

        {/* Meta: author and date */}
        <div className="mt-3 flex items-center gap-2 text-caption text-gray-warm">
          {pressItem.author && (
            <>
              <span>{pressItem.author}</span>
              {formatDate() && <span>·</span>}
            </>
          )}
          {formatDate() && <span>{formatDate()}</span>}
        </div>

        {/* External link indicator */}
        {pressItem.url && (
          <div className="mt-3 flex items-center gap-1 text-body-sm text-black group-hover:text-gray-warm transition-colors duration-fast">
            <span>Read article</span>
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
          </div>
        )}
      </div>
    </article>
  )

  if (pressItem.url) {
    return (
      <a
        href={pressItem.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block h-full ${className}`}
        aria-label={`${pressItem.title} - Opens in new tab`}
      >
        <CardContent />
      </a>
    )
  }

  return (
    <div className={`group block h-full ${className}`}>
      <CardContent />
    </div>
  )
}
