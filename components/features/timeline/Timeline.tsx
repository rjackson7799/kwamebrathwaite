'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { TimelineItem, type TimelineEvent } from './TimelineItem'

type FilterType = 'all' | 'biography' | 'milestone' | 'exhibition'

interface TimelineProps {
  /** Array of timeline events */
  events: TimelineEvent[]
  /** Loading state - shows skeleton placeholders */
  isLoading?: boolean
  /** Enable decade grouping */
  groupByDecade?: boolean
  /** Show filter controls */
  showFilters?: boolean
  /** Custom class names */
  className?: string
}

export function Timeline({
  events,
  isLoading = false,
  groupByDecade = false,
  showFilters = false,
  className = '',
}: TimelineProps) {
  const t = useTranslations('about.timeline')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events
    return events.filter((event) => event.type === activeFilter)
  }, [events, activeFilter])

  // Sort events by year (ascending)
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => a.year - b.year)
  }, [filteredEvents])

  // Group events by decade if enabled
  const groupedEvents = useMemo(() => {
    if (!groupByDecade) return null

    const groups: Record<string, TimelineEvent[]> = {}
    sortedEvents.forEach((event) => {
      const decade = `${Math.floor(event.year / 10) * 10}s`
      if (!groups[decade]) {
        groups[decade] = []
      }
      groups[decade].push(event)
    })

    return Object.entries(groups).sort(([a], [b]) => parseInt(a) - parseInt(b))
  }, [sortedEvents, groupByDecade])

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('filter.all') },
    { key: 'biography', label: t('filter.biography') },
    { key: 'milestone', label: t('filter.milestone') },
    { key: 'exhibition', label: t('filter.exhibition') },
  ]

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        {/* Timeline line skeleton */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-light dark:bg-[#333333]" />

        {/* Skeleton items */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative pl-8 md:pl-12 pb-8">
            <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-gray-light dark:bg-[#333333]" style={{ transform: 'translateX(-50%)' }} />
            <div className="card-bordered rounded-sm p-4 md:p-6">
              <div className="w-16 h-6 bg-gray-light dark:bg-[#2A2A2A] animate-pulse rounded-sm mb-3" />
              <div className="w-3/4 h-5 bg-gray-light dark:bg-[#2A2A2A] animate-pulse rounded mb-2" />
              <div className="w-full h-4 bg-gray-light dark:bg-[#2A2A2A] animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-warm">{t('noEvents')}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Filter controls */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Filter timeline events">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              role="tab"
              aria-selected={activeFilter === key}
              className={`
                px-4 py-2
                text-body-sm font-medium
                rounded-sm
                transition-all duration-normal
                ${
                  activeFilter === key
                    ? 'bg-charcoal text-white'
                    : 'bg-gray-light text-gray-warm hover:bg-gray-light/80 dark:bg-[#2A2A2A] dark:text-[#A0A0A0]'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Timeline container */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-gray-light dark:bg-[#333333]"
          aria-hidden="true"
        />

        {/* Events list */}
        {groupByDecade && groupedEvents ? (
          // Grouped by decade
          <div role="list" aria-label={t('events') || 'Timeline events'}>
            {groupedEvents.map(([decade, decadeEvents], groupIndex) => (
              <div key={decade} role="listitem">
                {/* Decade header */}
                <div className="relative pl-8 md:pl-12 pb-4">
                  <div
                    className="
                      absolute left-0 top-1
                      w-4 h-4
                      rounded-full
                      bg-gold dark:bg-[#C9A870] border-2 border-white dark:border-[#121212]
                      shadow-sm
                    "
                    style={{ transform: 'translateX(-50%)' }}
                    aria-hidden="true"
                  />
                  <h3 className="text-h3 font-medium text-black dark:text-[#F0F0F0]">
                    {decade}
                  </h3>
                </div>

                {/* Events in this decade */}
                {decadeEvents.map((event, eventIndex) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    index={groupIndex * 10 + eventIndex}
                    priority={groupIndex === 0 && eventIndex < 2}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Flat list
          <div role="list" aria-label={t('events') || 'Timeline events'}>
            {sortedEvents.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                index={index}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filtered results count */}
      {showFilters && activeFilter !== 'all' && (
        <p className="mt-4 text-caption text-gray-warm">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </p>
      )}
    </div>
  )
}
