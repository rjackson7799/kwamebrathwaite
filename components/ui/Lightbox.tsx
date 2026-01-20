'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export interface LightboxImage {
  id: string
  src: string
  alt: string
  title?: string
  caption?: string
}

interface LightboxProps {
  /** Array of images for navigation */
  images: LightboxImage[]
  /** Currently active image index */
  currentIndex: number
  /** Whether lightbox is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Navigation handler */
  onNavigate: (index: number) => void
  /** Show image info panel */
  showInfo?: boolean
}

export function Lightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  showInfo = true,
}: LightboxProps) {
  const lightboxRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const t = useTranslations('common')

  const currentImage = images[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(currentIndex - 1)
    }
  }, [hasPrev, currentIndex, onNavigate])

  const goToNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1)
    }
  }, [hasNext, currentIndex, onNavigate])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrev()
          break
        case 'ArrowRight':
          goToNext()
          break
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, goToPrev, goToNext])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !lightboxRef.current) return

    const focusableElements = lightboxRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    function handleTabKey(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    closeButtonRef.current?.focus()

    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Don't render on server or when closed
  if (typeof window === 'undefined' || !isOpen || !currentImage) return null

  return createPortal(
    <div
      ref={lightboxRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('lightbox')}
      className={`
        fixed inset-0
        z-modal
        flex items-center justify-center
        bg-black/95
        backdrop-blur-lg
        transition-opacity duration-slow
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close Button */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        className="
          absolute top-4 right-4
          z-10
          p-2
          text-white
          hover:text-gray-light
          transition-colors duration-fast
        "
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Previous Button */}
      {hasPrev && (
        <button
          type="button"
          onClick={goToPrev}
          aria-label={t('previousImage')}
          className="
            absolute left-4
            z-10
            p-2
            text-white
            hover:text-gray-light
            transition-colors duration-fast
          "
        >
          <svg
            className="w-10 h-10"
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
        </button>
      )}

      {/* Next Button */}
      {hasNext && (
        <button
          type="button"
          onClick={goToNext}
          aria-label={t('nextImage')}
          className="
            absolute right-4
            z-10
            p-2
            text-white
            hover:text-gray-light
            transition-colors duration-fast
          "
        >
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Main Image */}
      <div className="relative max-w-[90vw] max-h-[85vh]">
        <Image
          src={currentImage.src}
          alt={currentImage.alt}
          width={1200}
          height={1500}
          className="max-w-full max-h-[85vh] object-contain"
          priority
        />
      </div>

      {/* Image Info Panel */}
      {showInfo && (currentImage.title || currentImage.caption) && (
        <div className="
          absolute bottom-0 left-0 right-0
          bg-black/80
          px-6 py-4
          text-white
        ">
          {currentImage.title && (
            <h3 className="text-h4 font-medium">{currentImage.title}</h3>
          )}
          {currentImage.caption && (
            <p className="mt-1 text-body-sm text-gray-light">{currentImage.caption}</p>
          )}
          <p className="mt-2 text-caption text-gray-warm">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      )}

      {/* Image Counter (when no info panel) */}
      {!showInfo && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-caption text-white">
          {currentIndex + 1} / {images.length}
        </p>
      )}
    </div>,
    document.body
  )
}
