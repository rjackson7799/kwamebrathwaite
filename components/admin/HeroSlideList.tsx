'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { ConfirmDialog } from './ConfirmDialog'
import { StatusBadge } from './StatusBadge'
import type { HeroSlide } from '@/lib/supabase/types'

interface HeroSlideListProps {
  slides: HeroSlide[]
}

export function HeroSlideList({ slides: initialSlides }: HeroSlideListProps) {
  const [slides, setSlides] = useState(initialSlides)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(slides)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSlides(items)

    // Save new order to backend
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/hero/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: items.map(item => item.id)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save order')
      }
    } catch (error) {
      console.error('Failed to reorder slides:', error)
      // Revert on error
      setSlides(initialSlides)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/admin/hero/${deleteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete slide')
      }

      setSlides(slides.filter(slide => slide.id !== deleteId))
    } catch (error) {
      console.error('Failed to delete slide:', error)
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/admin/hero/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState })
      })

      if (!response.ok) {
        throw new Error('Failed to update slide')
      }

      setSlides(slides.map(slide =>
        slide.id === id ? { ...slide, is_active: !currentState } : slide
      ))
    } catch (error) {
      console.error('Failed to toggle active state:', error)
    }
  }

  if (slides.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 mb-4">No hero slides yet</p>
        <Link
          href="/admin/hero/new"
          className="text-black underline hover:no-underline"
        >
          Create your first slide
        </Link>
      </div>
    )
  }

  return (
    <div>
      {isSaving && (
        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm">
          Saving new order...
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="hero-slides">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {slides.map((slide, index) => (
                <Draggable key={slide.id} draggableId={slide.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-black' : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                      >
                        <DragIcon className="w-6 h-6" />
                      </div>

                      {/* Image Preview */}
                      <div className="relative w-32 h-20 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={slide.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-b from-black/20 via-black to-black/20"
                          style={{ opacity: slide.overlay_opacity / 100 }}
                        />
                      </div>

                      {/* Slide Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">Slide {index + 1}</span>
                          <span className="text-sm text-gray-500">
                            ({slide.overlay_opacity}% overlay)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={slide.status} />
                          {!slide.is_active && (
                            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleActive(slide.id, slide.is_active)}
                        className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                          slide.is_active ? 'bg-black' : 'bg-gray-300'
                        }`}
                        title={slide.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full transition-transform ${
                            slide.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/admin/hero/${slide.id}/edit`}
                          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteId(slide.id)}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-200
                                   rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Hero Slide"
        description="Are you sure you want to delete this hero slide? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  )
}

function DragIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
