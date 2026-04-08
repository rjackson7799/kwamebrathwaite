'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ExhibitionCard,
  ExhibitionsMapView,
  ViewToggle,
} from '@/components/features/exhibitions'
import { ScrollFadeItem } from '@/components/ui/ScrollFadeItem'
import { SearchBar } from '@/components/ui/SearchBar'
import { useDebounce } from '@/lib/hooks'
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

  // Search
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')
  const debouncedQuery = useDebounce(searchQuery, 400)

  // Page title visibility
  const [showTitle, setShowTitle] = useState(true)

  useEffect(() => {
    fetch('/api/page-settings/exhibitions')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setShowTitle(data.data.show_title ?? true)
        }
      })
      .catch(() => {})
  }, [])

  // State for exhibitions data
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch exhibitions from API
  const fetchExhibitions = useCallback(async (type: TabType, q?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type })
      if (q) params.set('q', q)
      const response = await fetch(`/api/exhibitions?${params}`)
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

  // Fetch exhibitions when tab or search changes
  useEffect(() => {
    fetchExhibitions(activeTab, debouncedQuery || undefined)
  }, [activeTab, debouncedQuery, fetchExhibitions])

  // Update URL when view or filter changes
  useEffect(() => {
    const params = new URLSearchParams()

    if (viewMode !== 'list') {
      params.set('view', viewMode)
    }
    if (activeTab !== 'current') {
      params.set('filter', activeTab)
    }
    if (debouncedQuery) {
      params.set('q', debouncedQuery)
    }

    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname

    router.replace(newUrl, { scroll: false })
  }, [viewMode, activeTab, debouncedQuery, router])

  const tabs: { key: TabType; label: string }[] = [
    { key: 'current', label: t('current') },
    { key: 'upcoming', label: t('upcoming') },
    { key: 'past', label: t('past') },
  ]

  return (
    <div className="container-page section-spacing">
      {/* Header with title and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        {showTitle && <h1 className="page-title-museum">{t('title')}</h1>}
        <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('searchPlaceholder')}
          ariaLabel={t('searchPlaceholder')}
        />
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {exhibitions.map((exhibition, index) => (
                <ScrollFadeItem key={exhibition.id} index={index}>
                  <ExhibitionCard
                    exhibition={exhibition}
                    orientation="vertical"
                    priority={index < 4}
                  />
                </ScrollFadeItem>
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
