'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Lightbox, type LightboxImage } from '@/components/ui/Lightbox'
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder'

export interface DetailedPressItem {
  id: string
  title: string
  publication: string | null
  author: string | null
  publish_date: string | null
  url: string | null
  excerpt: string | null
  image_url: string | null
  press_type: 'article' | 'review' | 'interview' | 'feature' | null
}

interface PressDetailProps {
  pressItem: DetailedPressItem
}

export function PressDetail({ pressItem }: PressDetailProps) {
  const locale = useLocale()
  const t = useTranslations('press')
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const pressHref = locale === 'en' ? '/press' : `/${locale}/press`

  const formatDate = () => {
    if (!pressItem.publish_date) return null
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return dateFormatter.format(new Date(pressItem.publish_date))
  }

  // Build meta line: "Author, Publication, Date"
  const metaParts: string[] = []
  if (pressItem.author) metaParts.push(pressItem.author)
  if (pressItem.publication) metaParts.push(pressItem.publication)
  const formattedDate = formatDate()
  if (formattedDate) metaParts.push(formattedDate)
  const metaLine = metaParts.join(', ')

  const lightboxImages: LightboxImage[] = pressItem.image_url
    ? [
        {
          id: pressItem.id,
          src: pressItem.image_url,
          alt: pressItem.title,
          title: pressItem.title,
          caption: metaLine || undefined,
        },
      ]
    : []

  return (
    <>
      <article className="container-page section-spacing">
        {/* Back to Press Link */}
        <Link
          href={pressHref}
          className="inline-flex items-center gap-2 text-body text-gray-warm dark:text-[#A0A0A0] hover:text-black dark:hover:text-[#F0F0F0] transition-colors duration-fast mb-8"
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
          {t('detail.backToPress')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Content — left column */}
          <div className="flex flex-col">
            {/* Press Type Badge */}
            {pressItem.press_type && (
              <span className="inline-block self-start px-3 py-1.5 text-caption font-medium rounded-sm mb-4 bg-gray-light dark:bg-[#2A2A2A] text-gray-warm dark:text-[#A0A0A0]">
                {t(`detail.type.${pressItem.press_type}`)}
              </span>
            )}

            {/* Title */}
            <h1 className="page-title-museum mb-6">
              {pressItem.title}
            </h1>

            {/* Meta line: author, publication, date */}
            {metaLine && (
              <p className="text-body-sm uppercase tracking-[0.06em] text-gray-warm dark:text-[#A0A0A0] mb-8">
                {metaLine}
              </p>
            )}

            {/* Excerpt / Body */}
            {pressItem.excerpt && (
              <div
                className="prose prose-lg dark:prose-invert max-w-none text-black dark:text-[#C0C0C0] mb-8"
                dangerouslySetInnerHTML={{ __html: pressItem.excerpt }}
              />
            )}

            {/* Read Full Article Button */}
            {pressItem.url && (
              <a
                href={pressItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center justify-center gap-2 self-start mt-auto"
              >
                {t('detail.readFullArticle')}
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
          </div>

          {/* Image — right column */}
          <div className="relative">
            {pressItem.image_url && !hasError ? (
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="relative w-full aspect-[4/3] overflow-hidden bg-gray-light dark:bg-[#2A2A2A] cursor-zoom-in group"
                aria-label="View full size"
              >
                {isLoading && (
                  <div className="absolute inset-0">
                    <ImagePlaceholder aspectRatio="4:3" />
                  </div>
                )}
                <Image
                  src={pressItem.image_url}
                  alt={pressItem.title}
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
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-slow"
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
            ) : pressItem.image_url ? (
              <div className="relative w-full aspect-[4/3]">
                <ImagePlaceholder aspectRatio="4:3" showIcon />
              </div>
            ) : null}
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
