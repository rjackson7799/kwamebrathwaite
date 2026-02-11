'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { calculateArtworkScale, getChairScale } from '@/lib/utils'
import { ROOM_SCENES, DEFAULT_ROOM_ID, getRoomScene } from '@/lib/constants/roomScenes'
import type { RoomScene } from '@/lib/constants/roomScenes'
import { useDragPosition } from '@/lib/hooks/useDragPosition'
import { useViewportMode } from '@/lib/hooks/useViewportMode'
import { RoomThumbnailStrip } from '@/components/ui/RoomThumbnailStrip'
import { EmailCaptureModal } from '@/components/ui/EmailCaptureModal'
import { CustomRoomPrompt } from '@/components/ui/CustomRoomPrompt'

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

const MAX_GENERATIONS = 3

export function ViewOnWallModal({ artwork, isOpen, onClose }: ViewOnWallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const t = useTranslations('works')
  const tCommon = useTranslations('common')

  const viewport = useViewportMode()

  const [activeScene, setActiveScene] = useState<RoomScene>(getRoomScene(DEFAULT_ROOM_ID))
  const [backgroundError, setBackgroundError] = useState<Set<string>>(new Set())
  const [customScenes, setCustomScenes] = useState<RoomScene[]>([])

  // AI generation flow state
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null)
  const [generationsUsed, setGenerationsUsed] = useState(0)

  // Artwork zoom (1.0 = calculated scale, range 0.5–1.5)
  const [artworkZoom, setArtworkZoom] = useState(1.0)

  // Hint overlay (auto-fades after 3s)
  const [showHint, setShowHint] = useState(true)

  // Calculate artwork scale using dynamic room height
  const artworkScale = calculateArtworkScale(artwork.dimensions, viewport.roomHeightPx)
  const chairHeight = getChairScale(viewport.roomHeightPx)

  // Default center position as percentages
  const defaultPosition = { x: 50, y: 28 }

  // Drag interaction
  const {
    position,
    isDragging,
    handlers: dragHandlers,
    resetPosition,
    containerRef,
  } = useDragPosition({
    initialPosition: defaultPosition,
    constraints: {
      minX: activeScene.wallRegion.left,
      maxX: activeScene.wallRegion.right,
      minY: activeScene.wallRegion.top,
      maxY: activeScene.wallRegion.bottom,
    },
    enabled: !showEmailCapture && !showCustomPrompt,
  })

  // Reset position when viewport mode changes (e.g. orientation flip)
  const prevMode = useRef(viewport.mode)
  useEffect(() => {
    if (prevMode.current !== viewport.mode) {
      resetPosition()
      setArtworkZoom(1.0)
      prevMode.current = viewport.mode
    }
  }, [viewport.mode, resetPosition])

  // Load email from sessionStorage on mount
  useEffect(() => {
    if (!isOpen) return
    const storedEmail = sessionStorage.getItem('wallViewEmail')
    if (storedEmail) {
      setCapturedEmail(storedEmail)
    }
    const storedCount = sessionStorage.getItem('wallViewGenerations')
    if (storedCount) {
      setGenerationsUsed(parseInt(storedCount, 10) || 0)
    }
  }, [isOpen])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Hint auto-fade: show for 3s, then fade out
  useEffect(() => {
    if (!isOpen) return
    setShowHint(true)
    const timer = setTimeout(() => setShowHint(false), 3000)
    return () => clearTimeout(timer)
  }, [isOpen, activeScene.id])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (showEmailCapture) {
          setShowEmailCapture(false)
        } else if (showCustomPrompt) {
          setShowCustomPrompt(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, showEmailCapture, showCustomPrompt])

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
  }, [isOpen, showEmailCapture, showCustomPrompt])

  const handleBackgroundError = useCallback((sceneId: string) => {
    setBackgroundError((prev) => new Set(prev).add(sceneId))
  }, [])

  const handleRoomSelect = useCallback((scene: RoomScene) => {
    setActiveScene(scene)
  }, [])

  const handleCustomRoomClick = useCallback(() => {
    if (capturedEmail) {
      setShowCustomPrompt(true)
    } else {
      setShowEmailCapture(true)
    }
  }, [capturedEmail])

  const handleEmailCaptured = useCallback((email: string) => {
    setCapturedEmail(email)
    setShowEmailCapture(false)
    setShowCustomPrompt(true)
  }, [])

  const handleRoomGenerated = useCallback((scene: RoomScene) => {
    setCustomScenes((prev) => [...prev, scene])
    setActiveScene(scene)
    setShowCustomPrompt(false)
    const newCount = generationsUsed + 1
    setGenerationsUsed(newCount)
    sessionStorage.setItem('wallViewGenerations', String(newCount))
  }, [generationsUsed])

  // Don't render on server or when closed
  if (typeof window === 'undefined' || !isOpen) return null

  const allScenes = [...ROOM_SCENES, ...customScenes]

  // Dynamic shadow based on position
  const shadowOffset = Math.round(4 + (position.y / 100) * 12)
  const shadowBlur = Math.round(8 + (position.y / 100) * 24)

  const { externalControls } = viewport

  // Shared slider JSX
  const sliderElement = artworkScale && (
    <div className={`flex items-center gap-3 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full ${
      externalControls ? 'mx-auto w-fit' : 'absolute bottom-[120px] left-1/2 -translate-x-1/2 z-20'
    }`}>
      {/* Small icon */}
      <svg className="w-4 h-4 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" strokeWidth={1.5} rx="1" />
      </svg>
      <input
        type="range"
        min="0.5"
        max="1.5"
        step="0.05"
        value={artworkZoom}
        onChange={(e) => setArtworkZoom(parseFloat(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        className="wall-view-slider w-32 sm:w-48"
        aria-label="Resize artwork"
      />
      {/* Large icon */}
      <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" strokeWidth={1.5} rx="1" />
      </svg>
    </div>
  )

  // Shared thumbnail strip props
  const thumbnailStripProps = {
    scenes: allScenes,
    activeSceneId: activeScene.id,
    onSelect: handleRoomSelect,
    onCustomRoomClick: handleCustomRoomClick,
    customRoomDisabled: generationsUsed >= MAX_GENERATIONS && !!capturedEmail,
  }

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('detail.viewOnWallTitle')}
      className={`fixed inset-0 z-modal flex flex-col bg-black/90 transition-opacity duration-slow ${
        externalControls
          ? 'justify-start'
          : 'items-center justify-center'
      }`}
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Header */}
      <div className={`${
        externalControls
          ? 'relative p-3 sm:p-4'
          : 'absolute top-0 left-0 right-0 p-4 sm:p-6'
      } flex justify-between items-center z-10 flex-shrink-0`}>
        <h2 className={`text-overline text-white uppercase tracking-widest ${
          externalControls ? 'text-[10px]' : ''
        }`}>
          {t('detail.viewOnWallTitle')}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={tCommon('close')}
          className="p-2 text-white hover:text-gray-light transition-colors duration-fast"
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
        ref={containerRef}
        className={`relative w-full z-10 flex-shrink-0 ${
          externalControls
            ? 'mx-auto px-2 sm:px-4'
            : 'max-w-6xl mx-4'
        }`}
        style={{
          aspectRatio: viewport.aspectRatio,
          ...(externalControls ? { maxWidth: '100%' } : {}),
        }}
      >
        {/* Room Background */}
        <div
          className="absolute inset-0 overflow-hidden rounded-lg"
          style={
            backgroundError.has(activeScene.id)
              ? { background: activeScene.gradient }
              : undefined
          }
        >
          {!backgroundError.has(activeScene.id) && (
            <Image
              src={activeScene.background}
              alt=""
              fill
              className="object-cover"
              priority
              onError={() => handleBackgroundError(activeScene.id)}
            />
          )}

          {/* Spotlight effect */}
          {activeScene.spotlightEffect && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: activeScene.spotlightEffect }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Centering guide lines (visible while dragging) */}
        {isDragging && (
          <>
            <div
              className="drag-guide-line drag-guide-vertical"
              aria-hidden="true"
            />
            <div
              className="drag-guide-line drag-guide-horizontal"
              style={{ top: `${position.y}%` }}
              aria-hidden="true"
            />
          </>
        )}

        {/* Artwork on Wall */}
        {artworkScale && (
          <div
            className={`absolute artwork-draggable ${isDragging ? 'is-dragging' : ''}`}
            style={{
              width: `${Math.min(artworkScale.width * artworkZoom, 960 * 0.9)}px`,
              height: `${Math.min(artworkScale.height * artworkZoom, viewport.roomHeightPx * 0.7)}px`,
              top: `${position.y}%`,
              left: `${position.x}%`,
              transform: 'translate(-50%, -50%)',
              maxWidth: `${externalControls ? Math.min(85 * artworkZoom, 95) : Math.min(80 * artworkZoom, 95)}%`,
              maxHeight: `${externalControls ? Math.min(65 * artworkZoom, 85) : Math.min(55 * artworkZoom, 75)}%`,
              boxShadow: `0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.15), 0 ${shadowOffset * 2}px ${shadowBlur * 2}px rgba(0,0,0,0.1)`,
              willChange: isDragging ? 'transform' : undefined,
            }}
            onDoubleClick={() => { resetPosition(); setArtworkZoom(1.0) }}
            {...dragHandlers}
            aria-label={t('detail.aiRoom.dragHint')}
          >
            <div className="relative w-full h-full">
              <Image
                src={artwork.image_url}
                alt={artwork.title}
                fill
                className="object-contain pointer-events-none"
                sizes="(max-width: 768px) 80vw, 50vw"
                draggable={false}
              />
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
            <path d="M10 100 L10 60 L5 60 L5 55 L75 55 L75 60 L70 60 L70 100 L65 100 L65 60 L15 60 L15 100 Z" />
            <path d="M5 55 L5 35 Q5 20 20 20 L60 20 Q75 20 75 35 L75 55 Z" />
            <rect x="15" y="25" width="50" height="5" rx="2" />
          </svg>
        </div>

        {/* Dimensions label */}
        {artwork.dimensions && (
          <div className={`absolute right-4 bg-black/60 px-3 py-1.5 rounded ${
            externalControls ? 'bottom-2 text-[10px]' : 'bottom-14'
          }`}>
            <span className="text-caption text-white">
              {artwork.dimensions}
            </span>
          </div>
        )}

        {/* Hint overlay — auto-fades after 3s */}
        <div
          className={`
            absolute top-4 left-1/2 -translate-x-1/2 z-20
            bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full
            transition-opacity duration-1000 pointer-events-none
            ${showHint ? 'opacity-100' : 'opacity-0'}
          `}
          aria-hidden="true"
        >
          <span className="text-caption text-white/90 whitespace-nowrap">
            {t('detail.aiRoom.dragHint')}
          </span>
        </div>

        {/* Desktop: Resize slider inside room */}
        {!externalControls && sliderElement}

        {/* Desktop: Room Thumbnail Strip inside room */}
        {!externalControls && (
          <RoomThumbnailStrip {...thumbnailStripProps} />
        )}
      </div>

      {/* Mobile: External controls below room */}
      {externalControls && (
        <div
          className="flex-shrink-0 w-full px-2 sm:px-4 mt-2 z-10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
        >
          {/* Slider */}
          <div className="mb-2">
            {sliderElement}
          </div>

          {/* Thumbnail strip */}
          <RoomThumbnailStrip {...thumbnailStripProps} variant="external" />
        </div>
      )}

      {/* Email Capture Modal — fixed so it covers full viewport */}
      {showEmailCapture && (
        <EmailCaptureModal
          onEmailCaptured={handleEmailCaptured}
          onClose={() => setShowEmailCapture(false)}
          artworkId={artwork.id}
        />
      )}

      {/* Custom Room Prompt — fixed so it covers full viewport */}
      {showCustomPrompt && capturedEmail && (
        <CustomRoomPrompt
          email={capturedEmail}
          onGenerated={handleRoomGenerated}
          onClose={() => setShowCustomPrompt(false)}
          remainingGenerations={MAX_GENERATIONS - generationsUsed}
          maxGenerations={MAX_GENERATIONS}
        />
      )}
    </div>,
    document.body
  )
}
