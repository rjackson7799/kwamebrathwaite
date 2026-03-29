'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface MediaFile {
  id: string
  name: string
  bucket: string
  size: number
  created_at: string
  url: string
}

interface MediaBrowserModalProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
  bucket?: string
}

const BUCKETS = [
  { id: 'all', label: 'All' },
  { id: 'artworks', label: 'Artworks' },
  { id: 'thumbnails', label: 'Thumbnails' },
  { id: 'exhibitions', label: 'Exhibitions' },
  { id: 'press', label: 'Press' },
] as const

type BucketId = (typeof BUCKETS)[number]['id']

export function MediaBrowserModal({ open, onClose, onSelect, bucket }: MediaBrowserModalProps) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBucket, setActiveBucket] = useState<BucketId>(
    bucket && BUCKETS.some(b => b.id === bucket) ? bucket as BucketId : 'all'
  )
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const pageSize = 18

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (activeBucket !== 'all') params.set('bucket', activeBucket)
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/media?${params}`)
      const data = await response.json()

      if (data.success) {
        setFiles(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }, [page, activeBucket, search])

  useEffect(() => {
    if (open) {
      fetchFiles()
    }
  }, [open, fetchFiles])

  useEffect(() => {
    setPage(1)
  }, [activeBucket, search])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const totalPages = Math.ceil(total / pageSize)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Select from Media Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b shrink-0 flex items-center gap-4">
          <div className="flex gap-1">
            {BUCKETS.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBucket(b.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeBucket === b.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : files.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedUrl(file.url)}
                  className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedUrl === file.url
                      ? 'border-black ring-2 ring-black/20'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    <Image
                      src={file.url}
                      alt={file.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 150px"
                    />
                    {selectedUrl === file.url && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] text-gray-500 truncate">{file.name}</p>
                    <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No images found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between">
          {/* Pagination */}
          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedUrl) {
                  onSelect(selectedUrl)
                  onClose()
                }
              }}
              disabled={!selectedUrl}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
