'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ArtworkGrid } from '@/components/features/artworks'
import { SearchBar } from '@/components/ui'
import { useDebounce } from '@/lib/hooks'
import type { Artwork } from '@/components/features/artworks'

type FilterType = 'all' | 'photography' | 'print' | 'historical'

interface ApiResponse {
  success: boolean
  data: Artwork[]
  metadata?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function WorksContent() {
  const t = useTranslations('works')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Read state from URL
  const urlQuery = searchParams.get('q') || ''
  const urlCategory = (searchParams.get('category') as FilterType) || 'all'

  // Local state for search input (allows typing without immediate URL updates)
  const [searchInput, setSearchInput] = useState(urlQuery)
  const debouncedSearch = useDebounce(searchInput, 400)

  // API state
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Update URL params
  const updateFilters = useCallback(
    (updates: { q?: string | null; category?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      const queryString = params.toString()
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== urlQuery) {
      updateFilters({ q: debouncedSearch || null })
    }
  }, [debouncedSearch, urlQuery, updateFilters])

  // Sync URL query to input (for browser back/forward)
  useEffect(() => {
    if (urlQuery !== searchInput && urlQuery !== debouncedSearch) {
      setSearchInput(urlQuery)
    }
  }, [urlQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch artworks from API
  useEffect(() => {
    async function fetchArtworks() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (urlQuery) params.set('q', urlQuery)
        if (urlCategory && urlCategory !== 'all') params.set('category', urlCategory)

        const response = await fetch(`/api/artworks?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch artworks')
        }

        const data: ApiResponse = await response.json()

        if (data.success) {
          setArtworks(data.data || [])
          setTotal(data.metadata?.total || data.data?.length || 0)
        } else {
          throw new Error('API returned unsuccessful response')
        }
      } catch (err) {
        console.error('Error fetching artworks:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        setArtworks([])
        setTotal(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchArtworks()
  }, [urlQuery, urlCategory])

  // Navigate to artwork detail page
  const handleArtworkClick = (artwork: Artwork) => {
    const detailPath = locale === 'en' ? `/works/${artwork.id}` : `/${locale}/works/${artwork.id}`
    router.push(detailPath)
  }

  const handleCategoryChange = (category: FilterType) => {
    updateFilters({ category: category === 'all' ? null : category })
  }

  const handleSearchClear = () => {
    setSearchInput('')
    updateFilters({ q: null })
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('filter.all') },
    { key: 'photography', label: t('filter.photography') },
    { key: 'print', label: t('filter.print') },
    { key: 'historical', label: t('filter.historical') },
  ]

  const hasActiveFilters = urlQuery || urlCategory !== 'all'

  return (
    <div className="container-page section-spacing">
      <h1 className="text-display-2 mb-8">{t('title')}</h1>

      {/* Search and Filter Section */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Search Bar */}
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onClear={handleSearchClear}
          placeholder={t('search.placeholder')}
          ariaLabel={t('search.placeholder')}
        />

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleCategoryChange(key)}
              className={`filter-pill ${urlCategory === key ? 'filter-pill-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && !error && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-body-sm text-gray-warm">
            {t('search.resultsCount', { count: total })}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchInput('')
                updateFilters({ q: null, category: null })
              }}
              className="text-body-sm text-gray-warm hover:text-black underline transition-colors"
            >
              {t('search.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <ArtworkGrid artworks={[]} isLoading showMetadata showAvailability />
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-body text-error mb-4">{tCommon('error')}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && artworks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-body text-gray-warm mb-4">
            {urlQuery
              ? t('search.noResults', { query: urlQuery })
              : 'No works found'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchInput('')
                updateFilters({ q: null, category: null })
              }}
              className="btn-text"
            >
              {t('search.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Gallery Grid */}
      {!isLoading && !error && artworks.length > 0 && (
        <ArtworkGrid
          artworks={artworks}
          showMetadata
          showAvailability
          onArtworkClick={handleArtworkClick}
        />
      )}
    </div>
  )
}

// Loading skeleton for Suspense fallback
function WorksPageSkeleton() {
  return (
    <div className="container-page section-spacing">
      {/* Title skeleton */}
      <div className="h-12 w-32 bg-gray-light rounded animate-pulse mb-8" />

      {/* Search bar skeleton */}
      <div className="h-12 w-full md:max-w-[400px] bg-gray-light rounded-full animate-pulse mb-4" />

      {/* Filter pills skeleton */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 w-24 bg-gray-light rounded-full animate-pulse"
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[4/5] bg-gray-light rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function WorksPage() {
  return (
    <Suspense fallback={<WorksPageSkeleton />}>
      <WorksContent />
    </Suspense>
  )
}
