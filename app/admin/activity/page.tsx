'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface ActivityLog {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_title: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  created_at: string
}

const ACTIONS = [
  { id: '', label: 'All Actions' },
  { id: 'create', label: 'Create' },
  { id: 'update', label: 'Update' },
  { id: 'delete', label: 'Delete' },
  { id: 'status_change', label: 'Status Change' },
  { id: 'reorder', label: 'Reorder' },
]

const ENTITY_TYPES = [
  { id: '', label: 'All Types' },
  { id: 'artwork', label: 'Artwork' },
  { id: 'exhibition', label: 'Exhibition' },
  { id: 'press', label: 'Press' },
  { id: 'inquiry', label: 'Inquiry' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
]

export default function AdminActivityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '')
  const [entityTypeFilter, setEntityTypeFilter] = useState(searchParams.get('entity_type') || '')
  const [userFilter, setUserFilter] = useState(searchParams.get('user') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Unique users for filter dropdown
  const [users, setUsers] = useState<string[]>([])

  // Expanded changes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (actionFilter) params.set('action', actionFilter)
      if (entityTypeFilter) params.set('entity_type', entityTypeFilter)
      if (userFilter) params.set('user', userFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/activity?${params}`)
      const data = await response.json()

      if (data.success) {
        setActivities(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, actionFilter, entityTypeFilter, userFilter, search])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/activity/users')
      const data = await response.json()
      if (data.success) {
        setUsers(data.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (actionFilter) params.set('action', actionFilter)
    if (entityTypeFilter) params.set('entity_type', entityTypeFilter)
    if (userFilter) params.set('user', userFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/activity'
    router.replace(newUrl, { scroll: false })
  }, [page, actionFilter, entityTypeFilter, userFilter, search, router])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [actionFilter, entityTypeFilter, userFilter, search])

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEntityLink = (activity: ActivityLog): string | null => {
    if (!activity.entity_id) return null

    const linkMap: Record<string, string> = {
      artwork: `/admin/artworks/${activity.entity_id}/edit`,
      exhibition: `/admin/exhibitions/${activity.entity_id}/edit`,
      press: `/admin/press/${activity.entity_id}/edit`,
      inquiry: `/admin/inquiries/${activity.entity_id}`,
    }

    return linkMap[activity.entity_type] || null
  }

  const formatActionLabel = (action: string) => {
    return action.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatEntityType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const formatChangeValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <>
      <PageHeader
        title="Activity Log"
        description={`View admin action history (${total} entries)`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Activity' },
        ]}
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            {ACTIONS.map((action) => (
              <option key={action.id} value={action.id}>
                {action.label}
              </option>
            ))}
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-black"
          />

          {(actionFilter || entityTypeFilter || userFilter || search) && (
            <button
              onClick={() => {
                setActionFilter('')
                setEntityTypeFilter('')
                setUserFilter('')
                setSearch('')
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        )}

        {/* Activity List */}
        {!loading && activities.length > 0 && (
          <div className="space-y-3">
            {activities.map((activity) => {
              const entityLink = getEntityLink(activity)
              const hasChanges = activity.changes && Object.keys(activity.changes).length > 0
              const isExpanded = expandedIds.has(activity.id)

              return (
                <div
                  key={activity.id}
                  className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                >
                  <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Timestamp */}
                        <p className="text-xs text-gray-500 mb-1">
                          {formatDate(activity.created_at)}
                        </p>

                        {/* Action description */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-600">{activity.user_email}</span>
                          <StatusBadge status={activity.action} />
                          <span className="text-sm text-gray-600">
                            {formatEntityType(activity.entity_type)}
                          </span>
                          {activity.entity_title && (
                            <>
                              {entityLink ? (
                                <Link
                                  href={entityLink}
                                  className="text-sm font-medium text-black hover:underline truncate max-w-xs"
                                >
                                  "{activity.entity_title}"
                                </Link>
                              ) : (
                                <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                  "{activity.entity_title}"
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expand button for changes */}
                      {hasChanges && (
                        <button
                          onClick={() => toggleExpanded(activity.id)}
                          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <ChevronIcon expanded={isExpanded} />
                          {isExpanded ? 'Hide' : 'Show'} Changes
                        </button>
                      )}
                    </div>

                    {/* Changes section */}
                    {hasChanges && isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Changes:</p>
                        <div className="space-y-2">
                          {Object.entries(activity.changes!).map(([field, change]) => (
                            <div key={field} className="text-sm">
                              <span className="font-medium text-gray-700">{field}:</span>{' '}
                              <span className="text-red-600 line-through">
                                {formatChangeValue(change.old)}
                              </span>{' '}
                              <span className="text-gray-400">→</span>{' '}
                              <span className="text-green-600">
                                {formatChangeValue(change.new)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && activities.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <ActivityIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No activity found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {actionFilter || entityTypeFilter || userFilter || search
                ? 'No activities match your filters.'
                : 'No admin activity has been recorded yet.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}
