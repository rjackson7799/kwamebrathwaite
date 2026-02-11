'use client'

import Image from 'next/image'
import { useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { RoomScene } from '@/lib/constants/roomScenes'

interface RoomThumbnailStripProps {
  scenes: RoomScene[]
  activeSceneId: string
  onSelect: (scene: RoomScene) => void
  onCustomRoomClick: () => void
  customRoomDisabled?: boolean
}

export function RoomThumbnailStrip({
  scenes,
  activeSceneId,
  onSelect,
  onCustomRoomClick,
  customRoomDisabled = false,
}: RoomThumbnailStripProps) {
  const t = useTranslations('works')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = useCallback((sceneId: string) => {
    setImageErrors((prev) => new Set(prev).add(sceneId))
  }, [])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      {/* Gradient backdrop */}
      <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-10 pb-4 px-4">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
          role="radiogroup"
          aria-label={t('detail.viewOnWallTitle')}
        >
          {/* Custom Room button — first so users see AI option immediately */}
          <button
            type="button"
            onClick={onCustomRoomClick}
            disabled={customRoomDisabled}
            className={`
              flex-shrink-0 snap-start flex flex-col items-center gap-1.5
              transition-all duration-fast
              ${customRoomDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'opacity-70 hover:opacity-100'
              }
            `}
          >
            <div className="relative w-[100px] h-[56px] sm:w-[120px] sm:h-[68px] rounded overflow-hidden border-2 border-dashed border-white/40 hover:border-white/70 flex items-center justify-center bg-white/5 transition-colors duration-fast">
              {/* Sparkle/AI icon */}
              <svg
                className="w-6 h-6 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
            </div>
            <span className="text-[10px] sm:text-caption font-medium uppercase tracking-wider whitespace-nowrap text-white/60">
              {t('detail.rooms.customRoom')}
            </span>
          </button>

          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId
            const hasError = imageErrors.has(scene.id)

            return (
              <button
                key={scene.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onSelect(scene)}
                className={`
                  flex-shrink-0 snap-start flex flex-col items-center gap-1.5
                  transition-all duration-fast group
                  ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-90'}
                `}
              >
                {/* Thumbnail */}
                <div
                  className={`
                    relative w-[100px] h-[56px] sm:w-[120px] sm:h-[68px] rounded overflow-hidden
                    transition-all duration-fast
                    ${isActive
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-black/50 scale-105'
                      : 'group-hover:ring-1 group-hover:ring-white/50'
                    }
                  `}
                >
                  {hasError || scene.isCustom ? (
                    <div
                      className="absolute inset-0"
                      style={{ background: scene.gradient }}
                    />
                  ) : (
                    <Image
                      src={scene.thumbnail}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="120px"
                      onError={() => handleImageError(scene.id)}
                    />
                  )}

                  {/* Custom badge */}
                  {scene.isCustom && (
                    <div className="absolute top-0.5 right-0.5 bg-gold/90 text-white text-[8px] px-1 py-0.5 rounded-sm font-medium uppercase tracking-wider">
                      AI
                    </div>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-[10px] sm:text-caption font-medium uppercase tracking-wider whitespace-nowrap
                    transition-colors duration-fast
                    ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white/90'}
                  `}
                >
                  {scene.isCustom
                    ? t('detail.rooms.customRoomLabel')
                    : t(`detail.rooms.${scene.name}`)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
