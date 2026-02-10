'use client'

import { useTranslations } from 'next-intl'
import type { ViewMode } from './types'

interface ViewToggleProps {
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  const t = useTranslations('exhibitions')

  return (
    <div className="flex gap-2" role="tablist" aria-label="View mode">
      <button
        onClick={() => onViewChange('list')}
        className={`
          px-4 py-2 flex items-center gap-2 transition-all duration-200
          text-xs font-medium uppercase tracking-[0.1em]
          ${
            viewMode === 'list'
              ? 'bg-black text-white'
              : 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-700 dark:text-[#C0C0C0] hover:bg-gray-200 dark:hover:bg-[#333333]'
          }
        `}
        role="tab"
        aria-selected={viewMode === 'list'}
        aria-controls="exhibitions-list"
      >
        <ListIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{t('listView')}</span>
      </button>

      <button
        onClick={() => onViewChange('map')}
        className={`
          px-4 py-2 flex items-center gap-2 transition-all duration-200
          text-xs font-medium uppercase tracking-[0.1em]
          ${
            viewMode === 'map'
              ? 'bg-black text-white'
              : 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-700 dark:text-[#C0C0C0] hover:bg-gray-200 dark:hover:bg-[#333333]'
          }
        `}
        role="tab"
        aria-selected={viewMode === 'map'}
        aria-controls="exhibitions-map"
      >
        <MapIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{t('mapView')}</span>
      </button>
    </div>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6.75V15m0-8.25a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v8.25M9 6.75H5.25a.75.75 0 00-.75.75v9a.75.75 0 00.75.75H9m0-10.5v10.5m0 0h6m-6 0H5.25m13.5-10.5V15m0-8.25h3.75a.75.75 0 01.75.75v9a.75.75 0 01-.75.75H15m0-10.5v10.5"
      />
    </svg>
  )
}
