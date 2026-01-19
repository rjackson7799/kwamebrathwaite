'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { calculateArtworkScale, getChairScale } from '@/lib/utils'

export type RoomType = 'white' | 'gray' | 'dark'

interface ViewOnWallArtwork {
  id: string
  title: string
  image_url: string
  dimensions: string | null
}

interface ViewOnWallModalProps {
  artwork: ViewOnWallArtwork
  isOpen: boolean
  onClose: () => void
}

// Room configurations with CSS gradient fallbacks
const ROOM_CONFIGS: Record<RoomType, { gradient: string; floorColor: string }> = {
  white: {
    gradient: 'linear-gradient(180deg, #F5F5F5 0%, #F5F5F5 70%, #C4A77D 70%, #8B7355 100%)',
    floorColor: '#C4A77D',
  },
  gray: {
    gradient: 'linear-gradient(180deg, #D3D3D3 0%, #D3D3D3 70%, #4A4A4A 70%, #2A2A2A 100%)',
    floorColor: '#4A4A4A',
  },
  dark: {
    gradient: 'linear-gradient(180deg, #3A3A3A 0%, #3A3A3A 70%, #1A1A1A 70%, #0A0A0A 100%)',
    floorColor: '#1A1A1A',
  },
}

// Room scene dimensions (aspect ratio 16:9)
const ROOM_HEIGHT_PX = 540
const ROOM_WIDTH_PX = 960

export function ViewOnWallModal({ artwork, isOpen, onClose }: ViewOnWallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const t = useTranslations('works')
  const tCommon = useTranslations('common')

  const [selectedRoom, setSelectedRoom] = useState<RoomType>('white')
  const [roomImageError, setRoomImageError] = useState<Record<RoomType, boolean>>({
    white: false,
    gray: false,
    dark: false,
  })

  // Calculate artwork scale
  const artworkScale = calculateArtworkScale(artwork.dimensions, ROOM_HEIGHT_PX)
  const chairHeight = getChairScale(ROOM_HEIGHT_PX)

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
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
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

  const handleRoomImageError = useCallback((room: RoomType) => {
    setRoomImageError(prev => ({ ...prev, [room]: true }))
  }, [])

  // Don't render on server or when closed
  if (typeof window === 'undefined' || !isOpen) return null

  const currentRoomConfig = ROOM_CONFIGS[selectedRoom]
  const useGradient = roomImageError[selectedRoom]

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('detail.viewOnWallTitle')}
      className="
        fixed inset-0
        z-modal
        flex flex-col items-center justify-center
        bg-black/90
        transition-opacity duration-slow
      "
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-10">
        <h2 className="text-overline text-white uppercase tracking-widest">
          {t('detail.viewOnWallTitle')}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={tCommon('close')}
          className="
            p-2
            text-white
            hover:text-gray-light
            transition-colors duration-fast
          "
        >
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8"
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
      </div>

      {/* Room Scene Container */}
      <div
        className="relative w-full max-w-4xl mx-4 z-10"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Room Background */}
        <div
          className="absolute inset-0 overflow-hidden rounded-lg"
          style={useGradient ? { background: currentRoomConfig.gradient } : undefined}
        >
          {!useGradient && (
            <Image
              src={`/rooms/${selectedRoom}-wall.jpg`}
              alt=""
              fill
              className="object-cover"
              priority
              onError={() => handleRoomImageError(selectedRoom)}
            />
          )}

          {/* Spotlight effect for dark room */}
          {selectedRoom === 'dark' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 60% 80% at 50% 40%, rgba(255,255,255,0.15) 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Artwork on Wall */}
        {artworkScale && (
          <div
            className="absolute artwork-on-wall"
            style={{
              width: `${Math.min(artworkScale.width, ROOM_WIDTH_PX * 0.8)}px`,
              height: `${Math.min(artworkScale.height, ROOM_HEIGHT_PX * 0.6)}px`,
              top: '25%',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '80%',
              maxHeight: '55%',
            }}
          >
            <div className="relative w-full h-full bg-white p-1 sm:p-2">
              <div className="relative w-full h-full">
                <Image
                  src={artwork.image_url}
                  alt={artwork.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 80vw, 50vw"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reference Chair (SVG silhouette) */}
        <div
          className="absolute bottom-0 left-[15%]"
          style={{ height: `${chairHeight}px`, width: `${chairHeight * 0.8}px` }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 80 100"
            fill="currentColor"
            className="w-full h-full text-black/30"
          >
            {/* Simple chair silhouette */}
            <path d="M10 100 L10 60 L5 60 L5 55 L75 55 L75 60 L70 60 L70 100 L65 100 L65 60 L15 60 L15 100 Z" />
            <path d="M5 55 L5 35 Q5 20 20 20 L60 20 Q75 20 75 35 L75 55 Z" />
            <rect x="15" y="25" width="50" height="5" rx="2" />
          </svg>
        </div>

        {/* Dimensions label */}
        {artwork.dimensions && (
          <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1.5 rounded">
            <span className="text-caption text-white">
              {artwork.dimensions}
            </span>
          </div>
        )}
      </div>

      {/* Room Selector */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex justify-center gap-2 sm:gap-4 z-10">
        {(['white', 'gray', 'dark'] as RoomType[]).map((room) => (
          <button
            key={room}
            type="button"
            onClick={() => setSelectedRoom(room)}
            className={`
              px-4 sm:px-6 py-2 sm:py-3
              text-xs sm:text-sm
              font-medium
              uppercase
              tracking-widest
              rounded
              transition-all duration-fast
              ${
                selectedRoom === room
                  ? 'bg-white text-black'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }
            `}
          >
            {t(`detail.room.${room}`)}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}
