'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PressItem {
  id: string
  title: string
  publication?: string | null
  publish_date?: string | null
}

interface PressPickerProps {
  value: string[]
  onChange: (ids: string[]) => void
  max?: number
  disabled?: boolean
}

export function PressPicker({
  value = [],
  onChange,
  max = 10,
  disabled = false,
}: PressPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pressItems, setPressItems] = useState<PressItem[]>([])
  const [selectedItems, setSelectedItems] = useState<PressItem[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch selected press items on mount
  useEffect(() => {
    const fetchSelected = async () => {
      if (value.length === 0) {
        setSelectedItems([])
        return
      }

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('press')
        .select('id, title, publication, publish_date')
        .in('id', value)

      if (data) {
        // Maintain order from value array
        const ordered = value
          .map((id: string) => (data as PressItem[]).find((a) => a.id === id))
          .filter((a: PressItem | undefined): a is PressItem => a !== undefined)
        setSelectedItems(ordered)
      }
    }

    fetchSelected()
  }, [value])

  // Search press items
  const searchPress = useCallback(async (query: string) => {
    setLoading(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryBuilder = (supabase as any)
      .from('press')
      .select('id, title, publication, publish_date')
      .eq('status', 'published')
      .order('title')
      .limit(20)

    if (query) {
      queryBuilder = queryBuilder.ilike('title', `%${query}%`)
    }

    const { data } = await queryBuilder
    setPressItems((data as PressItem[]) || [])
    setLoading(false)
  }, [])

  // Initial load when opening
  useEffect(() => {
    if (open) {
      searchPress(search)
    }
  }, [open, search, searchPress])

  const handleSelect = (item: PressItem) => {
    if (value.includes(item.id)) {
      // Remove
      onChange(value.filter((id) => id !== item.id))
    } else if (value.length < max) {
      // Add
      onChange([...value, item.id])
    }
  }

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className="space-y-3">
      {/* Selected press items */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md"
            >
              <div className="min-w-0">
                <span className="text-sm text-gray-700 max-w-[180px] truncate block">
                  {item.title}
                </span>
                {item.publication && (
                  <span className="text-xs text-gray-500 max-w-[180px] truncate block">
                    {item.publication}
                  </span>
                )}
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
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
          Add press article ({value.length}/{max})
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
                  <h3 className="text-lg font-medium">Select Press Articles</h3>
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
                  placeholder="Search press articles..."
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
                ) : pressItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No press articles found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pressItems.map((item) => {
                      const isSelected = value.includes(item.id)
                      const isDisabled = !isSelected && value.length >= max

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => !isDisabled && handleSelect(item)}
                          disabled={isDisabled}
                          className={`
                            relative w-full px-3 py-2 rounded-lg border-2 text-left transition-colors
                            ${isSelected
                              ? 'border-black bg-gray-50'
                              : isDisabled
                                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 hover:border-gray-400'
                            }
                          `}
                        >
                          <p className="text-sm font-medium text-gray-900 truncate pr-6">
                            {item.title}
                          </p>
                          {item.publication && (
                            <p className="text-xs text-gray-500">{item.publication}</p>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-black rounded-full flex items-center justify-center">
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
