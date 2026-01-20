'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface ExhibitionReminder {
  id: string
  name: string
  email: string
  reminder_type: string
  exhibition_id: string
  exhibition_title: string | null
  exhibition_venue: string | null
  exhibition_city: string | null
  exhibition_country: string | null
  exhibition_start_date: string | null
  exhibition_end_date: string | null
  source: string | null
  locale: string | null
  created_at: string
  [key: string]: unknown
}

export default function AdminExhibitionRemindersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [reminders, setReminders] = useState<ExhibitionReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [reminderTypeFilter, setReminderTypeFilter] = useState(
    searchParams.get('reminder_type') || ''
  )
  const [search, setSearch] = useState(searchParams.get('q') || '')

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (reminderTypeFilter) params.set('reminder_type', reminderTypeFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/exhibition-reminders?${params}`)
      const data = await response.json()

      if (data.success) {
        setReminders(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, reminderTypeFilter, search])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (reminderTypeFilter) params.set('reminder_type', reminderTypeFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString()
      ? `?${params}`
      : '/admin/exhibition-reminders'
    router.replace(newUrl, { scroll: false })
  }, [page, reminderTypeFilter, search, router])

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/admin/exhibition-reminders/export')

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
      link.download = filenameMatch
        ? filenameMatch[1]
        : `exhibition-reminders-${new Date().toISOString().split('T')[0]}.csv`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Failed to export reminders. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const columns: Column<ExhibitionReminder>[] = [
    {
      key: 'name',
      label: 'Contact',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'exhibition_title',
      label: 'Exhibition',
      render: (row) => (
        <div className="max-w-[200px]">
          <p className="font-medium text-gray-900 truncate" title={row.exhibition_title || ''}>
            {row.exhibition_title || '—'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {[row.exhibition_venue, row.exhibition_city]
              .filter(Boolean)
              .join(', ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'reminder_type',
      label: 'Type',
      render: (row) => {
        const labels: Record<string, string> = {
          opening: 'Opening',
          closing: 'Closing',
          both: 'Both',
        }
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {labels[row.reminder_type] || row.reminder_type}
          </span>
        )
      },
    },
    {
      key: 'exhibition_start_date',
      label: 'Exhibition Dates',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.exhibition_start_date)} — {formatDate(row.exhibition_end_date)}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (row) => (
        <StatusBadge status={row.source || 'unknown'} />
      ),
    },
    {
      key: 'created_at',
      label: 'Requested',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Exhibition Reminders"
        description={`${total} reminder request${total !== 1 ? 's' : ''} from visitors`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Exhibition Reminders' },
        ]}
        actions={
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? (
              <>
                <LoadingSpinner />
                Exporting...
              </>
            ) : (
              <>
                <DownloadIcon />
                Export CSV
              </>
            )}
          </button>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or exhibition..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={reminderTypeFilter}
            onChange={(e) => {
              setReminderTypeFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Reminder Types</option>
            <option value="opening">Opening</option>
            <option value="closing">Closing</option>
            <option value="both">Both</option>
          </select>

          {(search || reminderTypeFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setReminderTypeFilter('')
                setPage(1)
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <DataTable
          data={reminders}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No reminder requests yet"
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
        />
      </div>
    </>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
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

function DownloadIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
