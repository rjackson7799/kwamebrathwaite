'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { RoomScene } from '@/lib/constants/roomScenes'

const PRESET_CHIPS = [
  'modernLoft',
  'minimalistGallery',
  'cozyLivingRoom',
  'museumLighting',
  'midCentury',
  'scandinavian',
] as const

interface CustomRoomPromptProps {
  email: string
  onGenerated: (scene: RoomScene) => void
  onClose: () => void
  remainingGenerations: number
  maxGenerations: number
}

export function CustomRoomPrompt({
  email,
  onGenerated,
  onClose,
  remainingGenerations,
  maxGenerations,
}: CustomRoomPromptProps) {
  const t = useTranslations('works')
  const tCommon = useTranslations('common')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChipClick = (chipKey: string) => {
    setPrompt(t(`detail.aiRoom.chips.${chipKey}`))
    inputRef.current?.focus()
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || remainingGenerations <= 0) return

    setError('')
    setIsGenerating(true)

    try {
      const sessionId =
        sessionStorage.getItem('wallViewSessionId') ||
        crypto.randomUUID()
      sessionStorage.setItem('wallViewSessionId', sessionId)

      const res = await fetch('/api/generate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          email,
          session_id: sessionId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.code === 'CONTENT_POLICY') {
          setError(t('detail.aiRoom.contentPolicy'))
        } else if (data.error?.code === 'RATE_LIMIT_EXCEEDED') {
          setError(t('detail.aiRoom.limitReached'))
        } else {
          setError(data.error?.message || t('detail.aiRoom.error'))
        }
        setIsGenerating(false)
        return
      }

      const imageUrl = data.data?.image_url

      // Create a custom RoomScene
      const customScene: RoomScene = {
        id: `custom-${Date.now()}`,
        name: 'customRoomLabel',
        thumbnail: imageUrl,
        background: imageUrl,
        wallRegion: { top: 0.05, bottom: 0.70, left: 0.05, right: 0.95 },
        gradient:
          'linear-gradient(180deg, #E8E8E8 0%, #E8E8E8 70%, #888 70%, #555 100%)',
        isCustom: true,
      }

      onGenerated(customScene)
    } catch {
      setError(t('detail.aiRoom.error'))
    } finally {
      setIsGenerating(false)
    }
  }

  const limitReached = remainingGenerations <= 0

  return (
    <div
      className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-t-lg sm:rounded-lg p-5 sm:p-6 max-w-lg w-full mx-0 sm:mx-4 relative"
        role="dialog"
        aria-modal="true"
        aria-label={t('detail.aiRoom.promptTitle')}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={tCommon('close')}
          className="absolute top-3 right-3 p-1 text-gray-warm hover:text-black transition-colors duration-fast"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-h4 mb-1">
          {t('detail.aiRoom.promptTitle')}
        </h3>

        {/* Remaining counter */}
        <p className="text-caption text-gray-warm mb-4">
          {t('detail.aiRoom.remaining', {
            count: remainingGenerations,
            total: maxGenerations,
          })}
        </p>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_CHIPS.map((chipKey) => (
            <button
              key={chipKey}
              type="button"
              onClick={() => handleChipClick(chipKey)}
              disabled={limitReached || isGenerating}
              className="text-caption px-3 py-1.5 rounded-full border border-gray-light text-gray-warm hover:border-black hover:text-black transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t(`detail.aiRoom.chips.${chipKey}`)}
            </button>
          ))}
        </div>

        {/* Prompt input */}
        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('detail.aiRoom.promptPlaceholder')}
            className="input flex-1"
            disabled={limitReached || isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGenerate()
            }}
            maxLength={500}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating || limitReached}
            className="btn-gold whitespace-nowrap"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('detail.aiRoom.generating')}
              </span>
            ) : (
              t('detail.aiRoom.generate')
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-caption text-error mb-2">{error}</p>
        )}

        {/* Limit reached */}
        {limitReached && (
          <p className="text-caption text-gray-warm">
            {t('detail.aiRoom.limitReached')}
          </p>
        )}
      </div>
    </div>
  )
}
