'use client'

import { useTranslations } from 'next-intl'
import type { GeoFilter } from './types'

interface GeographicFiltersProps {
  geoFilter: GeoFilter
  onGeoFilterChange: (filter: GeoFilter) => void
  isLoadingLocation?: boolean
}

export function GeographicFilters({
  geoFilter,
  onGeoFilterChange,
  isLoadingLocation = false,
}: GeographicFiltersProps) {
  const t = useTranslations('exhibitions.map')

  const filters: { value: GeoFilter; labelKey: string; icon: string }[] = [
    { value: 'global', labelKey: 'global', icon: '🌍' },
    { value: 'us', labelKey: 'unitedStates', icon: '🇺🇸' },
    { value: 'near_me', labelKey: 'nearMe', icon: '📍' },
  ]

  return (
    <div
      className="flex gap-2 flex-wrap"
      role="radiogroup"
      aria-label={t('regionFilter')}
    >
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onGeoFilterChange(filter.value)}
          disabled={filter.value === 'near_me' && isLoadingLocation}
          className={`
            px-4 py-2 flex items-center gap-2 transition-all duration-200
            text-xs font-medium uppercase tracking-[0.1em]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              geoFilter === filter.value
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          role="radio"
          aria-checked={geoFilter === filter.value}
        >
          <span aria-hidden="true">{filter.icon}</span>
          <span className="hidden sm:inline">{t(filter.labelKey)}</span>
          {filter.value === 'near_me' && isLoadingLocation && (
            <LoadingSpinner />
          )}
        </button>
      ))}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-3 w-3"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
