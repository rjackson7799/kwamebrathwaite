'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/PageHeader'
import { HeroSlideForm } from '@/components/admin/HeroSlideForm'

export default function NewHeroSlidePage() {
  const [nextOrder, setNextOrder] = useState(1)

  useEffect(() => {
    // Fetch current slides count to determine next display order
    const fetchNextOrder = async () => {
      try {
        const response = await fetch('/api/admin/hero')
        if (response.ok) {
          const result = await response.json()
          const count = result.data?.length || 0
          setNextOrder(count + 1)
        }
      } catch (error) {
        console.error('Failed to fetch slides count:', error)
      }
    }
    fetchNextOrder()
  }, [])

  return (
    <>
      <PageHeader
        title="Add Hero Slide"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Hero Slides', href: '/admin/hero' },
          { label: 'Add Slide' },
        ]}
      />

      <div className="p-8">
        <HeroSlideForm nextDisplayOrder={nextOrder} />
      </div>
    </>
  )
}
