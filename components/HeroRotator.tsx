'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface HeroSlide {
  id: string
  image_url: string
  overlay_opacity: number
  title: string | null
  description: string | null
  link_url: string | null
  show_centered_text: boolean
}

interface HeroRotatorProps {
  slides: HeroSlide[]
}

export function HeroRotator({ slides }: HeroRotatorProps) {
  const t = useTranslations('home')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Auto-advance every 5 seconds
  // Only respect isPaused after user has interacted (hovered) to ensure rotation starts on page load
  useEffect(() => {
    if (slides.length <= 1 || (hasInteracted && isPaused)) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [slides.length, isPaused, hasInteracted])

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevious, goToNext])

  // Handle empty state
  if (slides.length === 0) {
    return (
      <section className="relative h-screen bg-charcoal" />
    )
  }

  return (
    <section
      className="relative h-screen overflow-hidden"
      onMouseEnter={() => {
        setHasInteracted(true)
        setIsPaused(true)
      }}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Hero image carousel"
    >
      {/* Background Images - All slides rendered for smooth transitions */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={index !== currentSlide}
        >
          <Image
            src={slide.image_url}
            alt={slide.title || ''}
            fill
            className="object-cover"
            priority={index === 0}
            quality={90}
            sizes="100vw"
          />
          {/* Bottom gradient overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
            style={{ opacity: slide.overlay_opacity / 100 }}
          />
          {/* Per-slide title (lower-left) */}
          {slide.title && (
            <div className="absolute bottom-20 left-8 md:left-12 lg:left-16 z-10 max-w-xl">
              {slide.link_url ? (
                <Link href={slide.link_url}>
                  <h2 className="text-white text-lg md:text-xl lg:text-2xl font-light uppercase tracking-[0.18em] hover:opacity-80 transition-opacity">
                    {slide.title}
                  </h2>
                </Link>
              ) : (
                <h2 className="text-white text-lg md:text-xl lg:text-2xl font-light uppercase tracking-[0.18em]">
                  {slide.title}
                </h2>
              )}
              {slide.description && (
                <p className="text-white/80 text-sm md:text-base font-light mt-2 tracking-[0.05em]">
                  {slide.description}
                </p>
              )}
            </div>
          )}
          {/* Centered text overlay (admin-togglable per slide) */}
          {slide.show_centered_text && (
            <div className="absolute inset-0 flex items-center justify-center z-10 text-center px-8">
              <div>
                <p className="text-white/90 text-xs md:text-sm uppercase tracking-[0.25em] mb-4">
                  {t('overline')}
                </p>
                <h1 className="text-white font-serif text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight">
                  {t('title')}
                </h1>
                <p className="text-white/80 text-base md:text-lg lg:text-xl font-light mt-4 tracking-wide">
                  {t('subtitle')}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Navigation Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75 w-2'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
