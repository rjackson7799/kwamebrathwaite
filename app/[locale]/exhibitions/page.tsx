'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ExhibitionCard,
  ExhibitionsMapView,
  ViewToggle,
} from '@/components/features/exhibitions'
import type { Exhibition, ViewMode, FilterType } from '@/components/features/exhibitions'

type TabType = 'current' | 'upcoming' | 'past'

export default function ExhibitionsPage() {
  const t = useTranslations('exhibitions')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const viewParam = searchParams.get('view')
    return viewParam === 'map' ? 'map' : 'list'
  })

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const filterParam = searchParams.get('filter') as TabType | null
    return filterParam && ['current', 'upcoming', 'past'].includes(filterParam)
      ? filterParam
      : 'current'
  })

  // State for exhibitions data
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch exhibitions from API
  const fetchExhibitions = useCallback(async (type: TabType) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/exhibitions?type=${type}`)
      const data = await response.json()
      if (data.success) {
        setExhibitions(data.data || [])
      } else {
        console.error('Failed to fetch exhibitions:', data.error)
        setExhibitions([])
      }
    } catch (error) {
      console.error('Error fetching exhibitions:', error)
      setExhibitions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch exhibitions when tab changes
  useEffect(() => {
    fetchExhibitions(activeTab)
  }, [activeTab, fetchExhibitions])

  // Update URL when view or filter changes
  useEffect(() => {
    const params = new URLSearchParams()

    if (viewMode !== 'list') {
      params.set('view', viewMode)
    }
    if (activeTab !== 'current') {
      params.set('filter', activeTab)
    }

    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname

    router.replace(newUrl, { scroll: false })
  }, [viewMode, activeTab, router])

  const tabs: { key: TabType; label: string }[] = [
    { key: 'current', label: t('current') },
    { key: 'upcoming', label: t('upcoming') },
    { key: 'past', label: t('past') },
  ]

  return (
    <div className="container-page section-spacing">
      {/* Header with title and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-display-2">{t('title')}</h1>
        <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-light">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`pb-2 transition-colors duration-fast ${
              activeTab === key
                ? 'border-b-2 border-black font-medium text-black'
                : 'text-gray-warm hover:text-black'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content Area - List or Map View */}
      {viewMode === 'list' ? (
        // List View
        <div id="exhibitions-list" role="tabpanel" aria-labelledby="list-tab">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent" />
              <p className="mt-4 text-body text-gray-warm">Loading exhibitions...</p>
            </div>
          ) : exhibitions.length === 0 ? (
            <p className="text-body text-gray-warm py-8 text-center">
              No {activeTab} exhibitions at this time.
            </p>
          ) : (
            <div className="space-y-6">
              {exhibitions.map((exhibition, index) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                  orientation="horizontal"
                  priority={index < 2}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Map View
        <div id="exhibitions-map" role="tabpanel" aria-labelledby="map-tab">
          <ExhibitionsMapView filter={activeTab as FilterType} />
        </div>
      )}
    </div>
  )
}
