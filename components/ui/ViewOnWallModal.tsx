'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { calculateArtworkScale, getChairScale } from '@/lib/utils'
import { ROOM_SCENES, DEFAULT_ROOM_ID, getRoomScene } from '@/lib/constants/roomScenes'
import type { RoomScene } from '@/lib/constants/roomScenes'
import { useDragPosition } from '@/lib/hooks/useDragPosition'
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

// Room scene dimensions (aspect ratio 16:9)
const ROOM_HEIGHT_PX = 540
const MAX_GENERATIONS = 3

export function ViewOnWallModal({ artwork, isOpen, onClose }: ViewOnWallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const t = useTranslations('works')
  const tCommon = useTranslations('common')

  const [activeScene, setActiveScene] = useState<RoomScene>(getRoomScene(DEFAULT_ROOM_ID))
  const [backgroundError, setBackgroundError] = useState<Set<string>>(new Set())
  const [customScenes, setCustomScenes] = useState<RoomScene[]>([])

  // AI generation flow state
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null)
  const [generationsUsed, setGenerationsUsed] = useState(0)

  // Calculate artwork scale
  const artworkScale = calculateArtworkScale(artwork.dimensions, ROOM_HEIGHT_PX)
  const chairHeight = getChairScale(ROOM_HEIGHT_PX)

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

  return createPortal(
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('detail.viewOnWallTitle')}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center bg-black/90 transition-opacity duration-slow"
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
        className="relative w-full max-w-6xl mx-4 z-10"
        style={{ aspectRatio: '16/9' }}
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
              width: `${Math.min(artworkScale.width, 960 * 0.8)}px`,
              height: `${Math.min(artworkScale.height, ROOM_HEIGHT_PX * 0.6)}px`,
              top: `${position.y}%`,
              left: `${position.x}%`,
              transform: 'translate(-50%, -50%)',
              maxWidth: '80%',
              maxHeight: '55%',
              boxShadow: `0 ${shadowOffset}px ${shadowBlur}px rgba(0,0,0,0.15), 0 ${shadowOffset * 2}px ${shadowBlur * 2}px rgba(0,0,0,0.1)`,
              willChange: isDragging ? 'transform' : undefined,
            }}
            onDoubleClick={resetPosition}
            {...dragHandlers}
            aria-label={t('detail.aiRoom.dragHint')}
          >
            <div className="relative w-full h-full bg-white p-1 sm:p-2">
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
          <div className="absolute bottom-14 right-4 bg-black/60 px-3 py-1.5 rounded">
            <span className="text-caption text-white">
              {artwork.dimensions}
            </span>
          </div>
        )}

        {/* Room Thumbnail Strip */}
        <RoomThumbnailStrip
          scenes={allScenes}
          activeSceneId={activeScene.id}
          onSelect={handleRoomSelect}
          onCustomRoomClick={handleCustomRoomClick}
          customRoomDisabled={generationsUsed >= MAX_GENERATIONS && !!capturedEmail}
        />

        {/* Email Capture Modal */}
        {showEmailCapture && (
          <EmailCaptureModal
            onEmailCaptured={handleEmailCaptured}
            onClose={() => setShowEmailCapture(false)}
            artworkId={artwork.id}
          />
        )}

        {/* Custom Room Prompt */}
        {showCustomPrompt && capturedEmail && (
          <CustomRoomPrompt
            email={capturedEmail}
            onGenerated={handleRoomGenerated}
            onClose={() => setShowCustomPrompt(false)}
            remainingGenerations={MAX_GENERATIONS - generationsUsed}
            maxGenerations={MAX_GENERATIONS}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
