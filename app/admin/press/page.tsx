'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column, ThumbnailCell, ActionButtons } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface PressItem {
  id: string
  title: string
  publication: string | null
  author: string | null
  publish_date: string | null
  url: string | null
  excerpt: string | null
  image_url: string | null
  press_type: string | null
  is_featured: boolean
  status: string
  created_at: string
  [key: string]: unknown
}

export default function AdminPressPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [pressItems, setPressItems] = useState<PressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<PressItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPressItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/press?${params}`)
      const data = await response.json()

      if (data.success) {
        setPressItems(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch press items:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, typeFilter, search])

  useEffect(() => {
    fetchPressItems()
  }, [fetchPressItems])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/press'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, typeFilter, search, router])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/press/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchPressItems()
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error('Failed to delete press item:', error)
    } finally {
      setDeleting(false)
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

  const columns: Column<PressItem>[] = [
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
      label: 'Title / Publication',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.title}</p>
          {row.publication && <p className="text-xs text-gray-500">{row.publication}</p>}
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.author || '—'}
        </span>
      ),
    },
    {
      key: 'press_type',
      label: 'Type',
      render: (row) => (
        row.press_type ? (
          <StatusBadge status={row.press_type} />
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
      key: 'publish_date',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.publish_date)}
        </span>
      ),
    },
    {
      key: 'is_featured',
      label: 'Featured',
      render: (row) => (
        row.is_featured ? (
          <span className="text-amber-600">★</span>
        ) : (
          <span className="text-gray-300">☆</span>
        )
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-20',
      render: (row) => (
        <ActionButtons
          onEdit={() => router.push(`/admin/press/${row.id}/edit`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Press"
        description="Manage press coverage and articles"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Press' },
        ]}
        actions={
          <Link
            href="/admin/press/new"
            className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            Add Press
          </Link>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by title, publication, or author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-black"
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
            <option value="article">Article</option>
            <option value="review">Review</option>
            <option value="interview">Interview</option>
            <option value="feature">Feature</option>
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
          data={pressItems}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No press items found"
          onRowClick={(row) => router.push(`/admin/press/${row.id}/edit`)}
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
        title="Delete Press Item"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
