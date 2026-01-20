'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { ArtworkForm } from '@/components/admin/ArtworkForm'

interface Artwork {
  id: string
  title: string
  year: number | null
  medium: string | null
  dimensions: string | null
  description: string | null
  image_url: string
  image_thumbnail_url: string | null
  category: 'photography' | 'print' | 'historical' | null
  series: string | null
  availability_status: 'available' | 'sold' | 'on_loan' | 'not_for_sale' | 'inquiry_only'
  is_featured: boolean
  related_artwork_ids: string[]
  status: 'draft' | 'published' | 'archived'
  meta_title: string | null
  meta_description: string | null
}

export default function EditArtworkPage() {
  const params = useParams()
  const router = useRouter()
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        const response = await fetch(`/api/admin/artworks/${params.id}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || 'Artwork not found')
          return
        }

        setArtwork(data.data)
      } catch (err) {
        setError('Failed to load artwork')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchArtwork()
    }
  }, [params.id])

  if (loading) {
    return (
      <>
        <PageHeader
          title="Edit Artwork"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Artworks', href: '/admin/artworks' },
            { label: 'Loading...' },
          ]}
        />
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (error || !artwork) {
    return (
      <>
        <PageHeader
          title="Edit Artwork"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Artworks', href: '/admin/artworks' },
            { label: 'Error' },
          ]}
        />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Artwork not found'}</p>
            <button
              onClick={() => router.push('/admin/artworks')}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Artworks
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Edit: ${artwork.title}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Artworks', href: '/admin/artworks' },
          { label: artwork.title },
        ]}
      />
      <div className="p-8">
        <ArtworkForm artwork={artwork} isEdit />
      </div>
    </>
  )
}
