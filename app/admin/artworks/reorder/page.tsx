'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { ArtworkReorderList } from '@/components/admin/ArtworkReorderList'

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

export default function ReorderArtworksPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        // Fetch all artworks sorted by display_order
        const response = await fetch('/api/admin/artworks?limit=500&sort=display_order&order=asc')
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || 'Failed to fetch artworks')
          return
        }

        setArtworks(data.data)
      } catch (err) {
        setError('Failed to load artworks')
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader
          title="Reorder Artworks"
          description="Drag and drop to change the display order"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Artworks', href: '/admin/artworks' },
            { label: 'Reorder' },
          ]}
          actions={
            <Link
              href="/admin/artworks"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to List
            </Link>
          }
        />
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Reorder Artworks"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Artworks', href: '/admin/artworks' },
            { label: 'Reorder' },
          ]}
        />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <Link
              href="/admin/artworks"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Artworks
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Reorder Artworks"
        description="Drag and drop to change the display order. Featured artworks appear first on the Works page and Home page."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Artworks', href: '/admin/artworks' },
          { label: 'Reorder' },
        ]}
        actions={
          <Link
            href="/admin/artworks"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to List
          </Link>
        }
      />
      <div className="p-8">
        <ArtworkReorderList artworks={artworks} />
      </div>
    </>
  )
}
