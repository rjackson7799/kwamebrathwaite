'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { PressForm } from '@/components/admin/PressForm'

interface PressItem {
  id: string
  title: string
  publication: string | null
  author: string | null
  publish_date: string | null
  url: string | null
  excerpt: string | null
  image_url: string | null
  press_type: 'article' | 'review' | 'interview' | 'feature' | null
  is_featured: boolean
  display_order: number | null
  status: 'draft' | 'published' | 'archived'
}

export default function EditPressPage() {
  const params = useParams()
  const router = useRouter()
  const [press, setPress] = useState<PressItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPress = async () => {
      try {
        const response = await fetch(`/api/admin/press/${params.id}`)
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || 'Press item not found')
          return
        }

        setPress(data.data)
      } catch (err) {
        setError('Failed to load press item')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPress()
    }
  }, [params.id])

  if (loading) {
    return (
      <>
        <PageHeader
          title="Edit Press"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Press', href: '/admin/press' },
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

  if (error || !press) {
    return (
      <>
        <PageHeader
          title="Edit Press"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Press', href: '/admin/press' },
            { label: 'Error' },
          ]}
        />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error || 'Press item not found'}</p>
            <button
              onClick={() => router.push('/admin/press')}
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Press
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Edit: ${press.title}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Press', href: '/admin/press' },
          { label: press.title },
        ]}
      />
      <div className="p-8">
        <PressForm press={press} isEdit />
      </div>
    </>
  )
}
