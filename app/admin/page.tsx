'use client'

import { useState, useEffect } from 'react'

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

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

    fetchStats()
    fetchActivity()
  }, [])

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
