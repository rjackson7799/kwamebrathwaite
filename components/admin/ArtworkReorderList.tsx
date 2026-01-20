'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { StatusBadge } from './StatusBadge'

interface Artwork {
  id: string
  title: string
  year: number | null
  image_url: string | null
  image_thumbnail_url: string | null
  status: string
  is_featured: boolean
  display_order: number | null
}

interface ArtworkReorderListProps {
  artworks: Artwork[]
}

type FilterType = 'all' | 'featured'

export function ArtworkReorderList({ artworks: initialArtworks }: ArtworkReorderListProps) {
  const [artworks, setArtworks] = useState(initialArtworks)
  const [filteredArtworks, setFilteredArtworks] = useState(initialArtworks)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')

  // Apply filter
  useEffect(() => {
    if (filter === 'featured') {
      setFilteredArtworks(artworks.filter(a => a.is_featured))
    } else {
      setFilteredArtworks(artworks)
    }
  }, [artworks, filter])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    setSaveError(null)

    // Work with filtered list for reordering
    const items = Array.from(filteredArtworks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update display in filtered view
    setFilteredArtworks(items)

    // Update full artworks list to maintain order
    if (filter === 'all') {
      setArtworks(items)
    } else {
      // When filtering, update only the featured items' order in the full list
      const newArtworks = artworks.map(artwork => {
        const indexInFiltered = items.findIndex(item => item.id === artwork.id)
        if (indexInFiltered !== -1) {
          return { ...artwork, display_order: indexInFiltered + 1 }
        }
        return artwork
      })
      setArtworks(newArtworks)
    }

    // Save new order to backend
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/artworks/reorder', {
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
      console.error('Failed to reorder artworks:', error)
      setSaveError('Failed to save new order. Please try again.')
      // Revert on error
      setArtworks(initialArtworks)
      setFilteredArtworks(filter === 'featured' 
        ? initialArtworks.filter(a => a.is_featured) 
        : initialArtworks
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleFeatured = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/admin/artworks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !currentState })
      })

      if (!response.ok) {
        throw new Error('Failed to update artwork')
      }

      setArtworks(artworks.map(artwork =>
        artwork.id === id ? { ...artwork, is_featured: !currentState } : artwork
      ))
    } catch (error) {
      console.error('Failed to toggle featured state:', error)
    }
  }

  if (artworks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 mb-4">No artworks yet</p>
        <Link
          href="/admin/artworks/new"
          className="text-black underline hover:no-underline"
        >
          Create your first artwork
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex border rounded-md overflow-hidden">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All ({artworks.length})
          </button>
          <button
            onClick={() => setFilter('featured')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'featured'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Featured Only ({artworks.filter(a => a.is_featured).length})
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Drag items to reorder. Changes save automatically.
        </p>
      </div>

      {/* Status Messages */}
      {isSaving && (
        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-sm flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Saving new order...
        </div>
      )}

      {saveError && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm">
          {saveError}
        </div>
      )}

      {/* Empty State for Filtered */}
      {filteredArtworks.length === 0 && filter === 'featured' && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No featured artworks. Mark artworks as featured to see them here.</p>
        </div>
      )}

      {/* Draggable List */}
      {filteredArtworks.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="artworks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {filteredArtworks.map((artwork, index) => (
                  <Draggable key={artwork.id} draggableId={artwork.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${
                          snapshot.isDragging ? 'shadow-lg ring-2 ring-black' : ''
                        }`}
                      >
                        {/* Order Number */}
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>

                        {/* Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        >
                          <DragIcon className="w-6 h-6" />
                        </div>

                        {/* Image Preview */}
                        <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                          {(artwork.image_thumbnail_url || artwork.image_url) ? (
                            <Image
                              src={artwork.image_thumbnail_url || artwork.image_url!}
                              alt={artwork.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Artwork Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">{artwork.title}</span>
                            {artwork.year && (
                              <span className="text-sm text-gray-500">({artwork.year})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={artwork.status} />
                          </div>
                        </div>

                        {/* Featured Toggle */}
                        <button
                          onClick={() => handleToggleFeatured(artwork.id, artwork.is_featured)}
                          className={`p-2 rounded-md transition-colors ${
                            artwork.is_featured
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'
                          }`}
                          title={artwork.is_featured ? 'Click to unfeature' : 'Click to feature'}
                        >
                          {artwork.is_featured ? (
                            <StarFilledIcon className="w-6 h-6" />
                          ) : (
                            <StarOutlineIcon className="w-6 h-6" />
                          )}
                        </button>

                        {/* Edit Link */}
                        <Link
                          href={`/admin/artworks/${artwork.id}/edit`}
                          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
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

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function StarOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )
}
