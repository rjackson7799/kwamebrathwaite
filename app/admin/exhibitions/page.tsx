'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column, ThumbnailCell, ActionButtons } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface Exhibition {
  id: string
  title: string
  venue: string | null
  city: string | null
  country: string | null
  start_date: string | null
  end_date: string | null
  exhibition_type: string | null
  status: string
  image_url: string | null
  created_at: string
  [key: string]: unknown
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return '—'

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }

  const start = startDate ? new Date(startDate).toLocaleDateString('en-US', options) : ''
  const end = endDate ? new Date(endDate).toLocaleDateString('en-US', options) : ''

  if (start && end) {
    return `${start} – ${end}`
  }
  return start || end
}

export default function AdminExhibitionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Exhibition | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchExhibitions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/exhibitions?${params}`)
      const data = await response.json()

      if (data.success) {
        setExhibitions(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch exhibitions:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, typeFilter, search])

  useEffect(() => {
    fetchExhibitions()
  }, [fetchExhibitions])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/exhibitions'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, typeFilter, search, router])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/exhibitions/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchExhibitions()
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error('Failed to delete exhibition:', error)
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Exhibition>[] = [
    {
      key: 'image_url',
      label: '',
      className: 'w-16',
      render: (row) => (
        <ThumbnailCell
          src={row.image_url}
          alt={row.title}
        />
      ),
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          {row.venue && <p className="text-xs text-gray-500">{row.venue}</p>}
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {[row.city, row.country].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Dates',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDateRange(row.start_date, row.end_date)}
        </span>
      ),
    },
    {
      key: 'exhibition_type',
      label: 'Type',
      render: (row) => (
        row.exhibition_type ? (
          <StatusBadge status={row.exhibition_type} />
        ) : (
          <span className="text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-20',
      render: (row) => (
        <ActionButtons
          onEdit={() => router.push(`/admin/exhibitions/${row.id}/edit`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Exhibitions"
        description="Manage exhibitions and shows"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Exhibitions' },
        ]}
        actions={
          <Link
            href="/admin/exhibitions/new"
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            Add Exhibition
          </Link>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by title or venue..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Types</option>
            <option value="upcoming">Upcoming</option>
            <option value="current">Current</option>
            <option value="past">Past</option>
          </select>

          {(search || statusFilter || typeFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setTypeFilter('')
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
          data={exhibitions}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No exhibitions found"
          onRowClick={(row) => router.push(`/admin/exhibitions/${row.id}/edit`)}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Exhibition"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
