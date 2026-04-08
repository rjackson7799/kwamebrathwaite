'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useState } from 'react'

export interface PressItem {
  id: string
  slug?: string
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
  pressItem: PressItem
  priority?: boolean
  className?: string
}

export function PressCard({
  pressItem,
  priority = false,
  className = '',
}: PressCardProps) {
  const locale = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const formatDate = () => {
    if (!pressItem.publish_date) return null

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    return dateFormatter.format(new Date(pressItem.publish_date))
  }

  // Build meta line: "AUTHOR, PUBLICATION, DATE"
  const metaParts: string[] = []
  if (pressItem.author) metaParts.push(pressItem.author)
  if (pressItem.publication) metaParts.push(pressItem.publication)
  const formattedDate = formatDate()
  if (formattedDate) metaParts.push(formattedDate)
  const metaLine = metaParts.join(', ')

  const hasImage = pressItem.image_url && !hasError

  const CardContent = () => (
    <article className="h-full">
      {/* Image — only shown if image_url exists (mixed layout) */}
      {pressItem.image_url && (
        <div className="relative aspect-square overflow-hidden mb-4 bg-gray-light dark:bg-[#2A2A2A]">
          {hasError ? null : (
            <>
              {isLoading && (
                <div className="absolute inset-0 bg-gray-light dark:bg-[#2A2A2A]" />
              )}
              <Image
                src={pressItem.image_url}
                alt={pressItem.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
      )}

      {/* Title — uppercase, wide tracking, museum style */}
      <h3 className="text-[10px] font-normal uppercase tracking-[0.06em] text-gray-body dark:text-[#E0E0E0] leading-snug">
        {pressItem.title}
      </h3>

      {/* Meta line: author, publication, date */}
      {metaLine && (
        <p className="mt-2 text-[8px] uppercase tracking-[0.06em] text-gray-heading dark:text-[#777777] leading-relaxed">
          {metaLine}
        </p>
      )}
    </article>
  )

  const identifier = pressItem.slug || pressItem.id
  const detailHref = locale === 'en' ? `/press/${identifier}` : `/${locale}/press/${identifier}`

  return (
    <Link
      href={detailHref}
      className={`group block h-full ${className}`}
      aria-label={pressItem.title}
    >
      <CardContent />
    </Link>
  )
}
