'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Artwork {
  id: string
  title: string
  year?: number | null
  image_thumbnail_url?: string | null
  image_url?: string | null
}

interface ArtworkPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
  max?: number
  excludeId?: string
  disabled?: boolean
}

export function ArtworkPicker({
  value = [],
  onChange,
  max = 3,
  excludeId,
  disabled = false,
}: ArtworkPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [selectedArtworks, setSelectedArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch selected artworks on mount
  useEffect(() => {
    const fetchSelected = async () => {
      if (value.length === 0) {
        setSelectedArtworks([])
        return
      }

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('artworks')
        .select('id, title, year, image_thumbnail_url, image_url')
        .in('id', value)

      if (data) {
        // Maintain order from value array
        const ordered = value
          .map((id: string) => (data as Artwork[]).find((a) => a.id === id))
          .filter((a: Artwork | undefined): a is Artwork => a !== undefined)
        setSelectedArtworks(ordered)
      }
    }

    fetchSelected()
  }, [value])

  // Search artworks
  const searchArtworks = useCallback(async (query: string) => {
    setLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryBuilder = (supabase as any)
      .from('artworks')
      .select('id, title, year, image_thumbnail_url, image_url')
      .eq('status', 'published')
      .order('title')
      .limit(20)

    if (query) {
      queryBuilder = queryBuilder.ilike('title', `%${query}%`)
    }

    if (excludeId) {
      queryBuilder = queryBuilder.neq('id', excludeId)
    }

    const { data } = await queryBuilder
    setArtworks((data as Artwork[]) || [])
    setLoading(false)
  }, [excludeId])

  // Initial load when opening
  useEffect(() => {
    if (open) {
      searchArtworks(search)
    }
  }, [open, search, searchArtworks])

  const handleSelect = (artwork: Artwork) => {
    if (value.includes(artwork.id)) {
      // Remove
      onChange(value.filter((id) => id !== artwork.id))
    } else if (value.length < max) {
      // Add
      onChange([...value, artwork.id])
    }
  }

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-3">
      {/* Selected artworks */}
      {selectedArtworks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedArtworks.map((artwork) => (
            <div
              key={artwork.id}
              className="flex items-center gap-2 pl-1 pr-2 py-1 bg-gray-100 rounded-md"
            >
              <div className="w-8 h-8 relative rounded overflow-hidden bg-gray-200">
                {(artwork.image_thumbnail_url || artwork.image_url) && (
                  <Image
                    src={artwork.image_thumbnail_url || artwork.image_url!}
                    alt={artwork.title}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                )}
              </div>
              <span className="text-sm text-gray-700 max-w-[150px] truncate">
                {artwork.title}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(artwork.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!disabled && value.length < max && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add related artwork ({value.length}/{max})
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Select Artworks</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Search artworks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : artworks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No artworks found
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {artworks.map((artwork) => {
                      const isSelected = value.includes(artwork.id)
                      const isDisabled = !isSelected && value.length >= max

                      return (
                        <button
                          key={artwork.id}
                          type="button"
                          onClick={() => !isDisabled && handleSelect(artwork)}
                          disabled={isDisabled}
                          className={`
                            relative p-2 rounded-lg border-2 text-left transition-colors
                            ${isSelected
                              ? 'border-black bg-gray-50'
                              : isDisabled
                                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 hover:border-gray-400'
                            }
                          `}
                        >
                          <div className="aspect-[4/3] relative rounded overflow-hidden bg-gray-100 mb-2">
                            {(artwork.image_thumbnail_url || artwork.image_url) ? (
                              <Image
                                src={artwork.image_thumbnail_url || artwork.image_url!}
                                alt={artwork.title}
                                fill
                                className="object-cover"
                                sizes="200px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {artwork.title}
                          </p>
                          {artwork.year && (
                            <p className="text-xs text-gray-500">{artwork.year}</p>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                              <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Icons
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}
