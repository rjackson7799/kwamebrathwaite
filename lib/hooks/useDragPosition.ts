'use client'

import { useState, useCallback, useRef } from 'react'

export interface DragConstraints {
  /** Min x as fraction (0-1) of container width */
  minX: number
  /** Max x as fraction (0-1) of container width */
  maxX: number
  /** Min y as fraction (0-1) of container height */
  minY: number
  /** Max y as fraction (0-1) of container height */
  maxY: number
}

export interface DragPosition {
  /** X position as percentage (0-100) from container left */
  x: number
  /** Y position as percentage (0-100) from container top */
  y: number
}

interface UseDragPositionOptions {
  initialPosition: DragPosition
  constraints: DragConstraints
  enabled?: boolean
}

interface UseDragPositionReturn {
  position: DragPosition
  isDragging: boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
  resetPosition: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Custom hook for drag-to-reposition using Pointer Events.
 * Tracks position as percentages for responsive layouts.
 */
export function useDragPosition({
  initialPosition,
  constraints,
  enabled = true,
}: UseDragPositionOptions): UseDragPositionReturn {
  const [position, setPosition] = useState<DragPosition>(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const clamp = useCallback(
    (x: number, y: number): DragPosition => ({
      x: Math.min(Math.max(x, constraints.minX * 100), constraints.maxX * 100),
      y: Math.min(Math.max(y, constraints.minY * 100), constraints.maxY * 100),
    }),
    [constraints]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return
      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const pointerXPct = ((e.clientX - rect.left) / rect.width) * 100
      const pointerYPct = ((e.clientY - rect.top) / rect.height) * 100

      dragOffset.current = {
        x: pointerXPct - position.x,
        y: pointerYPct - position.y,
      }

      setIsDragging(true)
    },
    [enabled, position]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const pointerXPct = ((e.clientX - rect.left) / rect.width) * 100
      const pointerYPct = ((e.clientY - rect.top) / rect.height) * 100

      const newX = pointerXPct - dragOffset.current.x
      const newY = pointerYPct - dragOffset.current.y

      setPosition(clamp(newX, newY))
    },
    [isDragging, clamp]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const target = e.currentTarget as HTMLElement
      target.releasePointerCapture(e.pointerId)
      setIsDragging(false)
    },
    [isDragging]
  )

  const resetPosition = useCallback(() => {
    setPosition(initialPosition)
  }, [initialPosition])

  return {
    position,
    isDragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
    resetPosition,
    containerRef,
  }
}
