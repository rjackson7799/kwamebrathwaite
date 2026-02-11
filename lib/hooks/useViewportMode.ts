'use client'

import { useState, useEffect, useCallback } from 'react'

export type ViewportMode = 'desktop' | 'mobile-portrait' | 'mobile-landscape'

export interface ViewportInfo {
  mode: ViewportMode
  /** Effective room container height in CSS pixels */
  roomHeightPx: number
  /** Whether controls (slider + thumbnails) render outside the room container */
  externalControls: boolean
  /** CSS aspect-ratio value for the room container */
  aspectRatio: string
}

const DESKTOP_DEFAULTS: ViewportInfo = {
  mode: 'desktop',
  roomHeightPx: 540,
  externalControls: false,
  aspectRatio: '16/9',
}

/**
 * Detects viewport mode and computes dynamic room dimensions
 * for the View on Wall feature.
 */
export function useViewportMode(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(DESKTOP_DEFAULTS)

  const calculate = useCallback((): ViewportInfo => {
    const w = window.innerWidth
    const h = window.innerHeight
    const isPortrait = h > w
    const isMobile = w < 768

    if (isMobile && isPortrait) {
      // Mobile portrait: 4:3 aspect ratio gives a taller room scene
      const roomWidth = w - 16 // mx-2 (8px each side)
      const roomHeight = roomWidth * (3 / 4)
      return {
        mode: 'mobile-portrait',
        roomHeightPx: Math.round(roomHeight),
        externalControls: true,
        aspectRatio: '4/3',
      }
    } else if (isMobile && !isPortrait) {
      // Mobile landscape: keep 16:9 but controls external
      const maxHeight = h - 100 // Reserve for header + controls row
      const roomWidth = Math.min(w - 16, maxHeight * (16 / 9))
      const roomHeight = roomWidth * (9 / 16)
      return {
        mode: 'mobile-landscape',
        roomHeightPx: Math.round(roomHeight),
        externalControls: true,
        aspectRatio: '16/9',
      }
    } else {
      // Desktop / tablet: current behavior
      const roomWidth = Math.min(w - 32, 1152) // max-w-6xl = 1152px
      const roomHeight = roomWidth * (9 / 16)
      return {
        mode: 'desktop',
        roomHeightPx: Math.round(Math.min(roomHeight, 540)),
        externalControls: false,
        aspectRatio: '16/9',
      }
    }
  }, [])

  useEffect(() => {
    setInfo(calculate())

    let rafId: number
    const handleResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => setInfo(calculate()))
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [calculate])

  return info
}
