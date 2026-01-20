'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, Column, ThumbnailCell, ActionButtons } from '@/components/admin/DataTable'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

interface Artwork {
  id: string
  title: string
  year: number | null
  category: string | null
  series: string | null
  status: string
  availability_status: string
  is_featured: boolean
  image_url: string | null
  image_thumbnail_url: string | null
  created_at: string
  [key: string]: unknown
}

export default function AdminArtworksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [search, setSearch] = useState(searchParams.get('q') || '')

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Artwork | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchArtworks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (search) params.set('q', search)

      const response = await fetch(`/api/admin/artworks?${params}`)
      const data = await response.json()

      if (data.success) {
        setArtworks(data.data)
        setTotal(data.metadata?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch artworks:', error)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, categoryFilter, search])

  useEffect(() => {
    fetchArtworks()
  }, [fetchArtworks])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (statusFilter) params.set('status', statusFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (search) params.set('q', search)

    const newUrl = params.toString() ? `?${params}` : '/admin/artworks'
    router.replace(newUrl, { scroll: false })
  }, [page, statusFilter, categoryFilter, search, router])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/artworks/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchArtworks()
        setDeleteTarget(null)
      }
    } catch (error) {
      console.error('Failed to delete artwork:', error)
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Artwork>[] = [
    {
      key: 'image_thumbnail_url',
      label: '',
      className: 'w-16',
      render: (row) => (
        <ThumbnailCell
          src={row.image_thumbnail_url || row.image_url}
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
          {row.year && <p className="text-xs text-gray-500">{row.year}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span className="text-sm text-gray-600 capitalize">
          {row.category || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'availability_status',
      label: 'Availability',
      render: (row) => <StatusBadge status={row.availability_status} />,
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
          onEdit={() => router.push(`/admin/artworks/${row.id}/edit`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Artworks"
        description="Manage your artwork collection"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Artworks' },
        ]}
        actions={
          <div className="flex gap-3">
            <Link
              href="/admin/artworks/reorder"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Reorder
            </Link>
            <Link
              href="/admin/artworks/new"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
            >
              Add Artwork
            </Link>
          </div>
        }
      />

      <div className="p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by title..."
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
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">All Categories</option>
            <option value="photography">Photography</option>
            <option value="print">Print</option>
            <option value="historical">Historical</option>
          </select>

          {(search || statusFilter || categoryFilter) && (
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setCategoryFilter('')
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
          data={artworks}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No artworks found"
          onRowClick={(row) => router.push(`/admin/artworks/${row.id}/edit`)}
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
        title="Delete Artwork"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </>
  )
}
