'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

interface HeroSlide {
  id: string
  image_url: string
  overlay_opacity: number
}

interface HeroRotatorProps {
  slides: HeroSlide[]
}

export function HeroRotator({ slides }: HeroRotatorProps) {
  const t = useTranslations('hero')
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

  // Handle empty state - fallback to static hero
  if (slides.length === 0) {
    return (
      <section className="relative h-screen bg-charcoal flex items-center justify-center grain-overlay">
        <div className="text-center text-white px-4 max-w-4xl">
          <p className="text-overline uppercase tracking-widest text-gold mb-6 animate-hidden animate-fade-up">
            {t('overline')}
          </p>
          <h1 className="font-serif text-display-1 mb-6 tracking-tight animate-hidden animate-fade-up stagger-1">
            {t('title')}
          </h1>
          <p className="text-body-lg text-gray-warm max-w-2xl mx-auto animate-hidden animate-fade-up stagger-2">
            {t('subtitle')}
          </p>
          {/* Gold accent divider */}
          <div className="mt-12 flex justify-center animate-hidden animate-fade-up stagger-3">
            <span className="w-16 h-px bg-gold" aria-hidden="true" />
          </div>
        </div>
      </section>
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
            alt=""
            fill
            className="object-cover"
            priority={index === 0}
            quality={90}
            sizes="100vw"
          />
          {/* Dynamic Opacity Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/20 via-black to-black/20"
            style={{ opacity: slide.overlay_opacity / 100 }}
          />
        </div>
      ))}

      {/* Content - Text Overlay */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="text-center text-white px-4 max-w-4xl">
          <p className="text-sm tracking-[0.08em] uppercase mb-4 opacity-90 animate-hidden animate-fade-up">
            {t('overline')}
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-semibold mb-4 leading-tight animate-hidden animate-fade-up stagger-1">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl font-light opacity-90 animate-hidden animate-fade-up stagger-2">
            {t('subtitle')}
          </p>
          {/* Gold accent divider */}
          <div className="mt-12 flex justify-center animate-hidden animate-fade-up stagger-3">
            <span className="w-16 h-px bg-gold" aria-hidden="true" />
          </div>
        </div>
      </div>

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

      {/* Previous/Next Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12
                     flex items-center justify-center bg-white/10 hover:bg-white/20
                     backdrop-blur-sm rounded-full transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeftIcon className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12
                     flex items-center justify-center bg-white/10 hover:bg-white/20
                     backdrop-blur-sm rounded-full transition-colors"
            aria-label="Next slide"
          >
            <ChevronRightIcon className="w-6 h-6 text-white" />
          </button>
        </>
      )}
    </section>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}
