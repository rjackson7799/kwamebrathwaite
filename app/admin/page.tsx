'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardStats {
  totalArtworks: number
  exhibitions: number
  pendingInquiries: number
  subscribers: number
}

interface ActivityItem {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string
  entity_title: string
  created_at: string
}

interface FounderInquiry {
  id: string
  name: string
  email: string
  founder_status: string
  created_at: string
}

const SLA_WARN_MS  = 24 * 60 * 60 * 1000
const SLA_ERROR_MS = 48 * 60 * 60 * 1000

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [pendingFounders, setPendingFounders] = useState<FounderInquiry[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [loadingFounders, setLoadingFounders] = useState(true)

  useEffect(() => {
    // Fetch dashboard stats
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    // Fetch recent activity
    async function fetchActivity() {
      try {
        const response = await fetch('/api/admin/activity?limit=5')
        const data = await response.json()
        if (data.success) {
          setActivity(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error)
      } finally {
        setLoadingActivity(false)
      }
    }

    // Fetch founder inquiries awaiting first response (the 24-48h SLA queue).
    // Pull anything still in 'new' or 'read', sorted oldest-first so the most
    // SLA-risky lands at the top of the card.
    async function fetchPendingFounders() {
      try {
        // The list endpoint filters by founder_status one at a time, so do two
        // fetches and merge. Cheap — typically these counts are small.
        const [a, b] = await Promise.all([
          fetch('/api/admin/inquiries?source=founder_inquiry&founder_status=new&limit=20&sort=created_at&order=asc'),
          fetch('/api/admin/inquiries?source=founder_inquiry&founder_status=read&limit=20&sort=created_at&order=asc'),
        ])
        const [aJson, bJson] = await Promise.all([a.json(), b.json()])
        const rows: FounderInquiry[] = [
          ...(aJson.success ? aJson.data : []),
          ...(bJson.success ? bJson.data : []),
        ]
        rows.sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
        setPendingFounders(rows)
      } catch (error) {
        console.error('Failed to fetch pending founder inquiries:', error)
      } finally {
        setLoadingFounders(false)
      }
    }

    fetchStats()
    fetchActivity()
    fetchPendingFounders()
  }, [])

  function ageLabel(createdAt: string) {
    const ms = Date.now() - new Date(createdAt).getTime()
    const hours = Math.floor(ms / 3600000)
    const days = Math.floor(ms / 86400000)
    if (hours < 48) return `${hours}h`
    return `${days}d`
  }

  function ageBucket(createdAt: string): 'fresh' | 'warn' | 'error' {
    const ms = Date.now() - new Date(createdAt).getTime()
    if (ms >= SLA_ERROR_MS) return 'error'
    if (ms >= SLA_WARN_MS) return 'warn'
    return 'fresh'
  }

  const statCards = [
    { label: 'Total Artworks', value: stats?.totalArtworks, color: 'bg-blue-50' },
    { label: 'Exhibitions', value: stats?.exhibitions, color: 'bg-green-50' },
    { label: 'Pending Inquiries', value: stats?.pendingInquiries, color: 'bg-yellow-50' },
    { label: 'Subscribers', value: stats?.subscribers, color: 'bg-purple-50' },
  ]

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      publish: 'Published',
      archive: 'Archived',
    }
    return actionMap[action] || action
  }

  return (
    <div className="px-8">
      <h1 className="text-2xl font-semibold mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-lg p-6`}>
            <div className="text-3xl font-semibold mb-1">
              {loadingStats ? (
                <span className="inline-block w-8 h-8 bg-gray-200 rounded animate-pulse" />
              ) : (
                stat.value ?? 0
              )}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Founder inquiries awaiting response (24-48h SLA queue) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-medium">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[#8a6f2b] block mb-1">
              Founder&rsquo;s Circle
            </span>
            Inquiries awaiting response
          </h2>
          <Link
            href="/admin/inquiries?source=founder_inquiry"
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            View all →
          </Link>
        </div>

        {loadingFounders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : pendingFounders.length === 0 ? (
          <div className="text-gray-500 text-sm py-6 text-center">
            No founder inquiries waiting. The SLA queue is clear.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingFounders.map((row) => {
              const bucket = ageBucket(row.created_at)
              const ageColor =
                bucket === 'error'
                  ? 'bg-red-100 text-red-800'
                  : bucket === 'warn'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-[#FAF6EC] text-[#8a6f2b] border border-[#C9A961]'
              return (
                <Link
                  key={row.id}
                  href={`/admin/inquiries/${row.id}`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {row.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {row.email}
                      {row.founder_status === 'read' && (
                        <span className="ml-2 text-gray-400">· read, no reply yet</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${ageColor}`}
                    title={
                      bucket === 'error'
                        ? 'Past 48-hour SLA'
                        : bucket === 'warn'
                        ? 'Past 24-hour SLA'
                        : 'Within SLA window'
                    }
                  >
                    {ageLabel(row.created_at)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        {loadingActivity ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-full h-5 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No recent activity to display.
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{formatAction(item.action)}</span>
                  {' '}
                  <span className="text-gray-600">{item.entity_type}</span>
                  {item.entity_title && (
                    <>
                      {': '}
                      <span className="text-gray-800">{item.entity_title}</span>
                    </>
                  )}
                </div>
                <div className="text-gray-400 text-xs">
                  {formatTimeAgo(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex gap-4">
        <a
          href="/admin/artworks/new"
          className="btn-primary"
        >
          Add Artwork
        </a>
        <a
          href="/admin/exhibitions/new"
          className="btn-secondary"
        >
          Add Exhibition
        </a>
        <a
          href="/admin/inquiries"
          className="btn-secondary"
        >
          View Inquiries
        </a>
      </div>
    </div>
  )
}
