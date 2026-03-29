'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { PressReorderList } from '@/components/admin/PressReorderList'

interface PressItem {
  id: string
  title: string
  publication: string | null
  publish_date: string | null
  press_type: string | null
  image_url: string | null
  status: string
  is_featured: boolean
  display_order: number | null
}

export default function ReorderPressPage() {
  const [pressItems, setPressItems] = useState<PressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPressItems = async () => {
      try {
        const response = await fetch('/api/admin/press?limit=500&sort=display_order&order=asc')
        const data = await response.json()

        if (!data.success) {
          setError(data.error?.message || 'Failed to fetch press items')
          return
        }

        setPressItems(data.data)
      } catch (err) {
        setError('Failed to load press items')
      } finally {
        setLoading(false)
      }
    }

    fetchPressItems()
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader
          title="Reorder Press"
          description="Drag and drop to change the display order"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Press', href: '/admin/press' },
            { label: 'Reorder' },
          ]}
          actions={
            <Link
              href="/admin/press"
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
          title="Reorder Press"
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Press', href: '/admin/press' },
            { label: 'Reorder' },
          ]}
        />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <Link
              href="/admin/press"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Back to Press
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Reorder Press"
        description="Drag and drop to change the display order. Featured press items appear first on the Press page."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Press', href: '/admin/press' },
          { label: 'Reorder' },
        ]}
        actions={
          <Link
            href="/admin/press"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to List
          </Link>
        }
      />
      <div className="p-8">
        <PressReorderList pressItems={pressItems} />
      </div>
    </>
  )
}
