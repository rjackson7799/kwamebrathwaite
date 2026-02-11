'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column, ActionButtons } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface LicenseRequest {
  id: string
  request_number: string
  name: string
  email: string
  company: string | null
  status: string
  quoted_price: number | null
  created_at: string
  license_type?: { id: string; name: string } | null
  artworks?: Array<{ artwork: { id: string; title: string; image_thumbnail_url: string | null } | null }> | null
  [key: string]: unknown
}

export default function AdminLicensingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [requests, setRequests] = useState<LicenseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<LicenseRequest | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/licensing?${params}`)
      const data = await response.json()

      if (data.success) {
        setRequests(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch license requests:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, search])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/licensing'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, search, router])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/licensing/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchRequests()
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error('Failed to delete license request:', error)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '\u2014'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '\u2014'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  const columns: Column<LicenseRequest>[] = [
    {
      key: 'request_number',
      label: 'Request #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium">{row.request_number}</span>
      ),
    },
    {
      key: 'name',
      label: 'Contact',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
          {row.company && <p className="text-xs text-gray-400">{row.company}</p>}
        </div>
      ),
    },
    {
      key: 'license_type',
      label: 'Type',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.license_type?.name || '\u2014'}
        </span>
      ),
    },
    {
      key: 'artworks',
      label: 'Artworks',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.artworks?.length || 0} image{(row.artworks?.length || 0) !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'quoted_price',
      label: 'Quote',
      render: (row) => (
        <span className="text-sm font-medium">
          {formatPrice(row.quoted_price)}
        </span>
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
      key: 'actions',
      label: '',
      className: 'w-20',
      render: (row) => (
        <ActionButtons
          onEdit={() => router.push(`/admin/licensing/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
          editLabel="View"
        />
      ),
    },
  ]

  const newCount = requests.filter(r => r.status === 'new').length

  return (
    <>
      <PageHeader
        title="Licensing Requests"
        description={`Manage image licensing requests${newCount > 0 ? ` (${newCount} new)` : ''}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Licensing' },
        ]}
        actions={
          <button
            onClick={() => router.push('/admin/licensing/types')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Manage Types
          </button>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name, email, company, or request #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-96 focus:outline-none focus:ring-2 focus:ring-black"
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
            <option value="quoted">Quoted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>

          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
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
          data={requests}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No license requests found"
          onRowClick={(row) => router.push(`/admin/licensing/${row.id}`)}
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
        title="Delete License Request"
        description={`Are you sure you want to delete request "${deleteTarget?.request_number}" from "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
