'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column, ActionButtons } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface Inquiry {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  inquiry_type: string | null
  artwork_id: string | null
  status: string
  locale: string
  admin_notes: string | null
  responded_at: string | null
  responded_by: string | null
  created_at: string
  artwork?: {
    id: string
    title: string
    image_thumbnail_url: string | null
  } | null
  [key: string]: unknown
}

export default function AdminInquiriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/inquiries?${params}`)
      const data = await response.json()

      if (data.success) {
        setInquiries(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch inquiries:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, typeFilter, search])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/inquiries'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, typeFilter, search, router])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/inquiries/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchInquiries()
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error('Failed to delete inquiry:', error)
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string | null, length: number = 50) => {
    if (!text) return '—'
    return text.length > length ? `${text.substring(0, length)}...` : text
  }

  const columns: Column<Inquiry>[] = [
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
      key: 'subject',
      label: 'Subject',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {truncateText(row.subject)}
        </span>
      ),
    },
    {
      key: 'inquiry_type',
      label: 'Type',
      render: (row) => (
        row.inquiry_type ? (
          <StatusBadge status={row.inquiry_type} />
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
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'artwork',
      label: 'Artwork',
      render: (row) => (
        row.artwork ? (
          <span className="text-xs text-blue-600 truncate max-w-[120px] inline-block" title={row.artwork.title}>
            {truncateText(row.artwork.title, 20)}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-20',
      render: (row) => (
        <ActionButtons
          onEdit={() => router.push(`/admin/inquiries/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
          editLabel="View"
        />
      ),
    },
  ]

  // Count new inquiries for badge
  const newCount = inquiries.filter(i => i.status === 'new').length

  return (
    <>
      <PageHeader
        title="Inquiries"
        description={`Manage contact form submissions${newCount > 0 ? ` (${newCount} new)` : ''}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Inquiries' },
        ]}
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or subject..."
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
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="responded">Responded</option>
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
            <option value="general">General</option>
            <option value="purchase">Purchase</option>
            <option value="exhibition">Exhibition</option>
            <option value="press">Press</option>
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
          data={inquiries}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No inquiries found"
          onRowClick={(row) => router.push(`/admin/inquiries/${row.id}`)}
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
        title="Delete Inquiry"
        description={`Are you sure you want to delete the inquiry from "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
