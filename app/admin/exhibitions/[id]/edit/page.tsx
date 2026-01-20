'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { ExhibitionForm } from '@/components/admin/ExhibitionForm'

interface Exhibition {
  id: string
  title: string
  venue: string | null
  street_address: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  image_url: string | null
  exhibition_type: 'past' | 'current' | 'upcoming' | null
  location_lat: number | null
  location_lng: number | null
  venue_url: string | null
  status: 'draft' | 'published' | 'archived'
  meta_title: string | null
  meta_description: string | null
}

export default function EditExhibitionPage() {
  const params = useParams()
  const router = useRouter()
  const [exhibition, setExhibition] = useState<Exhibition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchExhibition = async () => {
      try {
        const response = await fetch(`/api/admin/exhibitions/${params.id}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || 'Exhibition not found')
          return
        }

        setExhibition(data.data)
      } catch (err) {
        setError('Failed to load exhibition')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchExhibition()
    }
  }, [params.id])

  if (loading) {
    return (
      <>
        <PageHeader
          title="Edit Exhibition"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Exhibitions', href: '/admin/exhibitions' },
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

  if (error || !exhibition) {
    return (
      <>
        <PageHeader
          title="Edit Exhibition"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Exhibitions', href: '/admin/exhibitions' },
            { label: 'Error' },
          ]}
        />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Exhibition not found'}</p>
            <button
              onClick={() => router.push('/admin/exhibitions')}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Exhibitions
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Edit: ${exhibition.title}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Exhibitions', href: '/admin/exhibitions' },
          { label: exhibition.title },
        ]}
      />
      <div className="p-8">
        <ExhibitionForm exhibition={exhibition} isEdit />
      </div>
    </>
  )
}
